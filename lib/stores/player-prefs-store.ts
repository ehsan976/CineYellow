// Player preferences shared by the player (components/player/preferences.tsx) and /settings.
// Stored per profile in Postgres (profile.player_prefs) via user-data-store; saves are debounced.
// Shape: { volume, muted, rate, audioLanguage, subtitleLanguage ("off" | code), quality }.
import type { PlayerPrefs, QualityPreference } from "@/lib/types";
import { EMPTY, getActivePrefs, setActivePrefs, subscribeUserData } from "@/lib/stores/user-data-store";

export const readPlayerPrefs = getActivePrefs;

export function getServerPlayerPrefs(): PlayerPrefs {
  return EMPTY.prefs;
}

/** Replace all preferences. */
export function writePlayerPrefs(prefs: PlayerPrefs) {
  setActivePrefs(prefs);
}

/** Merge a patch; `undefined` values remove a key. */
export function updatePlayerPrefs(patch: Partial<PlayerPrefs>) {
  const next = { ...readPlayerPrefs(), ...patch };
  for (const [key, value] of Object.entries(next)) if (value === undefined) delete next[key];
  writePlayerPrefs(next);
}

export const subscribePlayerPrefs = subscribeUserData;

/** Video quality preference → hls.js source options (see Video.js "Media sources"). */
export const qualityOptions: Record<QualityPreference, { label: string; hint: string; source: Record<string, unknown> }> = {
  auto: { label: "Auto (recommended)", hint: "Adjusts to your connection and screen", source: {} },
  saver: { label: "Data saver", hint: "Up to 480p", source: { maxAutoResolution: "480p" } },
  standard: { label: "Standard", hint: "Up to 720p", source: { maxAutoResolution: "720p" } },
  high: { label: "High", hint: "Best available, up to 4K", source: { capRenditionToPlayerSize: false } },
};
