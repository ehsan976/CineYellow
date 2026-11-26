// Which pages need a signed-in user. Shared by proxy.ts (server) and AppProvider (client).

/** Pages only for signed-out visitors — signed-in users are sent home. */
export const SIGNED_OUT_PAGES = ["/welcome", "/login", "/signup", "/forgot-password"];
/** Pages anyone can open. Everything else needs a session. (/reset-password too: a signed-in
 * user who opens the link from the email can still set a new password.) */
export const PUBLIC_PAGES = [...SIGNED_OUT_PAGES, "/reset-password", "/help"];

/** Pages only for users with the "admin" role (the admin API checks the role again itself). */
export const ADMIN_PAGES = ["/admin"];

export const matchesPage = (pathname: string, pages: string[]) =>
  pages.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const isPublicPage = (pathname: string) => matchesPage(pathname, PUBLIC_PAGES);

/** Stand-in origin for parsing paths the same way on the server and in the browser. */
const PATH_BASE = "http://cineyellow.invalid";

/**
 * Only allow same-site paths as a post-login redirect. A prefix check isn't enough: URL parsing
 * treats "\" as "/" and drops tabs/newlines, so "/\evil.com" or "/<tab>/evil.com" would leave the
 * site. Parse it, keep it only if it stays on our origin, and return the normalised path.
 */
export function safeNext(next: string | null | undefined): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.length > 2000) return "/";
  // Backslashes and control characters (tab, newline…) are exactly what browsers "fix" into "//".
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return "/";
  try {
    const url = new URL(next, PATH_BASE);
    // "/./..//x" normalises to "//x", which a browser reads as another host.
    if (url.origin !== PATH_BASE || url.pathname.startsWith("//")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** /login, remembering where to come back to. */
export function loginUrl(next: string) {
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
