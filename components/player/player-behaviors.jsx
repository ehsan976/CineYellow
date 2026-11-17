"use client";

import { Gesture, Hotkey } from "@videojs/react";

/**
 * Keyboard shortcuts from the Video.js video skin, bound page-wide (this page has one player),
 * so they work without clicking the video first. Typing in inputs is skipped automatically.
 * Our own `s` (skip intro) and `n` (next episode) live next to the components they drive.
 */
export function PlayerHotkeys() {
  const doc = "document";
  return (
    <>
      <Hotkey target={doc} keys="Space" action="togglePaused" />
      <Hotkey target={doc} keys="k" action="togglePaused" />
      <Hotkey target={doc} keys="m" action="toggleMuted" />
      <Hotkey target={doc} keys="f" action="toggleFullscreen" />
      <Hotkey target={doc} keys="c" action="toggleSubtitles" />
      <Hotkey target={doc} keys="i" action="togglePictureInPicture" />
      <Hotkey target={doc} keys="ArrowRight" action="seekStep" value={10} />
      <Hotkey target={doc} keys="ArrowLeft" action="seekStep" value={-10} />
      <Hotkey target={doc} keys="l" action="seekStep" value={10} />
      <Hotkey target={doc} keys="j" action="seekStep" value={-10} />
      <Hotkey target={doc} keys="ArrowUp" action="volumeStep" />
      <Hotkey target={doc} keys="ArrowDown" action="volumeStep" />
      <Hotkey target={doc} keys="0-9" action="seekToPercent" />
      <Hotkey target={doc} keys="Home" action="seekToPercent" value={0} />
      <Hotkey target={doc} keys="End" action="seekToPercent" value={100} />
      <Hotkey target={doc} keys=">" action="speedUp" />
      <Hotkey target={doc} keys="<" action="speedDown" />
    </>
  );
}

/** Mouse click pauses; touch tap shows controls; double tap left/right seeks ∓10s; center double tap = fullscreen. */
export function PlayerGestures() {
  return (
    <>
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="seekStep" value={-10} region="left" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture type="doubletap" action="seekStep" value={10} region="right" />
    </>
  );
}
