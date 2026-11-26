// The catalog: every title, list and episode the site shows, read from TMDB.
// Each query is a cached function ("use cache" + an explicit cacheLife). Failed calls are cached
// for "minutes" only, so a TMDB hiccup or a missing key heals by itself.
import "server-only";
import type { BrowseSort, CatalogPage, Episode, GenreOption, Title, TitleDetails, TitleType } from "@/lib/types";
import type { TmdbDetails, TmdbGenreList, TmdbList, TmdbListItem, TmdbSeason } from "@/lib/tmdb/types";
import { cacheTag } from "next/cache";

import { setCacheLife } from "@/lib/tmdb/cache";
import { mapLimit, tmdbGet } from "@/lib/tmdb/client";
import { tmdb } from "@/lib/tmdb/config";
import {
  ANIME_LANGUAGES,
  dedupeTitles,
  genreLabel,
  isAnime,
  pickTrailer,
  toEpisodes,
  toFullTitle,
  toSeasonEpisodeCounts,
  toSummaryTitle,
  toWatchProviders,
  type GenreMap,
} from "@/lib/tmdb/map";
import { parseTitleId, type TmdbMedia } from "@/lib/titles";
import type { EpisodeRef, ReleaseInfo } from "@/lib/releases";

const ANIMATION = 16;
const MAX_PAGE = 50;

// ---------- Genres ----------

export interface GenreMaps {
  movie: GenreMap;
  tv: GenreMap;
  /** Both lists merged (for /search/multi and trending results that mix movies and TV). */
  all: GenreMap;
  movieList: { id: number; name: string }[];
  tvList: { id: number; name: string }[];
}

export async function getGenreMaps(): Promise<GenreMaps> {
  "use cache";
  const [movie, tv] = await Promise.all([
    tmdbGet<TmdbGenreList>("/genre/movie/list"),
    tmdbGet<TmdbGenreList>("/genre/tv/list"),
  ]);
  setCacheLife(movie.ok && tv.ok ? "weeks" : "minutes");
  const movieList = movie.ok ? (movie.data.genres ?? []) : [];
  const tvList = tv.ok ? (tv.data.genres ?? []) : [];
  const toMap = (list: { id: number; name: string }[]) => Object.fromEntries(list.map((g) => [g.id, g.name]));
  return { movie: toMap(movieList), tv: toMap(tvList), all: { ...toMap(tvList), ...toMap(movieList) }, movieList, tvList };
}

/** Maps a list response to summary Titles (dropping people and image-less items). */
export function listToTitles(list: TmdbList | null | undefined, genres: GenreMap, media?: TmdbMedia): Title[] {
  return dedupeTitles((list?.results ?? []).map((item) => toSummaryTitle(item, genres, media)));
}

// ---------- One title ----------

/** Full title (rating, runtime/seasons, cast) plus "More like this". null when it doesn't exist. */
export async function getTitleDetails(id: string): Promise<TitleDetails | null> {
  "use cache";
  cacheTag(`tmdb:title:${id}`);
  const ref = parseTitleId(id);
  if (!ref) {
    setCacheLife("days");
    return null;
  }
  const append =
    ref.media === "movie"
      ? "credits,release_dates,recommendations,similar,external_ids,videos,watch/providers"
      : "aggregate_credits,content_ratings,recommendations,similar,external_ids,videos,watch/providers";
  const [res, genres] = await Promise.all([
    // include_video_language: trailers in English, Hindi or with no language set.
    tmdbGet<TmdbDetails>(`/${ref.media}/${ref.tmdbId}`, { append_to_response: append, include_video_language: "en,hi,null" }),
    getGenreMaps(),
  ]);
  if (!res.ok) {
    // 404: the title really doesn't exist. Anything else may be temporary.
    setCacheLife(res.status === 404 ? "days" : "minutes");
    return null;
  }
  setCacheLife("days");
  const details = res.data;
  const title = toFullTitle(ref.media, details, tmdb.region);
  const map = ref.media === "movie" ? genres.movie : genres.tv;
  const recommended = listToTitles(details.recommendations, map, ref.media);
  const similar = (recommended.length >= 4 ? recommended : dedupeTitles([...recommended, ...listToTitles(details.similar, map, ref.media)]))
    .filter((t) => t.id !== id)
    .slice(0, 12);
  return {
    title,
    similar,
    imdbId: details.imdb_id ?? details.external_ids?.imdb_id ?? null,
    tagline: details.tagline?.trim() ?? "",
    trailer: pickTrailer(details.videos?.results),
    originalTitle: (details.original_name ?? details.original_title ?? "").trim(),
    isAnime: isAnime((details.genres ?? []).map((g) => g.id), details),
    watchProviders: toWatchProviders(details, tmdb.region),
    seasonEpisodeCounts: ref.media === "tv" ? toSeasonEpisodeCounts(details) : [],
  };
}

