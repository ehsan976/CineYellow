// Watch history for Resume + Continue Watching, persisted in localStorage.
// Same external-store shape as lib/my-list-store.js (for useSyncExternalStore).
import type { HistoryEntry, Listener } from "@/lib/types";

/** Watch history keyed by playback key ("title" or "title:s1e3"). */
export type History = Record<string, HistoryEntry>;


const KEY = "cineyellow:watch-history";
const EMPTY: History = Object.freeze({});
const listeners = new Set<Listener>();
let cache: History | null = null;

function load(): History {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(next: History) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — keep the in-memory copy.
  }
  listeners.forEach((listener) => listener());
}

export function getHistory(): History {
  if (cache === null) cache = load();
  return cache;
}

export function getServerHistory(): History {
  return EMPTY;
}

export function subscribeHistory(listener: Listener) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Saved entry for one playback key (`title` or `title:s1e3`), or undefined. */
export function getProgress(key: string): HistoryEntry | undefined {
  return getHistory()[key];
}

/** Record the position for one playback key. Finished items (>95%) are dropped. */
export function saveProgress({ key, titleId, season, episode, time, duration }: Omit<HistoryEntry, "updatedAt">) {
  if (!key || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;
  const history = { ...getHistory() };
  if (time / duration > 0.95) {
    delete history[key];
  } else {
    history[key] = { key, titleId, season, episode, time: Math.round(time), duration: Math.round(duration), updatedAt: Date.now() };
  }
  persist(history);
}

export function clearProgress(key: string) {
  const history = { ...getHistory() };
  delete history[key];
  persist(history);
}

/** Forget everything (Settings → Clear watch history). */
export function clearHistory() {
  persist({});
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
