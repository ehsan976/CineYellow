"use client";

import type { AppNotification } from "@/lib/types";
import { useEffect, useState } from "react";

import { localToday, releaseNotice, type ReleaseInfo, type ReleaseNotice } from "@/lib/releases";
import { useTitles } from "@/lib/stores/title-store";
import { useApp } from "@/components/providers/app-context";
import { useAccount } from "@/hooks/use-account";

type Found = { key: string; notices: { id: string; notice: ReleaseNotice }[] };
const NONE: Found = { key: "", notices: [] };

/**
 * Bell items for titles in the active profile's My List: a new episode or a release that's out,
 * or one coming soon (lib/releases.ts). Off when Settings → Notifications → "New episodes" is off.
 * Nothing new → [].
 */
export function useReleaseNotifications(): AppNotification[] {
  const { myList, hydrated } = useApp() as { myList: string[]; hydrated: boolean };
  const { notifications } = useAccount();
  const enabled = hydrated && notifications.newEpisodes && myList.length > 0;
  const key = enabled ? myList.slice(0, 50).join(",") : "";
  const [found, setFound] = useState<Found>(NONE);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/catalog/releases?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ releases: ReleaseInfo[] }>) : null))
      .then((data) => {
        if (!data) return;
        // Compared with the viewer's own date, here rather than during render.
        const today = localToday();
        const notices = (data.releases ?? []).flatMap((info) => {
          const notice = releaseNotice(info, today);
          return notice ? [{ id: info.id, notice }] : [];
        });
        setFound({ key, notices });
      })
      .catch(() => {
        // Offline or aborted: the bell just shows the general news.
      });
    return () => controller.abort();
  }, [key]);

  const notices = found.key === key ? found.notices : NONE.notices;
  const { get } = useTitles(notices.map((n) => n.id));
  return notices.flatMap(({ id, notice }) => {
    const title = get(id);
    return title ? [{ id: `release-${id}`, title, ...notice, unread: true }] : [];
  });
}
