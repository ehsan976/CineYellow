import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import { auth } from "@/lib/auth/server";
import { ADMIN_PAGES, SIGNED_OUT_PAGES, isPublicPage, loginUrl, matchesPage, safeNext } from "@/lib/auth/routes";

// Like Netflix: signed-out visitors get the landing page (/welcome) at the site root and the
// sign-in page for any other link. Proxy runs on Node.js, so the session is verified here
// with Better Auth (a forged or expired cookie counts as signed out) before any page renders.
async function getSession(request: NextRequest) {
  // No session cookie at all: skip the lookup.
  if (!getSessionCookie(request)) return null;
  try {
    return await auth.api.getSession({ headers: request.headers, returnHeaders: true });
  } catch {
    return null;
  }
}

/** Role comes from the admin plugin's `user.role` column (in the session cookie cache). */
const isAdmin = (session: { user?: unknown } | null | undefined) =>
  (session?.user as { role?: string | null } | undefined)?.role === "admin";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const result = await getSession(request);
  const signedIn = Boolean(result?.response);

  let response: NextResponse;
  if (!signedIn && !isPublicPage(pathname)) {
    const target = pathname === "/" ? "/welcome" : loginUrl(pathname + search);
    response = NextResponse.redirect(new URL(target, request.url));
  } else if (signedIn && matchesPage(pathname, SIGNED_OUT_PAGES)) {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    response = NextResponse.redirect(new URL(next, request.url));
  } else if (signedIn && matchesPage(pathname, ADMIN_PAGES) && !isAdmin(result.response)) {
    response = NextResponse.redirect(new URL("/", request.url));
  } else {
    response = NextResponse.next();
  }

  // Pass on refreshed or cleared session cookies (e.g. a renewed cookie cache).
  result?.headers?.getSetCookie().forEach((cookie) => response.headers.append("set-cookie", cookie));
  return response;
}

export const config = {
  // Skip API routes (Better Auth's endpoints, and /api/me which checks the session itself and
  // answers 401 instead of redirecting), Next.js internals and static files.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|vtt)$).*)",
  ],
};
