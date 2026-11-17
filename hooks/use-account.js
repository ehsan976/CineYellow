"use client";

import { useSyncExternalStore } from "react";

import { getAccount, getServerAccount, plans, subscribeAccount } from "@/lib/stores/account-store";
import { getServerPlayerPrefs, readPlayerPrefs, subscribePlayerPrefs } from "@/lib/stores/player-prefs-store";

/** Account data plus the resolved plan (defaults during prerender/hydration). */
export function useAccount() {
  const account = useSyncExternalStore(subscribeAccount, getAccount, getServerAccount);
  return { ...account, planInfo: plans[account.plan] ?? plans.premium };
}

/** Player preferences (speed, quality, languages…) shared with the video player. */
export function usePlayerPrefs() {
  return useSyncExternalStore(subscribePlayerPrefs, readPlayerPrefs, getServerPlayerPrefs);
}
