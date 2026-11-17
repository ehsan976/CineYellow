import { NextResponse } from "next/server";

// Like Netflix: signed-out visitors get the landing page (/welcome) at the site root and the
// sign-in page for any other link. The session cookie is set/cleared by lib/auth-store.js
// (swap for your API's session later).
const SESSION_COOKIE = "cineyellow_session";
const SIGNED_OUT_PAGES = ["/welcome", "/login", "/signup"];
const PUBLIC_PAGES = [...SIGNED_OUT_PAGES, "/help"];

const matches = (pathname, pages) => pages.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.get(SESSION_COOKIE)?.value === "1";

  if (!signedIn && !matches(pathname, PUBLIC_PAGES)) {
    if (pathname === "/") return NextResponse.redirect(new URL("/welcome", request.url));
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Already signed in: skip the landing and sign-in pages.
  if (signedIn && matches(pathname, SIGNED_OUT_PAGES)) {
    const next = request.nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|vtt)$).*)"],
};
