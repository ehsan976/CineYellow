// What to play for a title/episode, and where "next" goes.
// Client components import watchHref from here, so this file must stay free of server imports:
// the episode list is passed in by the watch page (TMDB, lib/tmdb/catalog.ts getEpisodes).
import type { Episode, Playback, SkipTimes, Title, VideoSource } from "@/lib/types";

// The only free stream found with multiple qualities, audio languages AND subtitle
// languages (Video.js's own docs demo, hosted by Mux, CORS-enabled). Every title plays it.
const MUX_ID = "s41JYeqIpBMBzE4OzxDyGR2yrp2hD1CQ6gJN9SlVGDQ";
export const DEMO_STREAM = {
  src: `https://stream.mux.com/${MUX_ID}.m3u8`,
  storyboard: `https://image.mux.com/${MUX_ID}/storyboard.vtt`,
  thumbnail: (seconds: number) => `https://image.mux.com/${MUX_ID}/thumbnail.webp?time=${seconds}&width=640`,
  credit: "Demo video: Tears of Steel · Blender Foundation · CC BY 3.0",
};

// Real markers in Tears of Steel: opening title cards end ~0:24, end credits start ~9:40.
export const INTRO = { start: 2, end: 24 };
export const CREDITS_AT = 580; // when the "Next episode" card appears

export function watchHref(id: string, season?: number | null, episode?: number | null): string {
  return season ? `/watch/${id}?s=${season}&e=${episode}` : `/watch/${id}`;
}

function clampInt(value: string | string[] | number | undefined, min: number, max: number, fallback: number): number {
  // ?s=1&s=2 arrives as an array — use the first value
  const n = Number.parseInt(String(Array.isArray(value) ? value[0] : value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Loads one season's episodes (the watch page passes TMDB's getEpisodes). */
export type EpisodeLoader = (title: Title, season: number) => Promise<Episode[]>;

/** Used when TMDB has no episode list for a season, so the player always has something to show. */
function placeholderEpisode(title: Title, season: number): Episode {
  return {
    id: `${title.id}-s${season}e1`,
    number: 1,
    name: "Episode 1",
    runtime: "",
    image: title.image,
    summary: title.description,
  };
}

/**
 * Resolve what plays for `title` at season `s`, episode `e` (both optional, 1-based).
 * Movies ignore s/e. Episodes roll over to the next season at the end of a season.
 */
export async function getPlayback(
  title: Title,
  s: string | string[] | undefined,
  e: string | string[] | undefined,
  loadEpisodes: EpisodeLoader
): Promise<Playback> {
  const base = {
    titleId: title.id,
    src: DEMO_STREAM.src,
    storyboard: DEMO_STREAM.storyboard,
    poster: DEMO_STREAM.thumbnail(62),
    credit: DEMO_STREAM.credit,
    intro: INTRO,
    creditsAt: CREDITS_AT,
  };

  if (title.type === "movie") {
    return { ...base, key: title.id, season: null, episode: null, label: null, episodes: [], next: null };
  }

  const seasons = Math.max(1, title.seasons ?? 1);
  const season = clampInt(s, 1, seasons, 1);
  const loaded = await loadEpisodes(title, season);
  const episodes = loaded.length ? loaded : [placeholderEpisode(title, season)];
  // Episodes carry TMDB's own numbers (they may start above 1 or skip one): find by number, and
  // fall back to the season's first episode for an unknown one.
  const requested = clampInt(e, 1, 100_000, episodes[0].number);
  const index = Math.max(0, episodes.findIndex((ep) => ep.number === requested));
  const current = episodes[index];
  const number = current.number;

  let next = null;
  if (index < episodes.length - 1) {
    next = { season, episode: episodes[index + 1].number, data: episodes[index + 1] };
  } else if (season < seasons) {
    const following = await loadEpisodes(title, season + 1);
    // An upcoming season with nothing aired yet has no next episode.
    if (following.length) next = { season: season + 1, episode: following[0].number, data: following[0] };
  }

  return {
    ...base,
    key: `${title.id}:s${season}e${number}`,
    season,
    episode: number,
    current,
    label: `S${season}:E${number} · ${current.name}`,
    episodes,
    next: next && { ...next, href: watchHref(title.id, next.season, next.episode) },
  };
}

/** Far past any real video: the "Next episode" card then only appears when the video ends. */
export const NO_CREDITS_MARK = 1e7;
export const NO_INTRO = { start: 0, end: 0 };

/**
 * Swap the demo stream for an admin-added HLS link (lib/server/video-sources.ts). The Playback
 * shape stays the same, so the player itself doesn't change. Intro and credits markers come from
 * the link's settings, else from AniSkip (`auto`, anime only; the player checks they fit the
 * video); without either there is no "Skip Intro" and no early "Next episode" card.
 */
export function withVideoSource(playback: Playback, source: VideoSource | null, title: Title, auto: SkipTimes | null = null): Playback {
  if (!source || source.kind !== "hls") return playback;
  const hasIntro = source.introStart !== null && source.introEnd !== null && source.introEnd > source.introStart;
  const autoIntro = !hasIntro ? auto?.intro : null;
  const autoCredits = source.creditsAt === null ? auto?.credits : null;
  return {
    ...playback,
    src: source.url,
    storyboard: "/no-thumbnails.vtt",
    poster: playback.current?.image || title.backdrop,
    credit: "",
    intro: hasIntro ? { start: source.introStart, end: source.introEnd } : autoIntro ? { start: autoIntro.start, end: autoIntro.end } : NO_INTRO,
    introLength: autoIntro?.length ?? null,
    creditsAt: source.creditsAt ?? autoCredits?.at ?? NO_CREDITS_MARK,
    creditsLength: autoCredits?.length ?? null,
    subtitles: source.subtitles,
  };
}
