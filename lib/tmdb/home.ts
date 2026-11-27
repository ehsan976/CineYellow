// Homepage rows, the hero carousel, navbar notifications and the poster collage, from TMDB.
import "server-only";
import type { AppNotification, FeaturedItem, Row, RowItem, Title } from "@/lib/types";
import type { TmdbList } from "@/lib/tmdb/types";
import { cacheTag } from "next/cache";

import { setCacheLife } from "@/lib/tmdb/cache";
import { tmdbGet } from "@/lib/tmdb/client";
import { tmdb } from "@/lib/tmdb/config";
import { getGenreMaps, getTitleDetails, getTitlesByIds, listToTitles } from "@/lib/tmdb/catalog";
import { ALL_TITLE_VIDEOS_TAG, getAvailableTitleIds, getRecentVideos } from "@/lib/server/video-sources";
import { ANIME_LANGUAGES, dedupeTitles } from "@/lib/tmdb/map";
import type { TmdbMedia } from "@/lib/titles";

interface RowSpec {
  id: string;
  title: string;
  href: string;
  path: string;
  media?: TmdbMedia;
  params?: Record<string, string | number | boolean>;
  badge?: (index: number) => Pick<RowItem, "badge" | "watchNow">;
  limit?: number;
}

// Badges only say what's true. TMDB facts (an episode aired this week) are labelled as such;
// "Watch Now" / "On CineYellow" appear only for titles that really have a video here
// (getAvailableTitleIds), added in loadRow.
const newEpisode = (i: number) => (i < 2 ? { badge: "New Episode" } : {});

const TOP: RowSpec[] = [
  { id: "new", title: "Now in Cinemas", href: "/movies", path: "/movie/now_playing", media: "movie", params: { region: tmdb.region } },
  { id: "new-episodes", title: "New Episodes This Week", href: "/series", path: "/tv/on_the_air", media: "tv", badge: newEpisode },
  { id: "hindi", title: "Hindi-Language Movies", href: "/movies", path: "/discover/movie", media: "movie", params: { with_original_language: "hi", sort_by: "popularity.desc" } },
];

const TRENDING: RowSpec[] = [
  { id: "top-series", title: "Top 10 Series Today", href: "/series", path: "/trending/tv/day", media: "tv", limit: 10 },
  { id: "top-movies", title: "Top 10 Movies Today", href: "/movies", path: "/trending/movie/day", media: "movie", limit: 10 },
];

const MORE: RowSpec[] = [
  { id: "acclaimed", title: "Critically Acclaimed", href: "/movies", path: "/movie/top_rated", media: "movie" },
  { id: "binge", title: "Binge-worthy Series", href: "/series", path: "/tv/popular", media: "tv" },
  { id: "tamil", title: "Tamil-Language Movies", href: "/movies", path: "/discover/movie", media: "movie", params: { with_original_language: "ta", sort_by: "popularity.desc" } },
  {
    id: "anime",
    title: "Anime",
    href: "/anime",
    path: "/discover/tv",
    media: "tv",
    // Japanese anime, Korean animation and Chinese donghua ("|" is OR for TMDB).
    params: { with_genres: 16, with_original_language: ANIME_LANGUAGES.join("|"), sort_by: "popularity.desc" },
  },
];

export interface HomePage {
  featured: FeaturedItem[];
  topRows: Row[];
  trendingRows: Row[];
  moreRows: Row[];
}

async function loadRow(spec: RowSpec, available: Set<string>): Promise<Row | null> {
  const [res, genres] = await Promise.all([tmdbGet<TmdbList>(spec.path, { include_adult: false, ...spec.params }), getGenreMaps()]);
  if (!res.ok) return null;
  const map = spec.media === "movie" ? genres.movie : spec.media === "tv" ? genres.tv : genres.all;
  const titles = listToTitles(res.data, map, spec.media).slice(0, spec.limit ?? 12);
  if (!titles.length) return null;
  return {
    id: spec.id,
    title: spec.title,
    href: spec.href,
    items: titles.map((title, i) =>
      available.has(title.id) ? { title, badge: spec.badge?.(i).badge ?? "On CineYellow", watchNow: true } : { title, ...spec.badge?.(i) }
    ),
  };
}

const tagline = (fromTmdb: string | undefined, title: Title) => {
  if (fromTmdb) return fromTmdb;
  const text = title.description;
  return text.length > 140 ? `${text.slice(0, 137).trimEnd()}…` : text;
};

export async function getHomePage(): Promise<HomePage> {
  "use cache";
  cacheTag("tmdb:home", ALL_TITLE_VIDEOS_TAG);
  const available = new Set(await getAvailableTitleIds());
  const load = (spec: RowSpec) => loadRow(spec, available);
  const [top, trending, more, featuredList, genres] = await Promise.all([
    Promise.all(TOP.map(load)),
    Promise.all(TRENDING.map(load)),
    Promise.all(MORE.map(load)),
    tmdbGet<TmdbList>("/trending/all/day"),
    getGenreMaps(),
  ]);

  const candidates = featuredList.ok
    ? listToTitles(featuredList.data, genres.all).filter((t) => !t.imageId.endsWith(".svg")).slice(0, 5)
    : [];
  const details = await Promise.all(candidates.map((t) => getTitleDetails(t.id)));
  const featured: FeaturedItem[] = candidates.map((summary, i) => {
    const title = details[i]?.title ?? summary;
    return { title, tagline: tagline(details[i]?.tagline, title), available: true };
  });

  const rows = [...top, ...trending, ...more];
  setCacheLife(featuredList.ok && rows.every(Boolean) ? "hours" : "minutes");

  return {
    featured,
    topRows: top.filter(Boolean),
    trendingRows: trending.filter(Boolean),
    moreRows: more.filter(Boolean),
  };
}

