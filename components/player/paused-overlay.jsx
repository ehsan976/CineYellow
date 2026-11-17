"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@videojs/react/video";

import { cn } from "@/lib/utils";
import { usePlayerInfo } from "@/components/player/player-context";

/** Netflix's "You're watching" card, shown after playback has been paused for a few seconds. */
export function PausedOverlay() {
  const paused = usePlayer((s) => s.paused);
  const started = usePlayer((s) => s.started);
  const ended = usePlayer((s) => s.ended);
  // Mounted only while paused, so every pause starts a fresh 4s delay.
  return paused && started && !ended ? <PausedCard /> : null;
}

function PausedCard() {
  const { title, playback } = usePlayerInfo();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(id);
  }, []);

  const description = playback.current ? playback.current.summary : title.description;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none absolute inset-0 z-25 flex items-center bg-linear-to-r from-black/85 via-black/50 to-transparent px-6 transition-opacity duration-700 sm:px-16",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="max-w-xl text-white">
        <p className="text-sm text-white/70 sm:text-base">You&apos;re watching</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight uppercase sm:text-5xl">{title.title}</h2>
        {playback.label && <p className="mt-3 text-lg font-semibold text-primary sm:text-xl">{playback.label}</p>}
        <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">{description}</p>
        <p className="mt-4 text-xs text-white/60">
          {title.year} · {title.rating} · {title.genres.join(", ")}
        </p>
      </div>
    </div>
  );
}
