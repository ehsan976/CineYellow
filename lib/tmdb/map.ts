// TMDB responses → the site's Title / Episode shapes (lib/types.ts). Pure functions.
import type { Episode, Title, TitleType, Trailer, WatchProvider, WatchProviders } from "@/lib/types";
import type { TmdbDetails, TmdbEpisode, TmdbListItem, TmdbProvider, TmdbVideo } from "@/lib/tmdb/types";
import { TMDB_IMAGES } from "@/lib/tmdb/config";
import { PLACEHOLDER_LANDSCAPE, PLACEHOLDER_POSTER, makeTitleId, type TmdbMedia } from "@/lib/titles";

export type GenreMap = Record<number, string>;

const ANIMATION = 16;

const img = (size: string, path?: string | null) => (path ? `${TMDB_IMAGES}/${size}${path}` : "");

/** Shorter labels for a few long TMDB genre names. */
export function genreLabel(name: string): string {
  if (name === "Science Fiction") return "Sci-Fi";
  if (name === "TV Movie") return "TV Movie";
  return name;
}

/** Japanese animated TV is "anime". Animated films stay "movie" (the player treats non-movies as seasonal). */
export function titleType(media: TmdbMedia, genreIds: number[], item: Pick<TmdbListItem, "original_language" | "origin_country">): TitleType {
  if (media === "movie") return "movie";
  return isAnime(genreIds, item) ? "anime" : "series";
}

export function isAnime(genreIds: number[], item: Pick<TmdbListItem, "original_language" | "origin_country">): boolean {
  return genreIds.includes(ANIMATION) && (item.original_language === "ja" || Boolean(item.origin_country?.includes("JP")));
}

export function formatRuntime(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

const yearOf = (date?: string) => Number(date?.slice(0, 4)) || 0;
const matchOf = (vote?: number) => Math.round(Math.min(Math.max(vote || 0, 5), 9.9) * 10);

// ---------- Maturity ratings ----------

const RATING_LABELS: Record<string, string> = {
  // India (CBFC)
  U: "All", UA: "13+", "U/A": "13+", "UA 7+": "7+", "UA 13+": "13+", "UA 16+": "16+", A: "18+", S: "18+",
  // US films (MPA)
  G: "All", PG: "7+", "PG-13": "13+", R: "18+", "NC-17": "18+",
  // US TV
  "TV-Y": "All", "TV-G": "All", "TV-Y7": "7+", "TV-PG": "7+", "TV-14": "16+", "TV-MA": "18+",
};

function certificationFor(details: TmdbDetails, region: string): string {
  const pick = (country: string): string => {
    if (details.release_dates?.results) {
      const entry = details.release_dates.results.find((r) => r.iso_3166_1 === country);
      return entry?.release_dates?.find((d) => d.certification?.trim())?.certification?.trim() ?? "";
    }
    return details.content_ratings?.results?.find((r) => r.iso_3166_1 === country)?.rating?.trim() ?? "";
  };
  for (const country of [region, "IN", "US"]) {
    const cert = pick(country);
    if (cert) return cert;
  }
  const any =
    details.release_dates?.results?.flatMap((r) => r.release_dates ?? []).find((d) => d.certification?.trim())?.certification ??
    details.content_ratings?.results?.find((r) => r.rating?.trim())?.rating;
  return any?.trim() ?? "";
}

function ratingLabel(details: TmdbDetails, region: string): string {
  const cert = certificationFor(details, region);
  if (!cert) return details.adult ? "18+" : "NR";
  // India writes the same rating several ways: "UA 13+", "U/A 13+", "UA13+".
  const indian = cert.toUpperCase().replace(/^U\s*\/\s*A/, "UA").replace(/^UA\s*(\d)/, "UA $1");
  return RATING_LABELS[cert] ?? RATING_LABELS[indian] ?? cert;
}

// ---------- Titles ----------

function images(item: Pick<TmdbListItem, "poster_path" | "backdrop_path">) {
  const poster = img("w500", item.poster_path) || img("w500", item.backdrop_path) || PLACEHOLDER_POSTER;
  const image = img("w780", item.backdrop_path) || img("w780", item.poster_path) || PLACEHOLDER_LANDSCAPE;
  const backdrop = img("w1280", item.backdrop_path) || img("w1280", item.poster_path) || PLACEHOLDER_LANDSCAPE;
  return { poster, image, backdrop, imageId: item.backdrop_path || item.poster_path || "" };
}

/** A list result (trending, discover, search…) → summary Title. null for people or image-less items. */
export function toSummaryTitle(item: TmdbListItem, genreMap: GenreMap, fallbackMedia?: TmdbMedia): Title | null {
  const media = (item.media_type ?? fallbackMedia) as TmdbMedia | "person" | undefined;
  if (media !== "movie" && media !== "tv") return null;
  if (!item.poster_path && !item.backdrop_path) return null;
  const genreIds = item.genre_ids ?? [];
  return {
    id: makeTitleId(media, item.id),
    title: item.title || item.name || "Untitled",
    type: titleType(media, genreIds, item),
    genres: genreIds.map((id) => genreMap[id]).filter(Boolean).map(genreLabel),
    year: yearOf(item.release_date || item.first_air_date),
    rating: item.adult ? "18+" : "",
    duration: null,
    seasons: null,
    ...images(item),
    description: item.overview || "No description available.",
    cast: [],
    match: matchOf(item.vote_average),
    popularity: item.popularity ?? 0,
  };
}

/** /movie/{id} or /tv/{id} with credits + ratings appended → full Title. */
export function toFullTitle(media: TmdbMedia, details: TmdbDetails, region: string): Title {
  const genres = details.genres ?? [];
  const genreIds = genres.map((g) => g.id);
  const castList = (media === "movie" ? details.credits?.cast : details.aggregate_credits?.cast ?? details.credits?.cast) ?? [];
  const seasons =
    media === "tv"
      ? Math.max(
          0,
          ...(details.seasons ?? []).filter((s) => s.season_number >= 1 && (s.episode_count ?? 0) > 0).map((s) => s.season_number)
        ) || details.number_of_seasons || 1
      : null;
  return {
    id: makeTitleId(media, details.id),
    title: details.title || details.name || "Untitled",
    type: titleType(media, genreIds, details),
    genres: genres.map((g) => genreLabel(g.name)),
    year: yearOf(details.release_date || details.first_air_date),
    rating: ratingLabel(details, region),
    duration: media === "movie" ? formatRuntime(details.runtime) : null,
    seasons,
    ...images(details),
    description: details.overview || "No description available.",
    cast: castList
      .map((c) => c.name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 6),
    match: matchOf(details.vote_average),
    popularity: details.popularity ?? 0,
  };
}

/** Season episodes, renumbered 1..n in order (the player and episode menu work by position). */
export function toEpisodes(raw: TmdbEpisode[] | undefined, title: Title, season: number): Episode[] {
  return [...(raw ?? [])]
    .sort((a, b) => a.episode_number - b.episode_number)
    .map((ep, i) => {
      const n = i + 1;
      return {
        id: `${title.id}-s${season}e${n}`,
        number: n,
        name: ep.name || `Episode ${n}`,
        runtime: ep.runtime ? `${ep.runtime}m` : "",
        image: img("w300", ep.still_path) || title.image,
        summary: ep.overview || title.description,
      };
    });
}

// ---------- Where to watch ----------

function toProviders(list: TmdbProvider[] | undefined, skip: Set<number> = new Set()): WatchProvider[] {
  const out: WatchProvider[] = [];
  for (const p of [...(list ?? [])].sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))) {
    if (!p.provider_name || !p.logo_path || skip.has(p.provider_id) || out.some((o) => o.id === p.provider_id)) continue;
    out.push({ id: p.provider_id, name: p.provider_name, logo: img("w92", p.logo_path) });
  }
  return out;
}

