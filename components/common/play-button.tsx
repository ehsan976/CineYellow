"use client";

import type { Title } from "@/lib/types";
import Link from "next/link";
import { MonitorPlay, Play, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { isKidsFriendly } from "@/lib/titles";
import { useProfiles } from "@/hooks/use-profile";
import { useWatchTarget, type WatchTarget } from "@/hooks/use-watch-target";
import { Button } from "@/components/ui/button";

/**
 * The main "Play" button (hero, title page, detail popup). When the title has no video on
 * CineYellow (`available === false`), it becomes "Where to Watch" and points at the legal
 * streaming services for the title instead of a player that would have nothing to play.
 * `available` undefined (still loading) shows the normal button.
 */
export function PlayButton({
  title,
  available,
  className,
  size = "lg",
  label,
  ...rest
}: {
  title: Title;
  available?: boolean;
  className?: string;
  size?: "default" | "lg";
  /** Custom text for the play state (e.g. "Watch Now" when there's nothing to resume). */
  label?: (target: WatchTarget) => string;
} & Omit<React.ComponentProps<typeof Button>, "asChild" | "children" | "size" | "variant" | "title">) {
  // `rest` carries props from wrappers such as <DialogClose asChild> (onClick, ref…) to the button.
  const target = useWatchTarget(title);
  const { active } = useProfiles();
  if (active?.kids && available !== false && !isKidsFriendly(title.rating)) {
    // Kids profiles play titles rated All / 7+ only (lib/titles.ts); the watch page checks again.
    return (
      <Button size={size} variant="secondary" disabled className={cn("rounded-full font-semibold", className)} title={title.rating ? `Rated ${title.rating}` : "Not rated"}>
        <ShieldCheck /> Not for Kids
      </Button>
    );
  }
  if (available === false) {
    return (
      <Button {...rest} asChild size={size} variant="secondary" className={cn("rounded-full font-semibold", className)} title="Not on CineYellow yet">
        <Link href={`/title/${title.id}#where-to-watch`}>
          <MonitorPlay /> Where to Watch
        </Link>
      </Button>
    );
  }
  return (
    <Button {...rest} asChild size={size} className={cn("rounded-full font-semibold", className)}>
      <Link href={target.href}>
        <Play className="fill-current" /> {label ? label(target) : target.label}
      </Link>
    </Button>
  );
}
