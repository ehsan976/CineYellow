// Homepage rows, the hero carousel, navbar notifications and the poster collage, from TMDB.
import type { AppNotification, FeaturedItem, Row, RowItem, Title } from "@/lib/types";
import type { TmdbList } from "@/lib/tmdb/types";
import { cacheTag } from "next/cache";

import { setCacheLife } from "@/lib/tmdb/cache";
import { tmdbGet } from "@/lib/tmdb/client";
import { tmdb } from "@/lib/tmdb/config";
import { getGenreMaps, getTitleDetails, listToTitles } from "@/lib/tmdb/catalog";
import { dedupeTitles } from "@/lib/tmdb/map";
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

const recent = (i: number) => (i < 3 ? { badge: "Recently added" } : {});
const newEpisode = (i: number) => (i < 2 ? { badge: "New Episode", watchNow: true } : {});

const TOP: RowSpec[] = [
  { id: "new", title: "New on CineYellow", href: "/movies", path: "/movie/now_playing", media: "movie", params: { region: tmdb.region }, badge: recent },
  { id: "new-episodes", title: "New Episodes", href: "/series", path: "/tv/on_the_air", media: "tv", badge: newEpisode },
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
    params: { with_genres: 16, with_original_language: "ja", sort_by: "popularity.desc" },
    badge: (i) => (i < 2 ? { badge: "New Episode", watchNow: true } : {}),
  },
];

export interface HomePage {
  featured: FeaturedItem[];
  topRows: Row[];
  trendingRows: Row[];
  moreRows: Row[];
}

async function loadRow(spec: RowSpec): Promise<Row | null> {
  const [res, genres] = await Promise.all([tmdbGet<TmdbList>(spec.path, { include_adult: false, ...spec.params }), getGenreMaps()]);
  if (!res.ok) return null;
  const map = spec.media === "movie" ? genres.movie : spec.media === "tv" ? genres.tv : genres.all;
  const titles = listToTitles(res.data, map, spec.media).slice(0, spec.limit ?? 12);
  if (!titles.length) return null;
  return { id: spec.id, title: spec.title, href: spec.href, items: titles.map((title, i) => ({ title, ...spec.badge?.(i) })) };
}

const tagline = (fromTmdb: string | undefined, title: Title) => {
  if (fromTmdb) return fromTmdb;
  const text = title.description;
  return text.length > 140 ? `${text.slice(0, 137).trimEnd()}…` : text;
};

export async function getHomePage(): Promise<HomePage> {
  "use cache";
  cacheTag("tmdb:home");
  const [top, trending, more, featuredList, genres] = await Promise.all([
    Promise.all(TOP.map(loadRow)),
    Promise.all(TRENDING.map(loadRow)),
    Promise.all(MORE.map(loadRow)),
    tmdbGet<TmdbList>("/trending/all/day"),
    getGenreMaps(),
  ]);

  const candidates = featuredList.ok
    ? listToTitles(featuredList.data, genres.all).filter((t) => !t.imageId.endsWith(".svg")).slice(0, 5)
    : [];
  const details = await Promise.all(candidates.map((t) => getTitleDetails(t.id)));
  const featured: FeaturedItem[] = candidates.map((summary, i) => {
    const title = details[i]?.title ?? summary;
    return { title, tagline: tagline(details[i]?.tagline, title) };
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

/** The navbar bell: what's new this week. */
export async function getNotifications(): Promise<AppNotification[]> {
  "use cache";
  const [airing, playing, trending, genres] = await Promise.all([
    tmdbGet<TmdbList>("/tv/on_the_air"),
    tmdbGet<TmdbList>("/movie/now_playing", { region: tmdb.region }),
    tmdbGet<TmdbList>("/trending/all/day"),
    getGenreMaps(),
  ]);
  setCacheLife(airing.ok && playing.ok && trending.ok ? "hours" : "minutes");

  const shows = airing.ok ? listToTitles(airing.data, genres.tv, "tv").slice(0, 3) : [];
  const movies = playing.ok ? listToTitles(playing.data, genres.movie, "movie").slice(0, 2) : [];
  const top = trending.ok ? listToTitles(trending.data, genres.all).slice(0, 1) : [];
  const times = ["2h ago", "5h ago", "Yesterday", "2 days ago", "3 days ago", "4 days ago"];

  const items: Omit<AppNotification, "id" | "time" | "unread">[] = [
    ...shows.map((title) => ({ title, label: "New Episode", detail: "A new episode is out now" })),
    ...movies.map((title) => ({ title, label: "Now Available", detail: "Now streaming on CineYellow" })),
    ...top.map((title) => ({ title, label: "Trending", detail: "#1 on CineYellow today" })),
  ];
  const seen = new Set<string>();
  return items
    .filter((n) => !seen.has(n.title.id) && seen.add(n.title.id))
    .map((n, i) => ({ ...n, id: `n${i + 1}`, time: times[i] ?? "This week", unread: i < 3 }));
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
