"use client";

import { useHotkey } from "@videojs/react";
import { usePlayer } from "@videojs/react/video";

import { cn } from "@/lib/utils";
import { useSkipMarkers } from "@/components/player/player-context";

/** Netflix-style "Skip Intro" button, shown while playback is inside the intro window. */
export function SkipIntroButton() {
  const store = usePlayer();
  const { start, end } = useSkipMarkers().intro;
  const currentTime = usePlayer((s) => s.currentTime);
  const visible = currentTime >= start && currentTime < end;

  const skip = () => {
    store.seek(end);
    store.play();
  };

  // "s" skips the intro while the button is showing.
  useHotkey({ keys: "s", target: "document", disabled: !visible, onActivate: skip });

  return (
    <button
      type="button"
      onClick={(e) => {
        // The button hides right after; drop focus so Space/Enter don't press it again.
        e.currentTarget.blur();
        skip();
      }}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      data-visible={visible || undefined}
      className={cn(
        "absolute right-4 bottom-32 z-40 rounded-md border-2 border-white/70 bg-black/60 px-6 py-3 text-base font-bold text-white backdrop-blur-sm sm:right-10 sm:bottom-36 sm:text-lg",
        "transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none",
        "pointer-events-none translate-y-2 opacity-0",
        "data-visible:pointer-events-auto data-visible:translate-y-0 data-visible:opacity-100"
      )}
    >
      Skip Intro
    </button>
  );
}
