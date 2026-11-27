// Embed streaming providers used across open-source streaming applications
// (TheARCreactorGUY/Euthopiar, wisnuwirayuda15/cinextma, X-TechPro/NullFlix,
// kiduyu-klaus/KiduyuTv_final, Spyou/Zangetsu, shreejaybhay/streamvault,
// LuckDay21/miru-web, keplerking100/TatakaiAPI, sulvii/elyzen, sablekunal/watchthismovie).

import type { ServerHealthStatus, ServerLanguage, WatchOption } from "@/lib/types";
import { parseTitleId } from "@/lib/titles";

/** Number of consecutive check failures before an embed server is auto-skipped. */
export const EMBED_FAILS_TO_SKIP = 3;
/** Distinct user broken reports before an embed server is auto-demoted. */
export const EMBED_REPORTS_TO_DEMOTE = 3;

export interface EmbedProvider {
  id: string;
  name: string;
  badge?: string;
  language: ServerLanguage;
  /** Ordered backup provider ids (within EMBED_PROVIDERS) used when this host is down. */
  mirrors?: string[];
  getMovieUrl: (tmdbId: number | string, imdbId?: string | null) => string;
  getTvUrl: (tmdbId: number | string, season: number, episode: number, imdbId?: string | null) => string;
}

export interface EmbedServerRuntimeState {
  enabled: boolean;
  priority: number;
  status: ServerHealthStatus;
  latencyMs: number | null;
  failCount: number;
  reportCount: number;
}

export const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    id: "vidrift",
    name: "VidRift",
    badge: "Server 1 · Default",
    language: "english",
    mirrors: ["vidlink"],
    getMovieUrl: (id) => `https://embed.vidrift.net/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.vidrift.net/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidlink",
    name: "VidLink (Fast HD)",
    badge: "Recommended",
    language: "english",
    mirrors: ["vidrift"],
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}?autoplay=false`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=false`,
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
    id: "vidsrc-to",
    name: "VidSrc.to",
    badge: "Multi-Source",
    language: "english",
    mirrors: ["vidsrc-sh", "vidsrc-su"],
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidsrc-su",
    name: "VidSrc.su",
    badge: "Fast",
    language: "english",
    mirrors: ["vidsrc-sh", "vidsrc-to"],
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "autoembed-me",
    name: "AutoEmbed.me",
    badge: "Auto-Failover",
    language: "english",
    mirrors: ["2embed"],
    getMovieUrl: (id) => `https://autoembed.me/movie/tmdb/${id}`,
    getTvUrl: (id, s, e) => `https://autoembed.me/tv/tmdb/${id}-${s}-${e}`,
  },
  {
    id: "multiembed",
    name: "MultiEmbed",
    badge: "Aggregator",
    language: "english",
    mirrors: ["smashystream"],
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },
  {
    id: "smashystream",
    name: "SmashyStream",
    badge: "Multi-Source",
    language: "english",
    mirrors: ["multiembed"],
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    id: "2embed",
    name: "2Embed",
    badge: "Classic",
    language: "english",
    mirrors: ["autoembed-me"],
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
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
    badge: "Multi",
    language: "english",
    getMovieUrl: (id) => `https://frembed.pro/api/film.php?id=${id}`,
    getTvUrl: (id, s, e) => `https://frembed.pro/api/serie.php?id=${id}&sa=${s}&epi=${e}`,
  },
  {
    id: "vidsrc-sh",
    name: "VidSrc.sh",
    badge: "Official",
    language: "english",
    mirrors: ["vidsrc-to", "vidsrc-su"],
    getMovieUrl: (id) => `https://vidsrc.sh/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.sh/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "viduki",
    name: "Viduki",
    badge: "Fast",
    language: "english",
    mirrors: ["embed-api-stream"],
    getMovieUrl: (id) => `https://www.viduki.net/1/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.viduki.net/1/tv/${id}/${s}/${e}`,
  },
  {
    id: "embed-api-stream",
    name: "Embed API Stream",
    badge: "HD",
    language: "english",
    mirrors: ["viduki"],
    getMovieUrl: (id) => `https://watch.embed-api.stream/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://watch.embed-api.stream/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: "vidzee-hindi",
    name: "VidZee",
    badge: "Hindi",
    language: "hindi",
    mirrors: ["smashystream-hindi"],
    getMovieUrl: (id) => `https://player.vidzee.wtf/embed/movie/${id}?sr=6`,
    getTvUrl: (id, s, e) => `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}?sr=6`,
  },
  {
    id: "smashystream-hindi",
    name: "SmashyStream",
    badge: "Hindi",
    language: "hindi",
    mirrors: ["vidzee-hindi"],
    getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}&server=hindi`,
    getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}&server=hindi`,
  },
];