/**
 * Release dates for the bell's My List reminders: a movie's release date, a show's newest and
 * next episode. One plain TMDB call; cached for hours (getTitleDetails is cached for days, too
 * long for weekly episodes). null when the id is bad or TMDB fails.
 */
export async function getReleaseInfo(id: string): Promise<ReleaseInfo | null> {
  "use cache";
  cacheTag(`tmdb:title:${id}`);
  const ref = parseTitleId(id);
  if (!ref) {
    setCacheLife("days");
    return null;
  }
  const res = await tmdbGet<TmdbDetails>(`/${ref.media}/${ref.tmdbId}`);
  if (!res.ok) {
    setCacheLife(res.status === 404 ? "days" : "minutes");
    return null;
  }
  setCacheLife("hours");
  const episode = (e: TmdbDetails["last_episode_to_air"]): EpisodeRef | null =>
    e?.air_date && e.season_number && e.episode_number ? { season: e.season_number, episode: e.episode_number, airDate: e.air_date } : null;
  const d = res.data;
  return {
    id,
    media: ref.media,
    releaseDate: ref.media === "movie" ? d.release_date || null : null,
    lastEpisode: ref.media === "tv" ? episode(d.last_episode_to_air) : null,
    nextEpisode: ref.media === "tv" ? episode(d.next_episode_to_air) : null,
  };
}

export async function getTitle(id: string): Promise<Title | null> {
  return (await getTitleDetails(id))?.title ?? null;
}

/** Full titles for a list of ids (My List, history…), in the same order. Unknown ids → null. */
export async function getTitlesByIds(ids: string[]): Promise<Record<string, Title | null>> {
  const valid = [...new Set(ids)].filter((id) => parseTitleId(id)).slice(0, 50);
  const titles = await mapLimit(valid, 8, getTitle);
  const out: Record<string, Title | null> = {};
  for (const id of ids) out[id] = null;
  valid.forEach((id, i) => (out[id] = titles[i]));
  return out;
}

// ---------- Episodes ----------

/**
 * One season from TMDB, without episodes that haven't aired yet (an episode with an air date in
 * the future can't be watched; ones with no date are kept). A season still airing is cached for
 * "hours", so the next episode shows up the day it airs; finished seasons for "days".
 * (The date is read here, inside the cache, where Cache Components allows it.)
 */
async function getSeason(tvId: number, season: number): Promise<TmdbSeason | null> {
  "use cache";
  cacheTag(`tmdb:title:tv-${tvId}`);
  const res = await tmdbGet<TmdbSeason>(`/tv/${tvId}/season/${season}`);
  if (!res.ok) {
    setCacheLife(res.status === 404 ? "days" : "minutes");
    return null;
  }
  const today = new Date().toISOString().slice(0, 10);
  const all = res.data.episodes ?? [];
  const aired = all.filter((ep) => !ep.air_date || ep.air_date <= today);
  setCacheLife(aired.length < all.length ? "hours" : "days");
  return { ...res.data, episodes: aired };
}

/** Episodes of one season ([] for movies, unknown seasons or when TMDB is unavailable). */
export async function getEpisodes(title: Title, season: number): Promise<Episode[]> {
  const ref = parseTitleId(title.id);
  if (!ref || ref.media !== "tv" || !Number.isInteger(season) || season < 1 || season > 200) return [];
  const data = await getSeason(ref.tmdbId, season);
  return toEpisodes(data?.episodes, title, season);
}

// ---------- Browse (Movies / Series / Anime) ----------

