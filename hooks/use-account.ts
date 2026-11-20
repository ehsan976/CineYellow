"use client";

import { useSyncExternalStore } from "react";

import { getAccount, getServerAccount, plans, subscribeAccount } from "@/lib/stores/account-store";
import { getServerPlayerPrefs, readPlayerPrefs, subscribePlayerPrefs } from "@/lib/stores/player-prefs-store";

/** Account data plus the resolved plan (null when payments are on and no paid time is left). */
export function useAccount() {
  const account = useSyncExternalStore(subscribeAccount, getAccount, getServerAccount);
  return { ...account, planInfo: account.plan ? plans[account.plan] : null };
}

/** Player preferences (speed, quality, languages…) shared with the video player. */
export function usePlayerPrefs() {
  return useSyncExternalStore(subscribePlayerPrefs, readPlayerPrefs, getServerPlayerPrefs);
}
