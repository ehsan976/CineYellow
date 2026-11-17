// What to play for a title/episode, and where "next" goes.
import { getEpisodes } from "@/lib/data/catalog";
import type { Playback, Title } from "@/lib/types";

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

/**
 * Resolve what plays for `title` at season `s`, episode `e` (both optional, 1-based).
 * Movies ignore s/e. Episodes roll over to the next season at the end of a season.
 */
export function getPlayback(title: Title, s?: string | string[], e?: string | string[]): Playback {
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

  const season = clampInt(s, 1, title.seasons, 1);
  const episodes = getEpisodes(title, season);
  const number = clampInt(e, 1, episodes.length, 1);
  const current = episodes[number - 1];

  let next = null;
  if (number < episodes.length) {
    next = { season, episode: number + 1, data: episodes[number] };
  } else if (season < title.seasons) {
    next = { season: season + 1, episode: 1, data: getEpisodes(title, season + 1)[0] };
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