/**
 * Anime filters: genres (one key, the matching TV and movie genre ids) and, first, the country of
 * origin by original language (`lang`): Japanese anime, Korean animation, Chinese donghua.
 */
const ANIME_GENRES: { value: string; label: string; tv?: number; movie?: number; lang?: string }[] = [
  { value: "japanese", label: "Japanese", tv: ANIMATION, movie: ANIMATION, lang: "ja" },
  { value: "korean", label: "Korean", tv: ANIMATION, movie: ANIMATION, lang: "ko" },
  { value: "chinese", label: "Chinese (donghua)", tv: ANIMATION, movie: ANIMATION, lang: "zh|cn" },
  { value: "action", label: "Action", tv: 10759, movie: 28 },
  { value: "adventure", label: "Adventure", tv: 10759, movie: 12 },
  { value: "comedy", label: "Comedy", tv: 35, movie: 35 },
  { value: "drama", label: "Drama", tv: 18, movie: 18 },
  { value: "fantasy", label: "Fantasy", tv: 10765, movie: 14 },
  { value: "sci-fi", label: "Sci-Fi", tv: 10765, movie: 878 },
  { value: "mystery", label: "Mystery", tv: 9648, movie: 9648 },
  { value: "crime", label: "Crime", tv: 80, movie: 80 },
  { value: "family", label: "Family", tv: 10751, movie: 10751 },
  { value: "romance", label: "Romance", movie: 10749 },
];

