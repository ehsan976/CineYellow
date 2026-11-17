// Player preferences shared by the player (components/player/preferences.jsx) and /settings.
// Shape: { volume, muted, rate, audioLanguage, subtitleLanguage ("off" | code), quality }.
import type { Listener, PlayerPrefs, QualityPreference } from "@/lib/types";


const KEY = "cineyellow:player-prefs";
const EMPTY: PlayerPrefs = Object.freeze({});
const listeners = new Set<Listener>();
let cache: PlayerPrefs | null = null;

export function readPlayerPrefs(): PlayerPrefs {
  if (cache === null) {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
      cache = value && typeof value === "object" ? value : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

export function getServerPlayerPrefs(): PlayerPrefs {
  return EMPTY;
}

/** Replace all preferences. */
export function writePlayerPrefs(prefs: PlayerPrefs) {
  cache = prefs;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable; keep it in memory.
  }
  listeners.forEach((listener) => listener());
}

/** Merge a patch; `undefined` values remove a key. */
export function updatePlayerPrefs(patch: Partial<PlayerPrefs>) {
  const next = { ...readPlayerPrefs(), ...patch };
  for (const [key, value] of Object.entries(next)) if (value === undefined) delete next[key];
  writePlayerPrefs(next);
}

export function subscribePlayerPrefs(listener: Listener) {
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

/** Video quality preference → hls.js source options (see Video.js "Media sources"). */
export const qualityOptions: Record<QualityPreference, { label: string; hint: string; source: Record<string, unknown> }> = {
  auto: { label: "Auto (recommended)", hint: "Adjusts to your connection and screen", source: {} },
  saver: { label: "Data saver", hint: "Up to 480p", source: { maxAutoResolution: "480p" } },
  standard: { label: "Standard", hint: "Up to 720p", source: { maxAutoResolution: "720p" } },
  high: { label: "High", hint: "Best available, up to 4K", source: { capRenditionToPlayerSize: false } },
};
