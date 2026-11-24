"use client";

import type { ReactNode } from "react";
import type { Playback, Title } from "@/lib/types";
import { createContext, useContext, useSyncExternalStore } from "react";
import { usePlayer } from "@videojs/react/video";

import { NO_CREDITS_MARK, NO_INTRO } from "@/lib/player/playback";

const PlayerContext = createContext<{ title: Title; playback: Playback } | null>(null);

// "Autoplay next episode" preference: a tiny localStorage-backed store.
const AUTOPLAY_KEY = "cineyellow:autoplay-next";
const autoplayListeners = new Set<() => void>();
let autoplayCache: boolean | null = null;

function getAutoplay() {
  if (autoplayCache === null) {
    try {
      autoplayCache = localStorage.getItem(AUTOPLAY_KEY) !== "false";
    } catch {
      autoplayCache = true;
    }
  }
  return autoplayCache;
}

export function setAutoplayNext(value: boolean) {
  autoplayCache = Boolean(value);
  try {
    localStorage.setItem(AUTOPLAY_KEY, String(autoplayCache));
  } catch {
    // Storage blocked — keep it in memory for this session.
  }
  autoplayListeners.forEach((listener) => listener());
}

function subscribeAutoplay(listener: () => void) {
  autoplayListeners.add(listener);
  return () => autoplayListeners.delete(listener);
}

/** Title + playback info shared by our custom player parts. */
export function PlayerInfoProvider({ title, playback, children }: { title: Title; playback: Playback; children: ReactNode }) {
  return <PlayerContext.Provider value={{ title, playback }}>{children}</PlayerContext.Provider>;
}

export function usePlayerInfo() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayerInfo must be used inside <PlayerInfoProvider>");
  return ctx;
}

/** How far (seconds) the video may differ from the one AniSkip's times were measured on. */
const LENGTH_TOLERANCE = 10;

/**
 * The intro window and credits start to use. Admin-set times always apply; automatic ones
 * (AniSkip, with introLength / creditsLength) only once the video's duration is known and matches,
 * since a different cut (e.g. without a recap) would put them in the wrong place.
 */
export function useSkipMarkers() {
  const { playback } = usePlayerInfo();
  const duration = usePlayer((s) => s.duration);
  const fits = (length: number | null | undefined) =>
    length == null || (Number.isFinite(duration) && duration > 0 && Math.abs(duration - length) <= LENGTH_TOLERANCE);
  return {
    intro: fits(playback.introLength) ? playback.intro : NO_INTRO,
    creditsAt: fits(playback.creditsLength) ? playback.creditsAt : NO_CREDITS_MARK,
  };
}

/** Whether the next episode should start automatically (default on). */
export function useAutoplayNext() {
  return useSyncExternalStore(subscribeAutoplay, getAutoplay, () => true);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
