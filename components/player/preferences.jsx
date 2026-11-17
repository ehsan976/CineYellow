"use client";

import { useEffect } from "react";
import { usePlayer } from "@videojs/react/video";

import { readPlayerPrefs as read, writePlayerPrefs as write } from "@/lib/stores/player-prefs-store";

const isSubtitle = (t) => t.kind === "subtitles" || t.kind === "captions";

/**
 * Remembers volume, mute, speed, audio language and subtitle language across episodes.
 * Each preference is restored once its data exists, then saved whenever it changes
 * (pattern from the Video.js "Remember user preferences" guide).
 */
export function PlayerPreferences() {
  const store = usePlayer();

  useEffect(() => {
    const saved = read();
    const done = { volume: false, rate: false, audio: false, subtitles: false };

    const snapshot = () => {
      const audio = (store.audioTrackList ?? []).find((t) => t.enabled);
      const showing = (store.textTrackList ?? []).find((t) => isSubtitle(t) && t.mode === "showing");
      return {
        volume: store.volume,
        muted: store.muted,
        rate: store.playbackRate,
        audioLanguage: audio?.language ?? null,
        subtitleLanguage: showing ? showing.language : "off",
      };
    };

    const restore = () => {
      if (!store.target) return;
      if (!done.volume) {
        if (Number.isFinite(saved.volume)) store.setVolume(saved.volume);
        if (saved.muted === true) store.setMuted(true);
        done.volume = true;
      }
      // Loading a source resets playbackRate to 1, so wait until metadata has loaded.
      if (!done.rate && store.duration > 0) {
        if (Number.isFinite(saved.rate)) store.setPlaybackRate(saved.rate);
        done.rate = true;
      }
      const audioTracks = store.audioTrackList ?? [];
      if (!done.audio && audioTracks.length > 1) {
        const match = audioTracks.find((t) => t.language && t.language === saved.audioLanguage);
        if (match && !match.enabled) store.selectAudioTrack(match.id);
        done.audio = true;
      }
      // hls.js is still wiring up its subtitle tracks right after load and can switch some
      // on itself, so restore once playback is under way, then re-check once.
      const subtitleTracks = (store.textTrackList ?? []).filter(isSubtitle);
      if (!done.subtitles && subtitleTracks.length > 0 && store.currentTime > 0.5) {
        done.subtitles = true;
        restoreSubtitles();
        recheck = setTimeout(fixMultipleShowing, 1200);
      }
    };

    let recheck;
    const subtitleState = () => {
      const tracks = (store.textTrackList ?? []).filter(isSubtitle);
      return { tracks, showing: tracks.filter((t) => t.mode === "showing") };
    };
    // Apply the saved choice once. With nothing saved, leave the viewer's own choice alone.
    const restoreSubtitles = () => {
      if (!saved.subtitleLanguage) return;
      const { tracks, showing } = subtitleState();
      if (saved.subtitleLanguage === "off") {
        if (showing.length) store.selectSubtitlesTrack(null);
        return;
      }
      const match = tracks.find((t) => t.language === saved.subtitleLanguage);
      if (match) store.selectSubtitlesTrack(match.id);
    };
    // Only one subtitle track should ever show; keep the saved language (or the first) if not.
    const fixMultipleShowing = () => {
      const { showing } = subtitleState();
      if (showing.length <= 1) return;
      const keep = showing.find((t) => t.language === saved.subtitleLanguage) ?? showing[0];
      store.selectSubtitlesTrack(keep.id);
    };

    let last = null;
    const unsubscribe = store.subscribe(() => {
      restore();
      // Only save once everything we can restore has been restored.
      if (!done.volume || !done.rate) return;
      const now = snapshot();
      const next = {
        ...read(),
        volume: now.volume,
        muted: now.muted,
        rate: now.rate,
        ...(done.audio && now.audioLanguage ? { audioLanguage: now.audioLanguage } : {}),
        ...(done.subtitles ? { subtitleLanguage: now.subtitleLanguage } : {}),
      };
      const serialized = JSON.stringify(next);
      if (serialized !== last) {
        last = serialized;
        write(next);
      }
    });
    return () => {
      clearTimeout(recheck);
      unsubscribe();
    };
  }, [store]);

  return null;
}
