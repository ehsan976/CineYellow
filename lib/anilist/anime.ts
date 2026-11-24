// Anime details from AniList for a TMDB title (score, studios, source, season, next episode).
// Cached per title: "hours" while a season is airing (so the next episode stays fresh), "days"
// otherwise, "minutes" when AniList failed. Never throws.
import type { AnimeInfo } from "@/lib/types";
import { cacheTag } from "next/cache";

import { anilistQuery } from "@/lib/anilist/client";
import { formatsFor, pickMatch, sequelOf, toAnimeInfo, type AnilistMedia, type AnilistNode } from "@/lib/anilist/match";
import { setCacheLife } from "@/lib/tmdb/cache";
import { parseTitleId } from "@/lib/titles";

export const animeInfoTag = (titleId: string) => `anilist:${titleId}`;

const NODE_FIELDS = "id type format status nextAiringEpisode { episode airingAt }";

/** A relations tree `depth` levels deep, so one request covers several later seasons. */
const relationsTree = (depth: number): string =>
  depth === 0 ? NODE_FIELDS : `${NODE_FIELDS} relations { edges { relationType node { ${relationsTree(depth - 1)} } } }`;

const SEARCH_QUERY = `query ($search: String, $formats: [MediaFormat]) {
  Page(perPage: 8) {
    media(search: $search, type: ANIME, format_in: $formats, sort: SEARCH_MATCH, isAdult: false) {
      idMal title { romaji english native } synonyms episodes averageScore source season seasonYear
      startDate { year } studios(isMain: true) { nodes { name } } siteUrl
      ${relationsTree(1)}
    }
  }
}`;

/** Levels per relations request (AniList limits query complexity). */
const TREE_DEPTH = 4;
const TREE_QUERY = `query ($id: Int) { Media(id: $id, type: ANIME) { ${relationsTree(TREE_DEPTH)} } }`;

/** Most later seasons to follow, and most relations requests, when looking for the airing season. */
const MAX_SEQUEL_HOPS = 12;
const MAX_TREE_FETCHES = 2;

export interface AnimeLookup {
  /** Our title id, "tv-37854" / "movie-372058". */
  id: string;
  /** TMDB display name. */
  name: string;
  /** TMDB original (usually Japanese) name. */
  originalName: string;
  /** TMDB release / first-air year; 0 when unknown. */
  year: number;
}

type Found = { info: AnimeInfo | null; failed: boolean };

async function findAnime({ id, name, originalName, year }: AnimeLookup): Promise<Found> {
  const ref = parseTitleId(id);
  if (!ref) return { info: null, failed: false };
  const target = { media: ref.media, names: [name, originalName], year };
  const formats = formatsFor(ref.media);

  // The Japanese name is the most exact search; the English one is the fallback.
  let match: AnilistMedia | null = null;
  for (const search of [...new Set([originalName, name].map((s) => s.trim()).filter(Boolean))]) {
    const res = await anilistQuery<{ Page?: { media?: AnilistMedia[] } }>(SEARCH_QUERY, { search, formats });
    if (!res.ok) return { info: null, failed: true };
    match = pickMatch(res.data.Page?.media ?? [], target);
    if (match) break;
  }
  if (!match) return { info: null, failed: false };

  // Shows: walk SEQUEL links to the season that is airing (or the newest one). The search
  // already holds the first level; deeper levels come TREE_DEPTH at a time.
  let latest: AnilistNode = match;
  if (ref.media === "tv") {
    const seen = new Set([match.id]);
    let fetches = 0;
    for (let hop = 0; hop < MAX_SEQUEL_HOPS && latest.status !== "RELEASING"; ) {
      if (!latest.relations) {
        // Bottom of the fetched tree: load the next levels from here.
        if (fetches++ >= MAX_TREE_FETCHES) break;
        const res = await anilistQuery<{ Media?: AnilistNode | null }>(TREE_QUERY, { id: latest.id });
        if (!res.ok || !res.data.Media?.relations) break; // keep what we have; the season-1 data is still right
        latest = res.data.Media;
        continue;
      }
      const next = sequelOf(latest);
      if (!next || seen.has(next.id)) break;
      seen.add(next.id);
      latest = next;
      hop++;
    }
  }
  return { info: toAnimeInfo(match, latest), failed: false };
}

/** AniList details for an anime title; null when AniList has no confident match (or failed). */
export async function getAnimeInfo(lookup: AnimeLookup): Promise<AnimeInfo | null> {
  "use cache";
  cacheTag(animeInfoTag(lookup.id));
  const { info, failed } = await findAnime(lookup);
  setCacheLife(failed ? "minutes" : info?.nextEpisode || info?.status === "Airing" ? "hours" : "days");
  return info;
}
