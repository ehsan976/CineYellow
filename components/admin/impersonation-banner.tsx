"use client";

import { useState } from "react";
import { Loader2, UserX } from "lucide-react";
import { toast } from "sonner";

import { stopImpersonating } from "@/lib/auth/admin-client";
import { useSession } from "@/lib/auth/client";

/** Shown while an admin is signed in as another user ("Sign in as user" on /admin). */
export function ImpersonationBanner() {
  const { data } = useSession();
  const [busy, setBusy] = useState(false);
  if (!data?.session.impersonatedBy) return null;

  const stop = async () => {
    setBusy(true);
    const { error } = await stopImpersonating();
    if (error) {
      setBusy(false);
      return toast.error(error.message || "Couldn't switch back.");
    }
    // Full reload so every store goes back to the admin's own session and data.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload swaps the session everywhere
    window.location.assign("/admin");
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-4 text-sm font-medium text-primary-foreground shadow-lg"
    >
      <UserX className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">Signed in as {data.user.email}</span>
      <button
        type="button"
        onClick={stop}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/85 px-3 py-1.5 text-white transition hover:bg-black disabled:opacity-60"
      >
        {busy && <Loader2 className="size-3.5 animate-spin" />} Stop
      </button>
    </div>
  );
}
