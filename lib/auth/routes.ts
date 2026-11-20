// Which pages need a signed-in user. Shared by proxy.ts (server) and AppProvider (client).

/** Pages only for signed-out visitors — signed-in users are sent home. */
export const SIGNED_OUT_PAGES = ["/welcome", "/login", "/signup"];
/** Pages anyone can open. Everything else needs a session. */
export const PUBLIC_PAGES = [...SIGNED_OUT_PAGES, "/help"];

/** Pages only for users with the "admin" role (the admin API checks the role again itself). */
export const ADMIN_PAGES = ["/admin"];

export const matchesPage = (pathname: string, pages: string[]) =>
  pages.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const isPublicPage = (pathname: string) => matchesPage(pathname, PUBLIC_PAGES);

/** Only allow same-site paths as a post-login redirect. */
export function safeNext(next: string | null | undefined): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** /login, remembering where to come back to. */
export function loginUrl(next: string) {
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
