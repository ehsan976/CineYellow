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
  isCustom?: boolean;
  name?: string | null;
  badge?: string | null;
  language?: ServerLanguage | null;
  movieUrlTemplate?: string | null;
  tvUrlTemplate?: string | null;
  mirrors?: string[] | null;
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

export const defaultMovieTemplate = (p: EmbedProvider) => p.getMovieUrl("{id}", "{imdb}");
export const defaultTvTemplate = (p: EmbedProvider) => p.getTvUrl("{id}", "{s}" as unknown as number, "{e}" as unknown as number, "{imdb}");

/**
 * Formats an admin-configured URL template using `{id}` / `{tmdb}`, `{imdb}`, `{s}` / `{season}`, `{e}` / `{episode}`.
 */
export function formatEmbedTemplate(
  template: string,
  params: { tmdbId: number | string; season?: number; episode?: number; imdbId?: string | null }
): string {
  const idVal = encodeURIComponent(String(params.tmdbId));
  const imdbVal = encodeURIComponent(String(params.imdbId ?? params.tmdbId));
  const sVal = String(Math.max(1, params.season ?? 1));
  const eVal = String(Math.max(1, params.episode ?? 1));
  return template
    .replace(/\{(?:id|tmdb)\}/gi, idVal)
    .replace(/\{imdb\}/gi, imdbVal)
    .replace(/\{(?:s|season)\}/gi, sVal)
    .replace(/\{(?:e|episode)\}/gi, eVal);
}

/**
 * Validates an admin URL template (must be https:// and parse cleanly once placeholders are filled).
 */
export function validateEmbedTemplate(
  raw: string,
  { required }: { required: boolean }
): { ok: boolean; value: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return required ? { ok: false, value: "", error: "URL template is required." } : { ok: true, value: "" };
  }
  if (trimmed.length > 500) return { ok: false, value: "", error: "URL template is too long (max 500 chars)." };
  if (!trimmed.startsWith("https://")) return { ok: false, value: "", error: "Use an https:// URL template." };
  const sample = formatEmbedTemplate(trimmed, { tmdbId: 550, season: 1, episode: 1, imdbId: "tt0137523" });
  try {
    const parsed = new URL(sample);
    if (parsed.protocol !== "https:" || !parsed.hostname.includes(".")) {
      return { ok: false, value: "", error: "Enter a valid https:// domain." };
    }
  } catch {
    return { ok: false, value: "", error: "URL template isn't a valid URL." };
  }
  return { ok: true, value: trimmed };
}

export interface ResolvedEmbedProvider {
  id: string;
  isCustom: boolean;
  name: string;
  badge: string;
  language: ServerLanguage;
  mirrors: string[];
  hasTv: boolean;
  defaultIndex: number;
  getMovieUrl: (tmdbId: number | string, imdbId?: string | null) => string;
  getTvUrl: (tmdbId: number | string, season: number, episode: number, imdbId?: string | null) => string;
}

/**
 * Merges built-in `EMBED_PROVIDERS` (with any DB overrides applied) and custom DB servers into one list.
 */
