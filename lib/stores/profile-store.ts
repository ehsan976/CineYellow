// Viewer profiles (Guest / Family / Kids …) and which one is active, persisted in localStorage.
// Same external-store shape as lib/my-list-store.js. When the real API arrives, replace
// load()/persist() with API calls — components only use the functions exported here.
import type { AvatarColor, Listener, Profile } from "@/lib/types";

export interface ProfilesState {
  activeId: string;
  profiles: Profile[];
}


const KEY = "cineyellow:profiles";

export const avatarColors: Record<AvatarColor, string> = {
  yellow: "bg-primary text-primary-foreground",
  sky: "bg-sky-400 text-sky-950",
  emerald: "bg-emerald-400 text-emerald-950",
  rose: "bg-rose-400 text-rose-950",
  violet: "bg-violet-400 text-violet-950",
  orange: "bg-orange-400 text-orange-950",
};

export const languages: string[] = ["English", "Hindi", "Urdu", "Spanish", "French", "Arabic", "Japanese"];

const DEFAULTS: ProfilesState = Object.freeze<ProfilesState>({
  activeId: "guest",
  profiles: [
    { id: "guest", name: "Guest", color: "yellow", kids: false, language: "English" },
    { id: "family", name: "Family", color: "sky", kids: false, language: "English" },
    { id: "kids", name: "Kids", color: "emerald", kids: true, language: "English" },
  ],
});

const listeners = new Set<Listener>();
let cache: ProfilesState | null = null;

function load(): ProfilesState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length) return parsed;
  } catch {
    // fall through to defaults
  }
  return DEFAULTS;
}

function persist(next: ProfilesState) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — keep the in-memory copy.
  }
  listeners.forEach((listener) => listener());
}

export function getProfiles(): ProfilesState {
  if (cache === null) cache = load();
  return cache;
}

export function getServerProfiles(): ProfilesState {
  return DEFAULTS;
}

export function subscribeProfiles(listener: Listener) {
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

export function setActiveProfile(id: string) {
  const state = getProfiles();
  if (state.activeId === id || !state.profiles.some((p) => p.id === id)) return;
  persist({ ...state, activeId: id });
}

export function updateProfile(id: string, patch: Partial<Profile>) {
  const state = getProfiles();
  persist({ ...state, profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
}

/** Text under the name: the account's plan for adults, age rating for kids. */
export function planLabel(profile: Pick<Profile, "kids">, planName = "Premium"): string {
  return profile.kids ? "Kids profile · 7+" : `${planName} plan`;
}