export const defaultProviderPriority = (index: number) => (index + 1) * 10;

const isUnavailable = (state?: EmbedServerRuntimeState) =>
  Boolean(state && (state.status === "down" || state.failCount >= EMBED_FAILS_TO_SKIP));

/**
 * Builds WatchOption entries for enabled embed providers, applying admin priorities,
 * smart auto-skip sorting (demoting broken/reported servers), and mirror fallback when down.
 */
export function getEmbedWatchOptions({
  titleId,
  season,
  episode,
  imdbId,
  states,
}: {
  titleId: string;
  season?: number | null;
  episode?: number | null;
  imdbId?: string | null;
  states?: Record<string, EmbedServerRuntimeState>;
}): WatchOption[] {
  const parsed = parseTitleId(titleId);
  const media = parsed?.media ?? (season ? "tv" : "movie");
  const tmdbId = parsed?.tmdbId ?? titleId;
  const s = Math.max(1, season ?? 1);
  const e = Math.max(1, episode ?? 1);

  const byId = new Map(EMBED_PROVIDERS.map((p) => [p.id, p]));
  const urlFor = (p: EmbedProvider) =>
    media === "movie" ? p.getMovieUrl(tmdbId, imdbId) : p.getTvUrl(tmdbId, s, e, imdbId);

  const activeEntries = EMBED_PROVIDERS.map((provider, idx) => {
    const state = states?.[provider.id];
    if (state && !state.enabled) return null;

    let activeProvider = provider;
    let activeState = state;
    let fallbackFrom: string | undefined;

    // Mirror fallback: if this server is down / auto-skipped, route to its first healthy enabled mirror.
    if (isUnavailable(state) && provider.mirrors?.length) {
      for (const mirrorId of provider.mirrors) {
        const mirror = byId.get(mirrorId);
        const mirrorState = states?.[mirrorId];
        if (!mirror) continue;
        if (mirrorState && !mirrorState.enabled) continue;
        if (isUnavailable(mirrorState)) continue;
        activeProvider = mirror;
        activeState = mirrorState;
        fallbackFrom = provider.name;
        break;
      }
    }

    const down = isUnavailable(activeState);
    const demoted = (state?.reportCount ?? 0) >= EMBED_REPORTS_TO_DEMOTE;
    const priority = state?.priority ?? defaultProviderPriority(idx);

    return {
      orderRank: down ? 2 : demoted ? 1 : 0,
      priority,
      defaultIndex: idx,
      option: {
        id: `embed-${provider.id}`,
        kind: "embed" as const,
        name: fallbackFrom
          ? `${provider.name} (Mirror: ${activeProvider.name})`
          : `${provider.name}${provider.badge ? ` (${provider.badge})` : ""}`,
        providerId: provider.id,
        language: provider.language,
        health: activeState
          ? {
              status: activeState.status,
              latencyMs: activeState.latencyMs,
              reportCount: state?.reportCount ?? 0,
              ...(fallbackFrom ? { fallbackFrom } : {}),
            }
          : undefined,
        embedUrl: urlFor(activeProvider),
      } satisfies WatchOption,
    };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  // Healthy servers come first (by admin priority, then default order), followed by user-reported,
  // and down/auto-skipped servers at the bottom.
  activeEntries.sort((a, b) => a.orderRank - b.orderRank || a.priority - b.priority || a.defaultIndex - b.defaultIndex);

  return activeEntries.map((e) => e.option);
}
