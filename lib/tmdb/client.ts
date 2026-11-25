// Thin TMDB fetch wrapper. Never throws: callers get { ok: false } and render an empty state.
// Caching happens one level up, in the "use cache" functions of lib/tmdb/catalog.ts.
import "server-only";
import { TMDB_API, tmdb } from "@/lib/tmdb/config";

export type TmdbResult<T> = { ok: true; data: T; status: number } | { ok: false; data?: undefined; status: number };

type Params = Record<string, string | number | boolean | undefined | null>;

export async function tmdbGet<T>(path: string, params: Params = {}): Promise<TmdbResult<T>> {
  if (!tmdb.enabled) return { ok: false, status: 0 };

  const url = new URL(TMDB_API + path);
  const query: Params = { language: tmdb.language, ...params };
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = { accept: "application/json" };
  if (tmdb.readToken) headers.authorization = `Bearer ${tmdb.readToken}`;
  else url.searchParams.set("api_key", tmdb.apiKey);

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      if (res.status !== 404) console.warn(`[tmdb] ${path} → HTTP ${res.status}`);
      return { ok: false, status: res.status };
    }
    return { ok: true, data: (await res.json()) as T, status: res.status };
  } catch (error) {
    console.warn(`[tmdb] ${path} failed:`, error instanceof Error ? error.message : error);
    return { ok: false, status: 0 };
  }
}

/** Runs `fn` over `items` with at most `limit` calls in flight; keeps the input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
