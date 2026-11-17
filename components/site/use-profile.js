"use client";

import { useSyncExternalStore } from "react";

import { getProfiles, getServerProfiles, subscribeProfiles } from "@/lib/profile-store";

/** All profiles plus the active one (defaults during prerender/hydration). */
export function useProfiles() {
  const state = useSyncExternalStore(subscribeProfiles, getProfiles, getServerProfiles);
  const active = state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0];
  return { profiles: state.profiles, active };
}