export async function getBrowseGenres(type: TitleType): Promise<GenreOption[]> {
  if (type === "anime") return ANIME_GENRES.map(({ value, label }) => ({ value, label }));
  const genres = await getGenreMaps();
  const list = type === "movie" ? genres.movieList : genres.tvList;
  return list
    .filter((g) => g.id !== ANIMATION || type === "movie")
    .map((g) => ({ value: String(g.id), label: genreLabel(g.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const EMPTY_PAGE: CatalogPage = { items: [], page: 1, totalPages: 0, totalResults: 0 };

function sortParams(media: TmdbMedia, sort: BrowseSort, today: string, anime: boolean): Record<string, string | number> {
  const date = media === "movie" ? "primary_release_date" : "first_air_date";
  switch (sort) {
    case "newest":
      return { sort_by: `${date}.desc`, [`${date}.lte`]: today, "vote_count.gte": 10 };
    case "rating":
      return { sort_by: "vote_average.desc", "vote_count.gte": anime ? 100 : 300 };
    case "az":
      return { sort_by: media === "movie" ? "title.asc" : "name.asc", "vote_count.gte": 50 };
    default:
      return { sort_by: "popularity.desc" };
  }
}

const comparators: Record<BrowseSort, (a: Title, b: Title) => number> = {
  popular: (a, b) => b.popularity - a.popularity,
  newest: (a, b) => b.year - a.year || b.popularity - a.popularity,
  rating: (a, b) => b.match - a.match,
  az: (a, b) => a.title.localeCompare(b.title),
};

export async function discoverTitles(
  type: TitleType,
  { genre = "all", sort = "popular", page = 1 }: { genre?: string; sort?: BrowseSort; page?: number } = {}
): Promise<CatalogPage> {
  "use cache";
  const p = Math.min(Math.max(1, Math.floor(page) || 1), MAX_PAGE);
  const today = new Date().toISOString().slice(0, 10);
  const genres = await getGenreMaps();
  const base = { include_adult: false, page: p };

  const run = async (media: TmdbMedia, extra: Record<string, string | number>) => {
    const res = await tmdbGet<TmdbList>(`/discover/${media}`, { ...base, ...extra });
    return res.ok ? res.data : null;
  };

  let lists: (TmdbList | null)[];
  let mediaOrder: TmdbMedia[];
  if (type === "anime") {
    const g = ANIME_GENRES.find((x) => x.value === genre);
    if (genre !== "all" && !g) {
      setCacheLife("hours");
      return EMPTY_PAGE;
    }
    const jobs: Promise<TmdbList | null>[] = [];
    mediaOrder = [];
    for (const media of ["tv", "movie"] as const) {
      const id = g ? g[media] : undefined;
      if (g && !id) continue;
      mediaOrder.push(media);
      jobs.push(
        run(media, {
          ...sortParams(media, sort, today, true),
          // A country filter has the animation genre as its "genre" (no second genre needed).
          with_genres: id && id !== ANIMATION ? `${ANIMATION},${id}` : String(ANIMATION),
          // TMDB reads "|" as OR: by default every anime language.
          with_original_language: g?.lang ?? ANIME_LANGUAGES.join("|"),
        })
      );
    }
    lists = await Promise.all(jobs);
  } else {
    const media: TmdbMedia = type === "movie" ? "movie" : "tv";
    const genreId = genre === "all" ? undefined : Number(genre);
    if (genre !== "all" && !Number.isInteger(genreId)) {
      setCacheLife("hours");
      return EMPTY_PAGE;
    }
    mediaOrder = [media];
    lists = [await run(media, { ...sortParams(media, sort, today, false), ...(genreId ? { with_genres: genreId } : {}) })];
  }

  const failed = lists.some((l) => !l) || !genres.movieList.length;
  setCacheLife(failed ? "minutes" : "hours");

  let items = lists.flatMap((list, i) =>
    listToTitles(list, mediaOrder[i] === "movie" ? genres.movie : genres.tv, mediaOrder[i])
  );
  if (type === "series") {
    // Japanese animated TV lives on the Anime page.
    const animeIds = new Set(
      (lists[0]?.results ?? []).filter((r) => isAnime(r.genre_ids ?? [], r)).map((r) => `tv-${r.id}`)
    );
    items = items.filter((t) => !animeIds.has(t.id));
  }
  if (type === "anime") items = dedupeTitles(items).sort(comparators[sort]);

  return {
    items,
    page: p,
    totalPages: Math.min(MAX_PAGE, Math.max(0, ...lists.map((l) => l?.total_pages ?? 0))),
    totalResults: lists.reduce((sum, l) => sum + (l?.total_results ?? 0), 0),
  };
}

export function isBrowseSort(value: unknown): value is BrowseSort {
  return value === "popular" || value === "newest" || value === "rating" || value === "az";
}

// ---------- Search ----------

export async function searchTitles(query: string): Promise<Title[]> {
  "use cache";
  const q = query.trim().toLowerCase().slice(0, 80);
  if (!q) {
    setCacheLife("hours");
    return [];
  }
  const genres = await getGenreMaps();
  const [page1, page2] = await Promise.all([
    tmdbGet<TmdbList>("/search/multi", { query: q, include_adult: false, page: 1 }),
    tmdbGet<TmdbList>("/search/multi", { query: q, include_adult: false, page: 2 }),
  ]);
  const results: TmdbListItem[] = [
    ...(page1.ok ? (page1.data.results ?? []) : []),
    ...(page2.ok ? (page2.data.results ?? []) : []),
  ];
  // Keep TMDB's relevance order; a person ("Shah Rukh Khan") becomes the titles they're known for.
  const ranked = results.flatMap((r) => (r.media_type === "person" ? (r.known_for ?? []) : [r]));

  // Genre words ("thriller", "anime") → popular titles of that genre.
  let byGenre: Title[] = [];
  if (q === "anime") {
    byGenre = (await discoverTitles("anime")).items;
  } else {
    const movieGenre = genres.movieList.find((g) => genreLabel(g.name).toLowerCase() === q || g.name.toLowerCase() === q);
    const tvGenre = genres.tvList.find((g) => g.name.toLowerCase().split(" & ").some((part) => part === q) || g.name.toLowerCase() === q);
    const [movies, shows] = await Promise.all([
      movieGenre ? discoverTitles("movie", { genre: String(movieGenre.id) }) : null,
      tvGenre ? discoverTitles("series", { genre: String(tvGenre.id) }) : null,
    ]);
    byGenre = [...(movies?.items ?? []), ...(shows?.items ?? [])].sort((a, b) => b.popularity - a.popularity);
  }

  setCacheLife(page1.ok ? "hours" : "minutes");
  const matches = ranked.map((r) => toSummaryTitle(r, genres.all));
  // A genre word ("thriller", "anime") means "show me that genre" first, then titles with the word.
  return dedupeTitles(byGenre.length ? [...byGenre, ...matches] : matches).slice(0, 60);
}