/** The title's streaming / rent / buy options in `region`; null when TMDB lists none there. */
export function toWatchProviders(details: TmdbDetails, region: string): WatchProviders | null {
  const data = details["watch/providers"]?.results?.[region];
  if (!data?.link) return null;
  const stream = toProviders(data.flatrate);
  const free = toProviders([...(data.free ?? []), ...(data.ads ?? [])], new Set(stream.map((p) => p.id)));
  const rent = toProviders(data.rent);
  const buy = toProviders(data.buy);
  if (!stream.length && !free.length && !rent.length && !buy.length) return null;
  return { link: data.link, region, stream, free, rent, buy };
}

/** Episodes per season, season 1 first (specials / season 0 left out). */
export function toSeasonEpisodeCounts(details: TmdbDetails): number[] {
  const seasons = (details.seasons ?? []).filter((s) => s.season_number >= 1).sort((a, b) => a.season_number - b.season_number);
  const counts: number[] = [];
  for (const s of seasons) counts[s.season_number - 1] = s.episode_count ?? 0;
  return Array.from(counts, (c) => c ?? 0);
}

/** Best YouTube trailer: official trailers first, then teasers; English/Hindi before other languages. */
export function pickTrailer(videos: TmdbVideo[] | undefined): Trailer | null {
  const typeRank = (v: TmdbVideo) => (v.type === "Trailer" ? 0 : v.type === "Teaser" ? 1 : 2);
  const langRank = (v: TmdbVideo) => (v.iso_639_1 === "en" ? 0 : v.iso_639_1 === "hi" ? 1 : 2);
  const best = (videos ?? [])
    .filter((v) => v.site === "YouTube" && /^[\w-]{6,20}$/.test(v.key) && typeRank(v) < 2)
    .sort(
      (a, b) =>
        typeRank(a) - typeRank(b) ||
        Number(Boolean(b.official)) - Number(Boolean(a.official)) ||
        langRank(a) - langRank(b) ||
        (b.published_at ?? "").localeCompare(a.published_at ?? "")
    )[0];
  return best ? { key: best.key, name: best.name || "Trailer" } : null;
}

export function dedupeTitles(list: (Title | null | undefined)[]): Title[] {
  const seen = new Set<string>();
  const out: Title[] = [];
  for (const t of list) {
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}
