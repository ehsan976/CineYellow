// Fetches one show from Movie of the Night and returns its audio/subtitle languages for the
// configured country. Never throws.
import { motn } from "@/lib/motn/config";
import { parseShowLanguages } from "@/lib/motn/parse";
import { parseTitleId } from "@/lib/titles";

export type MotnLanguages =
  | { ok: true; found: boolean; audio: string[]; subtitles: string[] }
  | { ok: false; reason: "disabled" | "auth" | "rate_limited" | "error" };

/** Our id → the API's show id: "movie-550" → "movie/550", "tv-1399" → "tv/1399". */
export function motnShowId(titleId: string): string | null {
  const ref = parseTitleId(titleId);
  return ref ? `${ref.media}/${ref.tmdbId}` : null;
}

let loggedShape = false;

async function getShow(showId: string): Promise<{ status: number; json?: unknown }> {
  const url = new URL(`${motn.base}/shows/${showId}`);
  url.searchParams.set("country", motn.country);
  url.searchParams.set("series_granularity", "show");
  url.searchParams.set("output_language", "en");
  const headers: Record<string, string> = { accept: "application/json" };
  if (motn.isRapidApi) {
    headers["X-RapidAPI-Key"] = motn.apiKey;
    headers["X-RapidAPI-Host"] = motn.host;
  } else {
    headers["X-API-Key"] = motn.apiKey;
  }
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) return { status: res.status };
  return { status: res.status, json: await res.json() };
}

export async function fetchShowLanguages(ref: { id: string; imdbId?: string | null }): Promise<MotnLanguages> {
  if (!motn.enabled) return { ok: false, reason: "disabled" };
  const showId = motnShowId(ref.id);
  if (!showId) return { ok: true, found: false, audio: [], subtitles: [] };

  try {
    let res = await getShow(showId);
    // Some titles are only indexed by IMDb id.
    if (res.status === 404 && ref.imdbId && /^tt\d+$/.test(ref.imdbId)) res = await getShow(ref.imdbId);

    if (res.status === 404) return { ok: true, found: false, audio: [], subtitles: [] };
    if (res.status === 401 || res.status === 403) {
      console.warn(`[motn] HTTP ${res.status}: check MOTN_API_KEY / MOTN_API_BASE`);
      return { ok: false, reason: "auth" };
    }
    if (res.status === 429) {
      console.warn("[motn] rate limited (429)");
      return { ok: false, reason: "rate_limited" };
    }
    if (!res.json) {
      console.warn(`[motn] ${showId} → HTTP ${res.status}`);
      return { ok: false, reason: "error" };
    }

    if (process.env.NODE_ENV !== "production" && !loggedShape) {
      loggedShape = true;
      const json = res.json as { streamingOptions?: Record<string, unknown[]> };
      const first = json.streamingOptions?.[motn.country]?.[0];
      console.info("[motn] response keys:", Object.keys(json ?? {}), "· first option keys:", first ? Object.keys(first) : "none");
    }

    const { audio, subtitles } = parseShowLanguages(res.json, motn.country);
    return { ok: true, found: true, audio, subtitles };
  } catch (error) {
    console.warn(`[motn] ${showId} failed:`, error instanceof Error ? error.message : error);
    return { ok: false, reason: "error" };
  }
}
