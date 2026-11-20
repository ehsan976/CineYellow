"use client";

import type { AuthState } from "@/lib/types";
import { useSession } from "@/lib/auth/client";

/** Current sign-in state from Better Auth (signed out while the session is loading). */
export function useAuth(): AuthState & { pending: boolean } {
  const { data, isPending } = useSession();
  return {
    signedIn: Boolean(data?.user),
    email: data?.user.email ?? null,
    name: data?.user.name ?? null,
    pending: isPending,
  };
}
