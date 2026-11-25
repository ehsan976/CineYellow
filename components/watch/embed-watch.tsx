"use client";

import type { Playback, Title } from "@/lib/types";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, SkipForward } from "lucide-react";

import { getProgress, saveProgress } from "@/lib/stores/watch-history-store";
import { isUserDataReady, subscribeUserData } from "@/lib/stores/user-data-store";

/** Save the embed's position at most this often (seconds of playback). */
const SAVE_EVERY = 10;
/** Don't resume into the first seconds of a video. */
const MIN_RESUME = 30;

/**
 * Adds what the host's player needs for position updates (and a resume point) to its URL:
 * - YouTube: `enablejsapi=1` + `origin` (the IFrame API's postMessage channel), `start=`.
 * - Vimeo: its player always talks postMessage; resume with `#t=`.
 * Other hosts are returned unchanged (no progress there).
 */
function withPlayerApi(url: string, providerId: string, resumeAt: number): string {
  try {
    const u = new URL(url);
    if (providerId === "youtube") {
      u.searchParams.set("enablejsapi", "1");
      u.searchParams.set("origin", window.location.origin);
      if (resumeAt) u.searchParams.set("start", String(resumeAt));
    } else if (providerId === "vimeo" && resumeAt) {
      u.hash = `t=${resumeAt}s`;
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Listens to the official player's postMessage events (YouTube IFrame API "infoDelivery",
 * Vimeo Player API "timeupdate") and saves the position like the site player does, so embed
 * titles show up in Continue Watching. Messages from any other origin are ignored.
 */
function useEmbedProgress(
  frame: React.RefObject<HTMLIFrameElement | null>,
  providerId: string,
  playback: Playback,
  title: Title,
  src: string | null
) {
  useEffect(() => {
    if (!src || (providerId !== "youtube" && providerId !== "vimeo")) return;
    let lastSaved = -SAVE_EVERY;
    const save = (time: number, duration: number) => {
      if (!(duration > 0) || Math.abs(time - lastSaved) < SAVE_EVERY) return;
      lastSaved = time;
      saveProgress({ key: playback.key, titleId: title.id, season: playback.season, episode: playback.episode, time, duration });
    };

    const fromYouTube = (origin: string) => /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)$/.test(origin);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      let data: unknown = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== "object") return;
      const msg = data as { event?: string; info?: { currentTime?: number; duration?: number }; data?: { seconds?: number; duration?: number } };
      if (providerId === "youtube" && fromYouTube(event.origin) && msg.info) {
        if (typeof msg.info.currentTime === "number") save(msg.info.currentTime, msg.info.duration ?? 0);
      }
      if (providerId === "vimeo" && event.origin === "https://player.vimeo.com") {
        if (msg.event === "ready") {
          frame.current?.contentWindow?.postMessage({ method: "addEventListener", value: "timeupdate" }, "https://player.vimeo.com");
        } else if (msg.event === "timeupdate" && msg.data) {
          save(msg.data.seconds ?? 0, msg.data.duration ?? 0);
        }
      }
    };
    window.addEventListener("message", onMessage);

    // YouTube only starts sending "infoDelivery" after the page says it's listening.
    const listen = () => {
      if (providerId !== "youtube") return;
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
    };
    const el = frame.current;
    el?.addEventListener("load", listen);
    // In case the frame finished loading before this effect ran.
    listen();
    return () => {
      window.removeEventListener("message", onMessage);
      el?.removeEventListener("load", listen);
    };
  }, [frame, providerId, playback, title.id, src]);
}

/**
 * Watch page for an embed source (YouTube, Vimeo, Bunny Stream…): the host's own player fills the
 * screen. `header` holds extra controls such as the "Server" menu.
 */
export function EmbedWatch({
  title,
  playback,
  url,
  providerId,
  header,
}: {
  title: Title;
  playback: Playback;
  url: string;
  providerId: string;
  header?: React.ReactNode;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  // The URL (with the resume point) is built in the browser once this profile's history has
  // loaded, like the site player (the server never knows the position or the page origin).
  const ready = useSyncExternalStore(subscribeUserData, isUserDataReady, () => false);
  const src = useMemo(() => {
    if (!ready) return null;
    const saved = getProgress(playback.key);
    const resumeAt = saved && saved.time >= MIN_RESUME && saved.duration - saved.time > 60 ? Math.floor(saved.time) : 0;
    return withPlayerApi(url, providerId, resumeAt);
    // Only when the source or episode changes (not on every history save), so it never reloads.
  }, [ready, url, providerId, playback.key]);
  useEmbedProgress(frame, providerId, playback, title, src);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <header className="flex items-center gap-3 px-3 py-2 md:px-5">
        <Link
          href={`/title/${title.id}`}
          aria-label={`Back to ${title.title}`}
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{title.title}</h1>
          {playback.label && <p className="truncate text-xs text-white/60">{playback.label}</p>}
        </div>
        {header}
        {playback.next && (
          <Link
            href={playback.next.href}
            aria-label="Next episode"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 text-sm hover:border-white"
          >
            <span className="hidden sm:inline">Next episode</span> <SkipForward className="size-4" />
          </Link>
        )}
      </header>
      {src ? (
        // Landscape (desktop, phone turned sideways): the host's player fills the space, as before.
        // Portrait: a 16:9 frame centred, instead of the host's player stretched to the full height
        // of an upright phone with its artwork cropped. Fullscreen still fills the device.
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <iframe
            ref={frame}
            key={src}
            src={src}
            title={playback.label ? `${title.title} — ${playback.label}` : title.title}
            className="size-full border-0 portrait:aspect-video portrait:h-auto"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write; accelerometer; gyroscope"
            allowFullScreen
            referrerPolicy="origin"
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center" aria-busy="true" aria-label="Loading player">
          <Loader2 className="size-10 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
