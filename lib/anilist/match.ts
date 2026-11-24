// Matching a TMDB title to an AniList entry, and turning that entry into AnimeInfo. Pure functions.
//
// TMDB keeps a whole show (all seasons) under one id; AniList has one entry per season/cour.
// A TMDB show is matched to its FIRST AniList season (same premiere year), then
// lib/anilist/anime.ts follows SEQUEL links to find the season that is airing now.
import type { AnimeInfo } from "@/lib/types";
import type { TmdbMedia } from "@/lib/titles";

export type AnilistFormat = "TV" | "TV_SHORT" | "ONA" | "OVA" | "MOVIE" | "SPECIAL" | "MUSIC";
export type AnilistStatus = "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";

export interface AnilistAiring {
  episode: number;
  airingAt: number;
}

/** An entry in a relations tree: enough to walk to the airing season. */
export interface AnilistNode {
  id: number;
  type?: string;
  format?: AnilistFormat | null;
  status?: AnilistStatus | null;
  nextAiringEpisode?: AnilistAiring | null;
  /** Missing at the bottom of a fetched tree (not fetched, not "no relations"). */
  relations?: { edges?: { relationType?: string; node?: AnilistNode | null }[] } | null;
}

export interface AnilistMedia extends AnilistNode {
  idMal?: number | null;
  title?: { romaji?: string | null; english?: string | null; native?: string | null };
  synonyms?: string[] | null;
  episodes?: number | null;
  averageScore?: number | null;
  source?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null };
  studios?: { nodes?: { name: string }[] } | null;
  siteUrl?: string | null;
}

/** AniList formats that count as the same kind of title as a TMDB movie / show. */
export function formatsFor(media: TmdbMedia): AnilistFormat[] {
  return media === "movie" ? ["MOVIE"] : ["TV", "TV_SHORT", "ONA"];
}

const SHOW_FORMATS = new Set<AnilistFormat>(formatsFor("tv"));

/**
 * Lower-case, no accents/punctuation/spaces, so "Naruto Shippūden" = "Naruto: Shippuden".
 * Both sides go through this, so Japanese (whose voiced marks NFKD also splits off) still compares equal.
 */
export function normalizeTitle(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

export interface MatchTarget {
  media: TmdbMedia;
  /** Names to compare against (TMDB name and original name). */
  names: string[];
  /** TMDB release / first-air year; 0 when unknown. */
  year: number;
}

/** Points for how well one candidate fits. A match needs a name hit AND a year/format that fit. */
function scoreCandidate(m: AnilistMedia, target: MatchTarget): number {
  const wanted = new Set(target.names.map(normalizeTitle).filter(Boolean));
  const names = [m.title?.english, m.title?.romaji, m.title?.native, ...(m.synonyms ?? [])].map(normalizeTitle).filter(Boolean);
  const nameHit = names.some((n) => wanted.has(n));
  // Season 1 of a long show is often named after the show + a subtitle, e.g. "Name: Part 1".
  const prefixHit = !nameHit && names.some((n) => [...wanted].some((w) => w.length >= 4 && (n.startsWith(w) || w.startsWith(n))));
  if (!nameHit && !prefixHit) return 0;

  let score = nameHit ? 50 : 25;
  const year = m.startDate?.year ?? m.seasonYear ?? 0;
  if (target.year && year) {
    const diff = Math.abs(year - target.year);
    if (diff === 0) score += 40;
    else if (diff === 1) score += 20;
    else return 0; // a different year is a different show or a later season
  }
  if (m.format && formatsFor(target.media).includes(m.format)) score += 10;
  return score;
}

/** Best candidate for `target`, or null when nothing is a confident match. */
export function pickMatch(candidates: AnilistMedia[], target: MatchTarget): AnilistMedia | null {
  let best: AnilistMedia | null = null;
  let bestScore = 0;
  for (const m of candidates) {
    const s = scoreCandidate(m, target);
    if (s > bestScore) [best, bestScore] = [m, s];
  }
  // 60 = an exact name hit with a year within 1, or a prefix hit with the exact year.
  return bestScore >= 60 ? best : null;
}

/** The next TV season (SEQUEL relation), if AniList lists one. */
export function sequelOf(m: AnilistNode): AnilistNode | null {
  const edge = m.relations?.edges?.find(
    (e) => e.relationType === "SEQUEL" && e.node?.type === "ANIME" && e.node.format && SHOW_FORMATS.has(e.node.format)
  );
  return edge?.node ?? null;
}

const STATUS_LABELS: Record<AnilistStatus, string> = {
  RELEASING: "Airing",
  FINISHED: "Finished",
  NOT_YET_RELEASED: "Upcoming",
  HIATUS: "On hiatus",
  CANCELLED: "Cancelled",
};

const capitalize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** "LIGHT_NOVEL" → "Light Novel" */
const sourceLabel = (s?: string | null) => (s ? s.split("_").map(capitalize).join(" ") : "");

/**
 * `first` is the matched entry (season 1 for shows); `latest` is the newest season found by
 * following sequels (the same entry for movies). Status and next episode come from `latest`.
 */
export function toAnimeInfo(first: AnilistMedia, latest: AnilistNode): AnimeInfo {
  const status = latest.status ?? first.status;
  // A later season that hasn't started yet: the show itself isn't "upcoming".
  const sequelAnnounced = latest.id !== first.id && status === "NOT_YET_RELEASED";
  return {
    anilistId: first.id,
    malId: first.idMal ?? null,
    score: first.averageScore ?? null,
    studios: (first.studios?.nodes ?? []).map((s) => s.name).filter(Boolean),
    source: sourceLabel(first.source),
    season: first.season && first.seasonYear ? `${capitalize(first.season)} ${first.seasonYear}` : "",
    status: sequelAnnounced ? "New season announced" : status ? STATUS_LABELS[status] ?? capitalize(status) : "",
    episodes: first.episodes ?? null,
    nextEpisode: latest.nextAiringEpisode
      ? { number: latest.nextAiringEpisode.episode, airingAt: latest.nextAiringEpisode.airingAt }
      : null,
    anilistUrl: first.siteUrl ?? `https://anilist.co/anime/${first.id}`,
    malUrl: first.idMal ? `https://myanimelist.net/anime/${first.idMal}` : null,
  };
}
