import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { UnauthorizedError, requireProfile } from "@/lib/server/dal";
import { TRAKT_AUTHORIZE_URL, TRAKT_STATE_COOKIE, trakt } from "@/lib/trakt/config";

/**
 * GET /api/trakt/connect?profileId=… → sends the browser to Trakt to approve the link.
 * A random `state` (with the profile id) is kept in an httpOnly cookie and checked on the way back,
 * so another site can't link its own Trakt account to this profile.
 */
export async function GET(request: NextRequest) {
  const back = (outcome: string) => NextResponse.redirect(new URL(`/account?trakt=${outcome}`, request.url));
  if (!trakt.enabled) return back("unavailable");

  let profileId: string;
  try {
    ({ profileId } = await requireProfile(request.nextUrl.searchParams.get("profileId")));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.redirect(new URL("/login?next=%2Faccount", request.url));
    throw error;
  }

  const state = randomBytes(16).toString("hex");
  const url = new URL(TRAKT_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", trakt.clientId);
  url.searchParams.set("redirect_uri", trakt.redirectUri);
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set(TRAKT_STATE_COOKIE, `${state}.${profileId}`, {
    httpOnly: true,
    sameSite: "lax", // sent on Trakt's top-level redirect back to us
    secure: process.env.NODE_ENV === "production",
    path: "/api/trakt",
    maxAge: 600,
  });
  return response;
}
