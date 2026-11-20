"use client";

import type { ReactNode } from "react";
import "@/components/videojs/styles/base.css";
import "@/components/videojs/styles/video/theme.css";

import { Menu } from "@videojs/react";

import { Button } from "@/components/videojs/ui/button";
import { ButtonTooltip } from "@/components/videojs/ui/button-tooltip";
import { cn } from "@/lib/player/resolve-class-name";

// Popup look shared with the Video.js settings menu (surface, transitions, side offsets).
export const popupClass = cn(
  "m-0 border-0 text-inherit",
  "media-transitioning:opacity-0 media-transitioning:blur-media-hidden-popup media-transitioning:scale-media-hidden-popup",
  "data-[side=top]:origin-bottom data-[side=bottom]:origin-top",
  "data-[side=top]:[--media-popup-translate-y-distance:var(--media-popup-translate-distance)]",
  "bg-media-popover text-media-popover-foreground surface-media after:surface-media-inset",
  "rounded-media-popup p-2 [--media-popup-side-offset:var(--media-popover-side-offset)]",
  "max-w-(--media-menu-available-width) max-h-(--media-menu-available-height) overflow-auto overscroll-none",
  "transition-media-popup media-transitioning:transition-media-popup"
);

export const itemClass = cn(
  "relative flex cursor-pointer select-none items-center gap-2 rounded-media-menu-item px-2.5 py-2 text-start",
  "focus-ring-media media-highlighted:highlight-media focus-visible:outline-media-ring focus-visible:outline-offset-2",
  "transition-[background-color,color] duration-media-fast ease-in-out"
);

/**
 * A control-bar menu with a custom trigger icon. Built from Video.js Menu primitives so it
 * positions inside the player container and keeps working in fullscreen.
 */
export function PlayerMenu({
  icon,
  label,
  children,
  className,
  popupClassName,
  side = "top",
  align = "end",
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
  popupClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  return (
    <Menu.Root side={side} align={align} boundary="container">
      <ButtonTooltip label={label} side="top">
        <Menu.Trigger render={<Button />} aria-label={label} className={cn("group/player-menu", className)}>
          {icon}
        </Menu.Trigger>
      </ButtonTooltip>
      <Menu.Popup keepMounted className={cn(popupClass, popupClassName)}>
        <Menu.Content className="outline-hidden">{children}</Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}
