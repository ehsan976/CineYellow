"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const PlayerContext = createContext(null);

// "Autoplay next episode" preference: a tiny localStorage-backed store.
const AUTOPLAY_KEY = "cineyellow:autoplay-next";
const autoplayListeners = new Set();
let autoplayCache = null;

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

export function setAutoplayNext(value) {
  autoplayCache = Boolean(value);
  try {
    localStorage.setItem(AUTOPLAY_KEY, String(autoplayCache));
  } catch {
    // Storage blocked — keep it in memory for this session.
  }
  autoplayListeners.forEach((listener) => listener());
}

function subscribeAutoplay(listener) {
  autoplayListeners.add(listener);
  return () => autoplayListeners.delete(listener);
}

/** Title + playback info shared by our custom player parts. */
export function PlayerInfoProvider({ title, playback, children }) {
  return <PlayerContext.Provider value={{ title, playback }}>{children}</PlayerContext.Provider>;
}

export function usePlayerInfo() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayerInfo must be used inside <PlayerInfoProvider>");
  return ctx;
}

/** Whether the next episode should start automatically (default on). */
export function useAutoplayNext() {
  return useSyncExternalStore(subscribeAutoplay, getAutoplay, () => true);
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
