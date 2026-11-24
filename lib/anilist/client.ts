// Thin AniList GraphQL wrapper (https://docs.anilist.co). Public API: no key needed.
// Never throws: callers get { ok: false } and render nothing. Caching happens one level up,
// in the "use cache" function of lib/anilist/anime.ts.
export const ANILIST_API = "https://graphql.anilist.co";

export type AnilistResult<T> = { ok: true; data: T } | { ok: false; status: number };

let warnedRateLimit = false;

export async function anilistQuery<T>(query: string, variables: Record<string, unknown>): Promise<AnilistResult<T>> {
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // 429: AniList allows ~90 requests a minute (less while degraded). Warn once, not per call.
      if (res.status === 429) {
        if (!warnedRateLimit) console.warn("[anilist] rate limited (HTTP 429)");
        warnedRateLimit = true;
      } else if (res.status !== 404) {
        console.warn(`[anilist] HTTP ${res.status}`);
      }
      return { ok: false, status: res.status };
    }
    const json = (await res.json()) as { data?: T | null; errors?: { message?: string }[] };
    if (!json.data) {
      console.warn("[anilist] query failed:", json.errors?.[0]?.message ?? "no data");
      return { ok: false, status: res.status };
    }
    warnedRateLimit = false;
    return { ok: true, data: json.data };
  } catch (error) {
    console.warn("[anilist] request failed:", error instanceof Error ? error.message : error);
    return { ok: false, status: 0 };
  }
}
