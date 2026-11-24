import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { UnauthorizedError, requireProfile } from "@/lib/server/dal";
import { saveTraktConnection } from "@/lib/server/trakt";
import { exchangeCode } from "@/lib/trakt/client";
import { TRAKT_STATE_COOKIE, trakt } from "@/lib/trakt/config";

const sameText = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** GET /api/trakt/callback?code=…&state=… — Trakt sends the browser back here after approval. */
export async function GET(request: NextRequest) {
  const done = (outcome: string) => {
    const response = NextResponse.redirect(new URL(`/account?trakt=${outcome}`, request.url));
    response.cookies.delete({ name: TRAKT_STATE_COOKIE, path: "/api/trakt" });
    return response;
  };
  if (!trakt.enabled) return done("unavailable");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return done("cancelled"); // the user pressed "Deny"
  const code = params.get("code");
  const state = params.get("state") ?? "";
  const [savedState, profileId] = (request.cookies.get(TRAKT_STATE_COOKIE)?.value ?? "").split(".");
  if (!code || !savedState || !profileId || !sameText(state, savedState)) return done("error");

  try {
    // Still signed in as the owner of that profile?
    await requireProfile(profileId);
  } catch (error) {
    if (error instanceof UnauthorizedError) return done("error");
    throw error;
  }

  const tokens = await exchangeCode(code);
  if (!tokens.ok) return done("error");
  await saveTraktConnection(profileId, tokens.data);
  return done("connected");
}
