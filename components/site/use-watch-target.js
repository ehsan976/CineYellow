"use client";

import { useSyncExternalStore } from "react";

import { watchHref } from "@/lib/playback";
import { getHistory, getServerHistory, recentByTitle, subscribeHistory } from "@/lib/watch-history-store";

/** Reactive watch history (empty during prerender/hydration). */
export function useWatchHistory() {
  return useSyncExternalStore(subscribeHistory, getHistory, getServerHistory);
}

/**
 * Where "Play" should go for a title: resume the last episode/position if there is one,
 * otherwise start at the beginning (S1:E1 for series).
 */
export function useWatchTarget(title) {
  const history = useWatchHistory();
  const last = recentByTitle(history).find((entry) => entry.titleId === title.id);

  if (last) {
    const episodeLabel = last.season ? ` S${last.season}:E${last.episode}` : "";
    return { href: watchHref(title.id, last.season, last.episode), label: `Resume${episodeLabel}`, resume: true };
  }
  if (title.type === "movie") return { href: watchHref(title.id), label: "Play", resume: false };
  return { href: watchHref(title.id, 1, 1), label: "Play", resume: false };
}
