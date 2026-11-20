// Viewer profiles, stored in Postgres (profile table) via user-data-store. Which profile is
// active is remembered per device in localStorage, like Netflix.
import type { AvatarColor, Profile } from "@/lib/types";
import { LANGUAGES } from "@/lib/user-data";
import {
  getServerUserDataState,
  getUserDataState,
  setActiveProfile as setActive,
  subscribeUserData,
  updateProfile as update,
  type ProfilesState,
} from "@/lib/stores/user-data-store";

export type { ProfilesState };

export const avatarColors: Record<AvatarColor, string> = {
  yellow: "bg-primary text-primary-foreground",
  sky: "bg-sky-400 text-sky-950",
  emerald: "bg-emerald-400 text-emerald-950",
  rose: "bg-rose-400 text-rose-950",
  violet: "bg-violet-400 text-violet-950",
  orange: "bg-orange-400 text-orange-950",
};

export const languages: string[] = LANGUAGES;

export function getProfiles(): ProfilesState {
  return getUserDataState().profilesState;
}

export function getServerProfiles(): ProfilesState {
  return getServerUserDataState().profilesState;
}

export const subscribeProfiles = subscribeUserData;

export function setActiveProfile(id: string) {
  setActive(id);
}

/** Saved to the database in the background; rolled back with a toast if that fails. */
export function updateProfile(id: string, patch: Partial<Profile>) {
  return update(id, patch);
}

/** Text under the name: the account's plan for adults, age rating for kids. */
export function planLabel(profile: Pick<Profile, "kids">, planName?: string | null): string {
  if (profile.kids) return "Kids profile · 7+";
  return planName ? `${planName} plan` : "No plan";
}
