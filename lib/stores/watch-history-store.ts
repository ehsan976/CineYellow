// Watch history for Resume + Continue Watching, per profile, stored in Postgres (watch_history)
// via user-data-store. Positions are batched and sent every few seconds.
import type { HistoryEntry } from "@/lib/types";
import {
  EMPTY,
  clearActiveHistory,
  getActiveHistory,
  removeTitleFromActiveHistory,
  setProgress,
  subscribeUserData,
  type History,
} from "@/lib/stores/user-data-store";

export type { History };

export const getHistory = getActiveHistory;

export function getServerHistory(): History {
  return EMPTY.history;
}

export const subscribeHistory = subscribeUserData;

/** Saved entry for one playback key (`title` or `title:s1e3`), or undefined. */
export function getProgress(key: string): HistoryEntry | undefined {
  return getHistory()[key];
}

/** Record the position for one playback key. Finished items (>95%) are dropped. */
export function saveProgress({ key, titleId, season, episode, time, duration }: Omit<HistoryEntry, "updatedAt">) {
  if (!key || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;
  if (time / duration > 0.95) {
    if (getHistory()[key]) setProgress(null, key);
    return;
  }
  setProgress(
    { key, titleId, season, episode, time: Math.round(time), duration: Math.round(duration), updatedAt: Date.now() },
    key
  );
}

/** Forget everything for the active profile (Settings → Clear watch history). */
export function clearHistory() {
  clearActiveHistory();
}

/**
 * Drops one title from Continue Watching (all its episodes' positions). Returns an undo, or null
 * when there was nothing to remove. Doesn't mark it as watched on Trakt.
 */
export function removeFromContinueWatching(titleId: string) {
  return removeTitleFromActiveHistory(titleId);
}

/** Newest entry per title, most recent first. */
export function recentByTitle(history: History = getHistory()): HistoryEntry[] {
  const byTitle = new Map<string, HistoryEntry>();
  for (const entry of Object.values(history)) {
    const prev = byTitle.get(entry.titleId);
    if (!prev || entry.updatedAt > prev.updatedAt) byTitle.set(entry.titleId, entry);
  }
  return [...byTitle.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
