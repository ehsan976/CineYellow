"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { usePlayer } from "@videojs/react/video";

import { getProgress, saveProgress } from "@/lib/watch-history-store";
import { formatClock, usePlayerInfo } from "@/components/player/player-context";

const MIN_RESUME = 30; // don't resume the first 30s
const END_GUARD = 60; // or the last minute

/** Resumes from the saved position and keeps saving progress while watching. */
export function ResumeManager() {
  const store = usePlayer();
  const { playback } = usePlayerInfo();
  const [resumedFrom, setResumedFrom] = useState(null);
  const restored = useRef(false);

  // Restore once the media has a duration. Runs from store callbacks, never synchronously.
  useEffect(() => {
    const tryRestore = () => {
      if (restored.current) return true;
      if (!store.target || !(store.duration > 0)) return false;
      restored.current = true;
      const saved = getProgress(playback.key);
      if (saved && saved.time >= MIN_RESUME && saved.time < store.duration - END_GUARD) {
        store.seek(saved.time);
        setResumedFrom(saved.time);
      }
      return true;
    };
    const unsubscribe = store.subscribe(() => {
      if (tryRestore()) unsubscribe();
    });
    const frame = requestAnimationFrame(() => {
      if (tryRestore()) unsubscribe();
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [store, playback.key]);

  // Save every 5s while playing, on pause, when the tab hides, and on leave.
  useEffect(() => {
    const save = () => {
      if (!restored.current || !(store.currentTime > 5)) return;
      saveProgress({
        key: playback.key,
        titleId: playback.titleId,
        season: playback.season,
        episode: playback.episode,
        time: store.currentTime,
        duration: store.duration,
      });
    };
    let wasPaused = store.paused;
    const unsubscribe = store.subscribe(() => {
      if (store.paused && !wasPaused) save();
      wasPaused = store.paused;
    });
    const id = setInterval(() => !store.paused && save(), 5000);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      clearInterval(id);
      unsubscribe();
      window.removeEventListener("pagehide", save);
    };
  }, [store, playback]);

  // Hide the "Resumed" pill after a few seconds.
  useEffect(() => {
    if (resumedFrom === null) return;
    const id = setTimeout(() => setResumedFrom(null), 6000);
    return () => clearTimeout(id);
  }, [resumedFrom]);

  if (resumedFrom === null) return null;

  return (
    <div
      role="status"
      className="absolute top-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/75 py-1.5 pr-1.5 pl-4 text-xs whitespace-nowrap text-white shadow-lg ring-1 ring-white/15 backdrop-blur sm:gap-3 sm:text-sm"
    >
      <span>
        Resumed from <span className="font-semibold text-primary">{formatClock(resumedFrom)}</span>
      </span>
      <button
        type="button"
        onClick={() => {
          store.seek(0);
          setResumedFrom(null);
        }}
        className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-medium hover:bg-primary hover:text-primary-foreground"
      >
        <RotateCcw className="size-3.5" /> Start over
      </button>
    </div>
  );
}