export function resolveEmbedProviders(states?: Record<string, EmbedServerRuntimeState>): ResolvedEmbedProvider[] {
  const builtInIds = new Set<string>();
  const resolved: ResolvedEmbedProvider[] = EMBED_PROVIDERS.map((p, idx) => {
    builtInIds.add(p.id);
    const s = states?.[p.id];
    const movieTpl = s?.movieUrlTemplate?.trim() || null;
    const tvTpl = s?.tvUrlTemplate?.trim() || null;
    return {
      id: p.id,
      isCustom: false,
      name: s?.name?.trim() || p.name,
      badge: s?.badge !== undefined && s.badge !== null ? s.badge : (p.badge ?? ""),
      language: s?.language ?? p.language,
      mirrors: s?.mirrors ?? p.mirrors ?? [],
      hasTv: true,
      defaultIndex: idx,
      getMovieUrl: movieTpl
        ? (id, imdb) => formatEmbedTemplate(movieTpl, { tmdbId: id, imdbId: imdb })
        : p.getMovieUrl,
      getTvUrl: tvTpl
        ? (id, season, episode, imdb) => formatEmbedTemplate(tvTpl, { tmdbId: id, season, episode, imdbId: imdb })
        : p.getTvUrl,
    };
  });

  if (states) {
    let customIdx = EMBED_PROVIDERS.length;
    for (const [id, s] of Object.entries(states)) {
      if (builtInIds.has(id) || !s.isCustom) continue;
      const movieTpl = s.movieUrlTemplate?.trim() ?? "";
      const tvTpl = s.tvUrlTemplate?.trim() ?? "";
      if (!movieTpl && !tvTpl) continue;
      resolved.push({
        id,
        isCustom: true,
        name: s.name?.trim() || id,
        badge: s.badge?.trim() || "Custom",
        language: s.language ?? "english",
        mirrors: s.mirrors ?? [],
        hasTv: Boolean(tvTpl),
        defaultIndex: customIdx++,
        getMovieUrl: (tmdbId, imdb) => formatEmbedTemplate(movieTpl || tvTpl, { tmdbId, imdbId: imdb }),
        getTvUrl: (tmdbId, season, episode, imdb) =>
          tvTpl ? formatEmbedTemplate(tvTpl, { tmdbId, season, episode, imdbId: imdb }) : "",
      });
    }
  }

  return resolved;
}

const isUnavailable = (state?: EmbedServerRuntimeState) =>
  Boolean(state && (state.status === "down" || state.failCount >= EMBED_FAILS_TO_SKIP));

/**
 * Builds WatchOption entries for enabled embed providers (built-in + custom), applying admin
 * priorities, smart auto-skip sorting (demoting broken/reported servers), and mirror fallback when down.
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

  const providers = resolveEmbedProviders(states);
  const byId = new Map(providers.map((p) => [p.id, p]));
  const urlFor = (p: ResolvedEmbedProvider) =>
    media === "movie" ? p.getMovieUrl(tmdbId, imdbId) : p.getTvUrl(tmdbId, s, e, imdbId);

  const activeEntries = providers
    .map((provider) => {
      const state = states?.[provider.id];
      if (state && !state.enabled) return null;
      if (media === "tv" && !provider.hasTv) return null;

      let activeProvider = provider;
      let activeState = state;
      let fallbackFrom: string | undefined;

      // Mirror fallback: if this server is down / auto-skipped, route to its first healthy enabled mirror.
      if (isUnavailable(state) && provider.mirrors.length) {
        for (const mirrorId of provider.mirrors) {
          const mirror = byId.get(mirrorId);
          const mirrorState = states?.[mirrorId];
          if (!mirror) continue;
          if (media === "tv" && !mirror.hasTv) continue;
          if (mirrorState && !mirrorState.enabled) continue;
          if (isUnavailable(mirrorState)) continue;
          activeProvider = mirror;
          activeState = mirrorState;
          fallbackFrom = provider.name;
          break;
        }
      }

      const embedUrl = urlFor(activeProvider);
      if (!embedUrl) return null;

      const down = isUnavailable(activeState);
      const demoted = (state?.reportCount ?? 0) >= EMBED_REPORTS_TO_DEMOTE;
      const priority = state?.priority ?? defaultProviderPriority(provider.defaultIndex);

      return {
        orderRank: down ? 2 : demoted ? 1 : 0,
        priority,
        defaultIndex: provider.defaultIndex,
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
          embedUrl,
        } satisfies WatchOption,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  // Healthy servers come first (by admin priority, then default order), followed by user-reported,
  // and down/auto-skipped servers at the bottom.
  activeEntries.sort((a, b) => a.orderRank - b.orderRank || a.priority - b.priority || a.defaultIndex - b.defaultIndex);

  return activeEntries.map((e) => e.option);
}
