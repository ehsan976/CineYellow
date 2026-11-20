"use client";

import { Menu } from "@videojs/react";

import { PlaybackRateSubmenu } from "@/components/videojs/ui/playback-rate-submenu";
import { QualityMenu } from "@/components/videojs/ui/quality-menu";
import { SettingsMenu } from "@/components/videojs/ui/settings-menu";
import { cn } from "@/lib/player/resolve-class-name";
import { setAutoplayNext, useAutoplayNext, usePlayerInfo } from "@/components/player/player-context";

/** Video.js settings menu: Quality + Speed submenus, plus our "Autoplay next episode" switch. */
export function NetflixSettingsMenu({ className }: { className?: string }) {
  const { playback } = usePlayerInfo();
  const autoplayNext = useAutoplayNext();

  return (
    <SettingsMenu className={className}>
      <QualityMenu />
      <PlaybackRateSubmenu />
      {/* Only series/anime have a next episode to autoplay */}
      {playback.season && (
        <Menu.CheckboxItem
          checked={autoplayNext}
          onCheckedChange={setAutoplayNext}
          className={cn(
            "group/autoplay relative flex cursor-pointer select-none items-center gap-3 rounded-media-menu-item px-2 py-1.5 text-start whitespace-nowrap",
            "focus-ring-media media-highlighted:highlight-media focus-visible:outline-media-ring focus-visible:outline-offset-2",
            "transition-[background-color,color] duration-media-fast ease-in-out"
          )}
        >
          <span>Autoplay next episode</span>
          <span
            aria-hidden
            className={cn(
              "ms-auto inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
              autoplayNext ? "bg-media-primary" : "bg-white/25"
            )}
          >
            <span
              className={cn(
                "size-4 rounded-full bg-white shadow transition-transform",
                autoplayNext && "translate-x-4"
              )}
            />
          </span>
        </Menu.CheckboxItem>
      )}
    </SettingsMenu>
  );
}
