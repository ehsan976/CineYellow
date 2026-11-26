"use client";

import type { RefObject } from "react";
import { useMemo, useState } from "react";

// With Cache Components, Next.js doesn't unmount the page you leave: it keeps up to 3 pages in
// React's <Activity>, hidden with display:none (node_modules/next/dist/docs/01-app/02-guides/
// preserving-ui-state.md). Hidden media keeps playing, so pressing Back on a watch page left the
// movie's sound playing over the home page. When Activity hides a page React detaches its refs,
// which runs the cleanup returned by a callback ref; these helpers stop playback there.

/** Stops waiting one tick, cancelled by a re-attach (Strict Mode's detach + re-attach in dev). */
const pendingPauses = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/**
 * Ref for a <video> wrapper: pauses every video inside when the page is hidden (or the player
 * unmounts). Back on the page, the video is where it stopped and the viewer presses play.
 */
export const pauseVideosWhenHidden = (el: HTMLElement | null) => {
  if (!el) return;
  clearTimeout(pendingPauses.get(el));
  pendingPauses.delete(el);
  return () => {
    pendingPauses.set(
      el,
      setTimeout(() => {
        pendingPauses.delete(el);
        el.querySelectorAll("video").forEach((video) => video.pause());
      }, 0)
    );
  };
};

/**
 * For an <iframe> player (YouTube, embed hosts): another site's player can't be paused from
 * here, so when the page is hidden the frame is sent to about:blank (location.replace adds no
 * history entry, so Back/Forward still work). When the page shows again, `generation` changes:
 * use it in the iframe's `key` so a fresh player loads (resume points come back from history).
 * `frameRef` (optional) is kept pointing at the live element. Pass `attach` as the iframe's ref.
 *
 * The blanking waits one tick: in development, React Strict Mode detaches and re-attaches every
 * new ref straight away. Blanking right then made each new frame look "hidden", so it was
 * replaced, and the replacement again… ("Maximum update depth exceeded"). A re-attach within
 * that tick cancels the stop; a real hide doesn't re-attach, so the frame is blanked.
 */
export function useFrameStopsWhenHidden(frameRef?: RefObject<HTMLIFrameElement | null>) {
  const [generation, setGeneration] = useState(0);
  const attach = useMemo(() => frameStopper(() => setGeneration((g) => g + 1), frameRef), [frameRef]);
  return { attach, generation };
}

/** Frames whose stop is scheduled (see frameStopper). */
const pendingStops = new WeakMap<object, ReturnType<typeof setTimeout>>();

/** The part of an <iframe> the stopper uses (an interface so tests can pass a stand-in). */
export interface StoppableFrame {
  dataset: DOMStringMap;
  contentWindow: { location: { replace(url: string): void } } | null;
}

/**
 * The callback ref behind useFrameStopsWhenHidden. `onShownAgain` runs once when a frame that
 * was stopped (page hidden) is attached again; the caller then mounts a fresh frame.
 */
export function frameStopper<T extends StoppableFrame>(onShownAgain: () => void, frameRef?: { current: T | null }) {
  return (el: T | null) => {
    if (!el) return;
    const pending = pendingStops.get(el);
    if (pending !== undefined) {
      // Detached and re-attached right away (Strict Mode): it never stopped, keep it.
      clearTimeout(pending);
      pendingStops.delete(el);
    } else if (el.dataset.stopped) {
      // Shown again after being hidden: this frame is blank, so mount a new one (once).
      onShownAgain();
      return;
    }
    if (frameRef) frameRef.current = el;
    return () => {
      if (frameRef?.current === el) frameRef.current = null;
      pendingStops.set(
        el,
        setTimeout(() => {
          pendingStops.delete(el);
          el.dataset.stopped = "1";
          try {
            el.contentWindow?.location.replace("about:blank");
          } catch {
            // Already removed from the page (unmounted): nothing is playing.
          }
        }, 0)
      );
    };
  };
}
