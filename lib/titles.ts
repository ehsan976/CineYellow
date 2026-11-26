// Title helpers that are safe to import anywhere (client components included): no secrets,
// no fetching. The data itself comes from TMDB through lib/tmdb (server only).
import type { Title, TitleType } from "@/lib/types";

export const typeLabels: Record<TitleType, string> = { movie: "Movie", series: "Series", anime: "Anime" };

/** "2h 14m" for movies, "3 Seasons" for shows; "" when TMDB didn't give us the number. */
export function metaLine(t: Title): string {
  if (t.type === "movie") return t.duration ?? "";
  return t.seasons ? `${t.seasons} Season${t.seasons > 1 ? "s" : ""}` : "";
}

/** "2h 14m" / "45m" (formatRuntime, episode runtimes) → seconds; null when unknown. */
export function runtimeToSeconds(text: string | null | undefined): number | null {
  const m = /^\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/.exec(text ?? "");
  if (!m || (!m[1] && !m[2])) return null;
  const seconds = (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60;
  return seconds > 0 ? seconds : null;
}

export type TmdbMedia = "movie" | "tv";

/** Our ids are "<media>-<TMDB id>", e.g. "movie-550" or "tv-1399". */
const TITLE_ID = /^(movie|tv)-(\d{1,10})$/;

export function parseTitleId(id: unknown): { media: TmdbMedia; tmdbId: number } | null {
  if (typeof id !== "string") return null;
  const m = TITLE_ID.exec(id);
  if (!m) return null;
  const tmdbId = Number(m[2]);
  return tmdbId > 0 ? { media: m[1] as TmdbMedia, tmdbId } : null;
}

/** False for anything that isn't a TMDB title id (e.g. ids left over from the old mock catalog). */
export const isTitleId = (id: unknown): id is string => parseTitleId(id) !== null;

export const makeTitleId = (media: TmdbMedia, tmdbId: number | string) => `${media}-${tmdbId}`;

/**
 * Ratings a Kids profile may play (the profile is labelled "7+"). Titles rated 13+ and up, and
 * titles with no known rating, are blocked there: for children, unknown counts as not suitable.
 * Ratings are our labels from lib/tmdb/map.ts (certifications for the site's region, then IN, US).
 */
export const KIDS_RATINGS = ["All", "7+"];
export const isKidsFriendly = (rating: string | null | undefined) => KIDS_RATINGS.includes(rating ?? "");

export const PLACEHOLDER_POSTER = "/placeholder-poster.svg";
export const PLACEHOLDER_LANDSCAPE = "/placeholder-landscape.svg";