/** "24 Nov" in the site's own timezone. */
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

/**
 * The navbar bell. Only titles that really have a video on the site (added in /admin/videos)
 * say "streaming on CineYellow"; TMDB news is worded as news about the title, not the site.
 */
export async function getNotifications(): Promise<AppNotification[]> {
  "use cache";
  cacheTag(ALL_TITLE_VIDEOS_TAG);
  const [recent, airing, playing, trending, genres] = await Promise.all([
    getRecentVideos(4),
    tmdbGet<TmdbList>("/tv/on_the_air"),
    tmdbGet<TmdbList>("/movie/now_playing", { region: tmdb.region }),
    tmdbGet<TmdbList>("/trending/all/day"),
    getGenreMaps(),
  ]);
  const ok = recent !== null && airing.ok && playing.ok && trending.ok;

  type Item = Omit<AppNotification, "id" | "unread"> & { onSite?: boolean };
  const added = recent?.length ? await getTitlesByIds(recent.map((v) => v.titleId)) : {};
  const onSite: Item[] = (recent ?? []).flatMap((v) => {
    const title = added[v.titleId];
    if (!title) return [];
    const ep = v.season ? `S${v.season}:E${v.episode}` : "";
    return [
      ep
        ? { title, label: "New Episode", detail: `${ep} is now streaming on CineYellow`, time: shortDate(v.updatedAt), onSite: true }
        : { title, label: "Now Available", detail: "Now streaming on CineYellow", time: shortDate(v.updatedAt), onSite: true },
    ];
  });

  const shows = airing.ok ? listToTitles(airing.data, genres.tv, "tv").slice(0, 2) : [];
  const movies = playing.ok ? listToTitles(playing.data, genres.movie, "movie").slice(0, 1) : [];
  const top = trending.ok ? listToTitles(trending.data, genres.all).slice(0, 1) : [];
  const news: Item[] = [
    ...shows.map((title) => ({ title, label: "Airing Now", detail: "New episodes this week", time: "This week" })),
    ...movies.map((title) => ({ title, label: "In Cinemas", detail: "Now playing in cinemas", time: "This week" })),
    ...top.map((title) => ({ title, label: "Trending", detail: "Popular around the world today", time: "Today" })),
  ];

  setCacheLife(ok ? "hours" : "minutes");
  const seen = new Set<string>();
  return [...onSite, ...news]
    .filter((n) => !seen.has(n.title.id) && seen.add(n.title.id))
    .map(({ onSite: isNew, ...n }, i) => ({ ...n, id: `n${i + 1}-${n.title.id}`, unread: Boolean(isNew) || i < 2 }));
}

/** "Top picks" on the empty search page and the landing page. */
export async function getTopPicks(limit = 12): Promise<Title[]> {
  "use cache";
  const [res, genres] = await Promise.all([tmdbGet<TmdbList>("/trending/all/week"), getGenreMaps()]);
  setCacheLife(res.ok ? "hours" : "minutes");
  return res.ok ? listToTitles(res.data, genres.all).slice(0, limit) : [];
}

/** Poster URLs for the tilted collage behind the landing and sign-in pages. */
export async function getPosterWall(): Promise<string[]> {
  "use cache";
  const [p1, p2, genres] = await Promise.all([
    tmdbGet<TmdbList>("/movie/popular", { page: 1 }),
    tmdbGet<TmdbList>("/tv/popular", { page: 1 }),
    getGenreMaps(),
  ]);
  setCacheLife(p1.ok && p2.ok ? "days" : "minutes");
  const movies = p1.ok ? listToTitles(p1.data, genres.movie, "movie") : [];
  const shows = p2.ok ? listToTitles(p2.data, genres.tv, "tv") : [];
  const mixed = movies.flatMap((m, i) => (shows[i] ? [m, shows[i]] : [m]));
  return dedupeTitles(mixed)
    .map((t) => t.poster)
    .filter((src) => !src.endsWith(".svg"))
    .slice(0, 40);
}

/**
 * Ids prerendered at build time (with cacheComponents, generateStaticParams must return at least
 * one). Everything else renders on its first visit. The fallback id 404s cleanly without TMDB.
 */
export async function getPrerenderIds(limit: number): Promise<string[]> {
  "use cache";
  const [res, genres] = await Promise.all([tmdbGet<TmdbList>("/trending/all/day"), getGenreMaps()]);
  setCacheLife(res.ok ? "hours" : "minutes");
  const ids = res.ok ? listToTitles(res.data, genres.all).slice(0, limit).map((t) => t.id) : [];
  return ids.length ? ids : ["movie-550"];
}
