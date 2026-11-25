// Automatic "Skip Intro" / "Next episode" times for anime from AniSkip (https://aniskip.com),
// a free community database of opening/ending timestamps keyed by MyAnimeList id + episode.
// Used only when an admin hasn't set the times for a video (lib/player/playback.ts), and the
// player only trusts them when its video is as long as the one they were measured on.
import "server-only";
import type { AnimeSeason, SkipTimes, TitleDetails } from "@/lib/types";
import { cacheTag } from "next/cache";

import { getAnimeInfo } from "@/lib/anilist/anime";
import { setCacheLife } from "@/lib/tmdb/cache";

const ANISKIP_API = "https://api.aniskip.com/v2/skip-times";

/**
 * TMDB season/episode → the MAL entry + episode number AniSkip uses: count the episode's number
 * across the whole show, then walk AniList's seasons. This works however each site splits the
 * show: one long entry (One Piece S2E1 = 62), TMDB merging cours (Frieren S1E30 = AniList season 2,
 * episode 2), or matching seasons (Demon Slayer). Matching season *counts* alone isn't enough:
 * AniList may be missing a season (AoT) while having an extra part elsewhere.
 * null when it can't be placed: an earlier AniList season has no episode count, or the episode is
 * past what AniList lists.
 */
export function aniskipTarget(
  seasons: AnimeSeason[],
  seasonEpisodeCounts: number[],
  season: number,
  episode: number
): { malId: number; episode: number } | null {
  const aired = seasons.filter((s) => s.released);
  const fits = (entry: AnimeSeason, ep: number) => Boolean(entry.malId) && (entry.episodes === null || ep <= entry.episodes);

  let rest = seasonEpisodeCounts.slice(0, season - 1).reduce((sum, c) => sum + c, 0) + episode;
  for (const [i, entry] of aired.entries()) {
    const isLast = i === aired.length - 1;
    if (entry.episodes === null) return isLast && fits(entry, rest) ? { malId: entry.malId, episode: rest } : null;
    if (rest <= entry.episodes) return fits(entry, rest) ? { malId: entry.malId, episode: rest } : null;
    rest -= entry.episodes;
  }
  return null;
}

type AniskipResponse = {
  found?: boolean;
  results?: { skipType?: string; interval?: { startTime?: number; endTime?: number }; episodeLength?: number }[];
};

/** AniSkip's opening/ending for one MAL episode; null when there are none. Never throws. */
export async function getSkipTimes(malId: number, episode: number): Promise<SkipTimes | null> {
  "use cache";
  cacheTag(`aniskip:${malId}:${episode}`);
  const url = `${ANISKIP_API}/${malId}/${episode}?types[]=op&types[]=ed&episodeLength=0`;
  let json: AniskipResponse;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    // 404 = no times submitted for this episode yet.
    if (res.status === 404) {
      setCacheLife("days");
      return null;
    }
    if (!res.ok) {
      console.warn(`[aniskip] HTTP ${res.status} for ${malId}/${episode}`);
      setCacheLife("minutes");
      return null;
    }
    json = (await res.json()) as AniskipResponse;
  } catch (error) {
    console.warn("[aniskip] request failed:", error instanceof Error ? error.message : error);
    setCacheLife("minutes");
    return null;
  }

  const pick = (type: string) =>
    json.results?.find((r) => r.skipType === type && r.interval?.startTime !== undefined && r.interval.endTime !== undefined && r.episodeLength);
  const op = pick("op");
  const ed = pick("ed");
  const intro =
    op && op.interval.endTime > op.interval.startTime
      ? { start: Math.max(0, Math.floor(op.interval.startTime)), end: Math.ceil(op.interval.endTime), length: op.episodeLength }
      : null;
  const credits = ed ? { at: Math.floor(ed.interval.startTime), length: ed.episodeLength } : null;

  setCacheLife(intro || credits ? "weeks" : "days");
  return intro || credits ? { intro, credits } : null;
}

/** Skip times for an anime episode, or null (not anime, no AniList match, nothing on AniSkip). */
export async function getAutoSkipTimes(details: TitleDetails, season: number | null, episode: number | null): Promise<SkipTimes | null> {
  if (!details.isAnime || details.title.type === "movie" || !season || !episode) return null;
  const info = await getAnimeInfo({
    id: details.title.id,
    name: details.title.title,
    originalName: details.originalTitle,
    year: details.title.year,
  });
  const target = info && aniskipTarget(info.seasons, details.seasonEpisodeCounts, season, episode);
  return target ? getSkipTimes(target.malId, target.episode) : null;
}
