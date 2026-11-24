"use client";

// Link the active profile to Trakt (trakt.tv): finished titles go to its Trakt history, and its
// Trakt watchlist can be copied into My List. Hidden when the site has no Trakt keys.
import { useEffect, useState } from "react";
import { Download, Link2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { disconnectTraktAction, importTraktWatchlistAction } from "@/app/actions/trakt";
import { useSession } from "@/lib/auth/client";
import { loadUserData } from "@/lib/stores/user-data-store";
import { useProfiles } from "@/hooks/use-profile";
import { SettingRow, SettingsCard } from "@/components/account/settings-ui";
import { Button } from "@/components/ui/button";

type Status = { enabled: boolean; connected: boolean; username: string };

export function TraktCard() {
  const { active } = useProfiles();
  const { data: session } = useSession();
  const profileId = active?.id;
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<"import" | "disconnect" | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    fetch(`/api/trakt/status?profileId=${encodeURIComponent(profileId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Status | null) => !cancelled && setStatus(data))
      .catch(() => !cancelled && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (!status?.enabled || !profileId) return null;

  async function importWatchlist() {
    setBusy("import");
    try {
      const result = await importTraktWatchlistAction(profileId);
      if (!result.ok) return void toast.error(result.error);
      toast.success(result.message);
      // Pull the new My List from the server.
      if (session?.user.id) loadUserData(session.user.id, { force: true });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    try {
      const result = await disconnectTraktAction(profileId);
      if (!result.ok) return void toast.error(result.error);
      toast.success(result.message);
      setStatus({ ...status, connected: false, username: "" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <SettingsCard
      title="Trakt"
      description={`Sync ${active.name}'s watching with trakt.tv. Each profile links its own Trakt account.`}
    >
      {status.connected ? (
        <>
          <SettingRow label="Connected" hint={status.username ? `As ${status.username}. Finished movies and episodes are added to your Trakt history.` : "Finished movies and episodes are added to your Trakt history."}>
            <Button variant="outline" disabled={busy !== null} onClick={disconnect}>
              {busy === "disconnect" ? <Loader2 className="animate-spin" /> : <Unlink />} Disconnect
            </Button>
          </SettingRow>
          <SettingRow label="Watchlist" hint="Copy your Trakt watchlist into My List.">
            <Button variant="outline" disabled={busy !== null} onClick={importWatchlist}>
              {busy === "import" ? <Loader2 className="animate-spin" /> : <Download />} Import
            </Button>
          </SettingRow>
        </>
      ) : (
        <SettingRow label="Not connected" hint="You'll approve the link on trakt.tv and come back here.">
          <Button asChild>
            {/* A full page navigation: the route redirects to Trakt. */}
            <a href={`/api/trakt/connect?profileId=${encodeURIComponent(profileId)}`}>
              <Link2 /> Connect Trakt
            </a>
          </Button>
        </SettingRow>
      )}
    </SettingsCard>
  );
}
