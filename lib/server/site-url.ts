// The site's public address, for sign-in (Better Auth), payment return links and OAuth callbacks.
//
// BETTER_AUTH_URL is the source of truth. On Vercel, if it's missing or was copied from a local
// .env (localhost), the project's production domain that Vercel provides is used instead, so a new
// or re-created Vercel project still signs people in. Requests from the deployment's own Vercel
// addresses (production, branch and preview URLs) are trusted too.
import "server-only";

const env = (name: string) => process.env[name]?.trim() || "";
const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
const https = (host: string) => (host ? `https://${host.replace(/^https?:\/\//, "").replace(/\/+$/, "")}` : "");

export function getSiteUrl(): string {
  const explicit = env("BETTER_AUTH_URL").replace(/\/+$/, "");
  const onVercel = env("VERCEL") === "1";
  if (explicit && !(onVercel && isLocal(explicit))) return explicit;
  const vercel = https(env("VERCEL_PROJECT_PRODUCTION_URL")) || https(env("VERCEL_URL"));
  if (onVercel && vercel) {
    if (explicit) console.warn(`[site-url] BETTER_AUTH_URL is ${explicit} on Vercel; using ${vercel}. Set it to your real domain.`);
    return vercel;
  }
  return explicit || "http://localhost:3000";
}

/** Origins Better Auth accepts sign-in requests from (besides its baseURL). */
export function getTrustedOrigins(): string[] {
  return [
    ...new Set(
      [getSiteUrl(), https(env("VERCEL_PROJECT_PRODUCTION_URL")), https(env("VERCEL_BRANCH_URL")), https(env("VERCEL_URL"))].filter(Boolean)
    ),
  ];
}
