// Per-IP rate limit for the public JSON routes (/api/catalog/*). proxy.ts skips /api, so without
// this one client could loop these routes and use up the site's shared TMDB / AniList quotas.
//
// In-memory sliding window: each server instance counts on its own, so with N instances a client
// gets up to N × limit. It's a first line of defence that needs no Redis; put a shared store
// (e.g. Upstash) behind the same function if the site ever runs on many instances.
import { NextResponse } from "next/server";

type Bucket = { limit: number; windowMs: number };

/** Named limits, so every route of one kind shares one budget. */
export const RATE_LIMITS = {
  /** Titles, details, seasons, browse pages: TMDB, mostly served from cache. */
  catalog: { limit: 120, windowMs: 60_000 },
  /** AniList allows only ~30 requests a minute for the whole site. */
  anime: { limit: 20, windowMs: 60_000 },
  /** Up to 8 title lookups per request. */
  forYou: { limit: 30, windowMs: 60_000 },
} satisfies Record<string, Bucket>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/** key → hit timestamps (oldest first) inside the current window. */
const hits = new Map<string, number[]>();
let lastSweep = 0;

/** Client IP as seen by the proxy in front of the app; "unknown" when there is none (local dev). */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Drops keys whose newest hit has left every window (at most once a minute). */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  const longest = Math.max(...Object.values(RATE_LIMITS).map((b) => b.windowMs));
  for (const [key, times] of hits) {
    if (!times.length || now - times[times.length - 1] > longest) hits.delete(key);
  }
}

/**
 * Counts this request against `name` for the caller's IP.
 * Returns a 429 response to send back, or null when the request may go ahead.
 */
export function rateLimit(request: Request, name: RateLimitName): NextResponse | null {
  // Read the request before the clock: Cache Components only allows Date.now() once the
  // route has read request data.
  const key = `${name}:${clientIp(request)}`;
  const { limit, windowMs } = RATE_LIMITS[name];
  const now = Date.now();
  sweep(now);

  const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    hits.set(key, times);
    const retryAfter = Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } }
    );
  }
  times.push(now);
  hits.set(key, times);
  return null;
}
