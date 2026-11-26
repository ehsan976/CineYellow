// Embed streaming providers used across open-source streaming applications
// (TheARCreactorGUY/Euthopiar, wisnuwirayuda15/cinextma, X-TechPro/NullFlix,
// kiduyu-klaus/KiduyuTv_final, Spyou/Zangetsu, shreejaybhay/streamvault,
// LuckDay21/miru-web, keplerking100/TatakaiAPI, sulvii/elyzen, sablekunal/watchthismovie).

import type { ServerLanguage, WatchOption } from "@/lib/types";
import { parseTitleId } from "@/lib/titles";

export interface EmbedProvider {
  id: string;
  name: string;
  badge?: string;
  language: ServerLanguage;
  getMovieUrl: (tmdbId: number | string, imdbId?: string | null) => string;
  getTvUrl: (tmdbId: number | string, season: number, episode: number, imdbId?: string | null) => string;
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    id: "vidrift",
    name: "VidRift",
    badge: "Server 1 · Default",
    language: "english",
    getMovieUrl: (id) => `https://embed.vidrift.net/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.vidrift.net/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidlink",
    name: "VidLink (Fast HD)",
    badge: "Recommended",
    language: "english",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?autoplay=false`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=false`,
  },
  {
    id: "embed-su",
    name: "Embed.su",
    badge: "Fast",
    language: "english",
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "cinesrc",
    name: "CineSrc",
    badge: "HD",
    language: "english",
    getMovieUrl: (id) => `https://cinesrc.st/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://cinesrc.st/embed/tv/${id}?s=${s}&e=${e}`,
  },
  {
    id: "vidsrc-cc",
    name: "VidSrc.cc (v2)",
    badge: "Popular",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-to",
    name: "VidSrc.to",
    badge: "Multi-Source",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-xyz",
    name: "VidSrc.xyz",
    badge: "Mirror",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-net",
    name: "VidSrc.net",
    badge: "Mirror 2",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.net/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.net/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-vip",
    name: "VidSrc.vip",
    badge: "Fast",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.vip/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.vip/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-su",
    name: "VidSrc.su",
    badge: "Server 8",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-in",
    name: "VidSrc.in",
    badge: "Mirror 3",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.in/embed/movie?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.in/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "autoembed",
    name: "AutoEmbed",
    badge: "Auto-Failover",
    language: "english",
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "autoembed-me",
    name: "AutoEmbed.me",
    badge: "Server 11",
    language: "english",
    getMovieUrl: (id) => `https://autoembed.me/movie/tmdb/${id}`,
    getTvUrl: (id, s, e) => `https://autoembed.me/tv/tmdb/${id}-${s}-${e}`,
  },
  {
    id: "multiembed",
    name: "MultiEmbed",
    badge: "Aggregator",
    language: "english",
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: "smashystream",
    name: "SmashyStream",
    badge: "Multi-Source",
    language: "english",
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "2embed",
    name: "2Embed",
    badge: "Classic",
    language: "english",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    id: "videasy",
    name: "Videasy",
    badge: "Clean",
    language: "english",
    getMovieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
  },
  {
    id: "moviesapi",
    name: "MoviesAPI",
    badge: "Mirror 4",
    language: "english",
    getMovieUrl: (id) => `https://moviesapi.club/movie/${id}`,
    getTvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}`,
  },
  {
    id: "rivestream",
    name: "RiveStream",
    badge: "Fast",
    language: "english",
    getMovieUrl: (id) => `https://rivestream.live/embed?type=movie&id=${id}`,
    getTvUrl: (id, s, e) => `https://rivestream.live/embed?type=series&id=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "111movies",
    name: "111Movies",
    badge: "Server 18",
    language: "english",
    getMovieUrl: (id) => `https://111movies.com/movie/${id}`,
    getTvUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}`,
  },
  {
    id: "nontongo",
    name: "NontonGo",
    badge: "Asian",
    language: "english",
    getMovieUrl: (id) => `https://www.nontongo.win/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.nontongo.win/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "frembed",
    name: "Frembed",
    badge: "Server 20",
    language: "english",
    getMovieUrl: (id) => `https://frembed.pro/api/film.php?id=${id}`,
    getTvUrl: (id, s, e) => `https://frembed.pro/api/serie.php?id=${id}&sa=${s}&epi=${e}`,
  },
  {
    id: "vidsrc-icu",
    name: "VidSrc.icu",
    badge: "Server 21",
    language: "english",
    getMovieUrl: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidzee-hindi",
    name: "VidZee",
    badge: "Hindi",
    language: "hindi",
    getMovieUrl: (id) => `https://player.vidzee.wtf/embed/movie/${id}?sr=6`,
    getTvUrl: (id, s, e) => `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}?sr=6`,
  },
  {
    id: "autoembed-hindi",
    name: "AutoEmbed",
    badge: "Hindi",
    language: "hindi",
    getMovieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}?server=hindi`,
    getTvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}?server=hindi`,
  },
  {
    id: "smashystream-hindi",
    name: "SmashyStream",
    badge: "Hindi",
    language: "hindi",
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}&server=hindi`,
    getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}&server=hindi`,
  },
  {
    id: "vidfast-hindi",
    name: "VidFast",
    badge: "Hindi / Multi",
    language: "hindi",
    getMovieUrl: (id) => `https://player.vidfast.pro/movie/${id}?sub=hi`,
    getTvUrl: (id, s, e) => `https://player.vidfast.pro/tv/${id}/${s}/${e}?sub=hi`,
  },
];

/**
 * Builds WatchOption entries for all embed providers for a given title/episode.
 */
export function getEmbedWatchOptions({
  titleId,
  season,
  episode,
  imdbId,
}: {
  titleId: string;
  season?: number | null;
  episode?: number | null;
  imdbId?: string | null;
}): WatchOption[] {
  const parsed = parseTitleId(titleId);
  const media = parsed?.media ?? (season ? "tv" : "movie");
  const tmdbId = parsed?.tmdbId ?? titleId;
  const s = Math.max(1, season ?? 1);
  const e = Math.max(1, episode ?? 1);

  return EMBED_PROVIDERS.map((provider) => {
    const embedUrl =
      media === "movie"
        ? provider.getMovieUrl(tmdbId, imdbId)
        : provider.getTvUrl(tmdbId, s, e, imdbId);

    return {
      id: `embed-${provider.id}`,
      kind: "embed" as const,
      name: `${provider.name}${provider.badge ? ` (${provider.badge})` : ""}`,
      providerId: provider.id,
      language: provider.language,
      embedUrl,
    };
  });
}
