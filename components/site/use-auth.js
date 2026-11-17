"use client";

import { useSyncExternalStore } from "react";

import { getAuth, getServerAuth, subscribeAuth } from "@/lib/auth-store";

/** Current sign-in state (signed out during prerender/hydration). */
export function useAuth() {
  return useSyncExternalStore(subscribeAuth, getAuth, getServerAuth);
}
