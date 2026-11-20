"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Layers } from "lucide-react";
import { Menu } from "@videojs/react";

import { cn } from "@/lib/utils";
import { watchHref } from "@/lib/player/playback";
import { getHistory, getServerHistory, subscribeHistory } from "@/lib/stores/watch-history-store";
import { itemClass, PlayerMenu } from "@/components/player/player-menu";
import { usePlayerInfo } from "@/components/player/player-context";

/** Netflix-style episode list for the current season (series/anime only). */
export function EpisodesMenu({ className }: { className?: string }) {
  const router = useRouter();
  const { title, playback } = usePlayerInfo();
  const history = useSyncExternalStore(subscribeHistory, getHistory, getServerHistory);

  return (
    <PlayerMenu
      label="Episodes"
      className={className}
      icon={<Layers className="size-media-icon" />}
      popupClassName="w-[min(30rem,var(--media-menu-available-width,30rem))]"
    >
      <p className="px-2.5 pt-1 pb-2 text-base font-bold">
        {title.title} <span className="font-normal text-white/60">· Season {playback.season}</span>
      </p>
      <div className="flex max-h-[min(24rem,calc(var(--media-menu-available-height,30rem)-4rem))] flex-col gap-1 overflow-y-auto pe-1">
        {playback.episodes.map((ep) => {
          const current = ep.number === playback.episode;
          const saved = history[`${title.id}:s${playback.season}e${ep.number}`];
          const pct = saved ? Math.min(100, (saved.time / saved.duration) * 100) : 0;
          return (
            <Menu.Item
              key={ep.id}
              onSelect={() => !current && router.push(watchHref(title.id, playback.season, ep.number))}
              className={cn(itemClass, "items-start gap-3", current && "bg-white/10")}
            >
              <span className="mt-1 w-5 shrink-0 text-center text-lg font-bold text-white/60">{ep.number}</span>
              <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded bg-white/10">
                <Image src={ep.image} alt="" fill sizes="112px" className="object-cover" />
                {pct > 0 && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
                    <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{ep.name}</span>
                  <span className="shrink-0 text-xs text-white/60">{ep.runtime}</span>
                </span>
                {current ? (
                  <span className="mt-0.5 block text-xs font-semibold text-primary">Now playing</span>
                ) : (
                  <span className="mt-0.5 line-clamp-2 text-xs whitespace-normal text-white/65">{ep.summary}</span>
                )}
              </span>
            </Menu.Item>
          );
        })}
      </div>
    </PlayerMenu>
  );
}
