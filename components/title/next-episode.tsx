"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** "Sat, 29 Nov, 9:30 pm (in 3 days)" in the viewer's own timezone. */
function airingLabel(airingAt: number): string {
  const when = new Date(airingAt * 1000);
  const date = when.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const days = Math.round((when.getTime() - Date.now()) / 86_400_000);
  const rel = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (days !== 0) return `${date} (${rel.format(days, "day")})`;
  const hours = Math.round((when.getTime() - Date.now()) / 3_600_000);
  return `${date} (${rel.format(hours, "hour")})`;
}

/**
 * The next episode's airing time. The server doesn't know the viewer's timezone, so the date is
 * only filled in on the client (the server renders the episode number alone).
 */
export function NextEpisode({ number, airingAt }: { number: number; airingAt: number }) {
  const label = useSyncExternalStore(noop, () => airingLabel(airingAt), () => null);
  return (
    <span>
      Episode {number}
      {label && <time dateTime={new Date(airingAt * 1000).toISOString()}> · {label}</time>}
    </span>
  );
}
