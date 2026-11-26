// Release reminders for titles in My List (the bell): what's new or coming soon. Safe to import
// anywhere; the dates come from /api/catalog/releases (lib/tmdb/catalog.ts getReleaseInfo).

export interface EpisodeRef {
  season: number;
  episode: number;
  /** "2026-11-29" (TMDB gives no time of day). */
  airDate: string;
}

export interface ReleaseInfo {
  id: string;
  media: "movie" | "tv";
  /** Movies: first release, "2026-12-12". */
  releaseDate: string | null;
  /** Shows: newest aired episode and the next one with a date. */
  lastEpisode: EpisodeRef | null;
  nextEpisode: EpisodeRef | null;
}

export interface ReleaseNotice {
  label: "New Episode" | "Coming Soon" | "Out Now";
  detail: string;
  time: string;
  /** Changes with each episode/date, so a new one shows as unread again. */
  readKey: string;
}

/** Windows (days) for each kind of notice. */
export const RELEASE_WINDOWS = { newEpisode: 7, nextEpisode: 14, upcomingMovie: 60, newMovie: 14 };

const DAY = 86_400_000;
const isDate = (s: string | null | undefined): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY;

/** "29 Nov" (or "Sat, 29 Nov" with the weekday). Built from the date parts, so no timezone shift. */
function shortDate(iso: string, weekday = false) {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC", ...(weekday ? { weekday: "short" } : {}) });
}

function relative(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

/**
 * The notice for one title on `today` ("2026-11-26", the viewer's local date), or null when
 * nothing is new or close. A show with both a fresh episode and the next one soon gets the fresh one.
 */
export function releaseNotice(info: ReleaseInfo, today: string): ReleaseNotice | null {
  const now = dayNumber(today);
  const daysFrom = (iso: string) => dayNumber(iso) - now;

  if (info.media === "tv") {
    const last = info.lastEpisode;
    if (last && isDate(last.airDate)) {
      const d = daysFrom(last.airDate);
      if (d <= 0 && d >= -RELEASE_WINDOWS.newEpisode) {
        return {
          label: "New Episode",
          detail: `S${last.season}:E${last.episode} is out · from My List`,
          time: relative(d),
          readKey: `release:${info.id}:s${last.season}e${last.episode}`,
        };
      }
    }
    const next = info.nextEpisode;
    if (next && isDate(next.airDate)) {
      const d = daysFrom(next.airDate);
      if (d >= 0 && d <= RELEASE_WINDOWS.nextEpisode) {
        return {
          label: "Coming Soon",
          detail: `S${next.season}:E${next.episode} airs ${shortDate(next.airDate, true)} · from My List`,
          time: relative(d),
          readKey: `release:${info.id}:next:s${next.season}e${next.episode}`,
        };
      }
    }
    return null;
  }

  if (!isDate(info.releaseDate)) return null;
  const d = daysFrom(info.releaseDate);
  if (d > 0 && d <= RELEASE_WINDOWS.upcomingMovie) {
    return {
      label: "Coming Soon",
      detail: `Releases ${shortDate(info.releaseDate)} · from My List`,
      time: relative(d),
      readKey: `release:${info.id}:soon:${info.releaseDate}`,
    };
  }
  if (d <= 0 && d >= -RELEASE_WINDOWS.newMovie) {
    return {
      label: "Out Now",
      detail: `Released ${shortDate(info.releaseDate)} · from My List`,
      time: relative(d),
      readKey: `release:${info.id}:out:${info.releaseDate}`,
    };
  }
  return null;
}

/** The viewer's local date as "YYYY-MM-DD". */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
