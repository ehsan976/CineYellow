"use client";

import type { Playback, Title } from "@/lib/types";

declare global {
  interface Window {
    /** Player store, exposed for debugging/tests (see DevProbe). */
    __vjs?: unknown;
  }
}

import { useEffect, useSyncExternalStore } from "react";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { VideoPlayer, usePlayer } from "@videojs/react/video";

import { cn } from "@/lib/player/resolve-class-name";
import { Loader2 } from "lucide-react";

import { getServerPlayerPrefs, qualityOptions, readPlayerPrefs, subscribePlayerPrefs } from "@/lib/stores/player-prefs-store";
import { isUserDataReady, subscribeUserData } from "@/lib/stores/user-data-store";
import { Container } from "@/components/videojs/ui/container";
import { BufferingIndicator } from "@/components/videojs/ui/buffering-indicator";
import { ErrorDialog } from "@/components/videojs/ui/error-dialog";
import { Poster } from "@/components/videojs/ui/poster";
import { VideoStatusIndicators } from "@/components/videojs/video/display/status-indicators";
import { NetflixControls } from "@/components/player/netflix-controls";
import { NextEpisodeCard } from "@/components/player/next-episode-card";
import { PausedOverlay } from "@/components/player/paused-overlay";
import { PlayerGestures, PlayerHotkeys } from "@/components/player/player-behaviors";
import { PlayerInfoProvider } from "@/components/player/player-context";
import { PlayerPreferences } from "@/components/player/preferences";
import { ResumeManager } from "@/components/player/resume-manager";
import { SkipIntroButton } from "@/components/player/skip-intro-button";

// Expose the store for debugging/tests: always in development, and in production only
// when localStorage["cineyellow:debug"] === "1".
function DevProbe() {
  const store = usePlayer();
  useEffect(() => {
    let debug = process.env.NODE_ENV !== "production";
    try {
      debug ||= localStorage.getItem("cineyellow:debug") === "1";
    } catch {
      // storage blocked
    }
    if (!debug) return;
    window.__vjs = store;
    return () => {
      if (window.__vjs === store) delete window.__vjs;
    };
  }, [store]);
  return null;
}

/**
 * Full-screen Netflix-style player built from the Video.js 10 skin components
 * (copied into components/videojs via the shadcn registry) plus our own overlays.
 */
/** Calls `onError` once when the player reports a fatal error (stream down, manifest 404…). */
function FatalErrorWatcher({ onError }: { onError?: () => void }) {
  const error = usePlayer((s) => s.error);
  useEffect(() => {
    if (error && onError) onError();
  }, [error, onError]);
  return null;
}

export function NetflixPlayer({
  title,
  playback,
  onFatalError,
  overlay,
}: {
  title: Title;
  playback: Playback;
  /** Another source can take over (WatchSources): called instead of leaving the error showing. */
  onFatalError?: () => void;
  /** Extra UI over the player, e.g. the "Server" menu. */
  overlay?: React.ReactNode;
}) {
  // Settings → Video quality (Auto / Data saver / Standard / High)
  const prefs = useSyncExternalStore(subscribePlayerPrefs, readPlayerPrefs, getServerPlayerPrefs);
  const quality = prefs.quality ?? "auto";
  // Wait for this profile's saved position and preferences (from Postgres) before starting,
  // so resume, volume, subtitles and quality are right from the first frame.
  const ready = useSyncExternalStore(subscribeUserData, isUserDataReady, () => false);


  if (!ready) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" aria-busy="true" aria-label="Loading player">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  // Paid access is checked by the watch page on the server (getWatchAccess) before this player
  // is rendered, so anyone who gets here may watch.

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <PlayerInfoProvider title={title} playback={playback}>
        <VideoPlayer title={title.title} poster={playback.poster}>
          <Container
            data-theme="default"
            data-preset="video"
            className={cn(
              "h-full w-full rounded-none pointer-fine:not-data-controls-visible:cursor-none",
              // Yellow for primary parts (progress fill, thumb, big play, checked items) and focus
              // rings; menu highlights keep the skin's subtle accent so text stays readable.
              "[--media-primary:var(--primary)] [--media-primary-foreground:var(--primary-foreground)] [--media-ring:var(--primary)]",
              // Larger Netflix-sized controls
              "[--media-control-size:2.75rem] [--media-icon-size:1.6rem] sm:[--media-control-size:3.25rem] sm:[--media-icon-size:1.9rem]",
              // Lift subtitles above the bottom bar while controls are showing
              "[--media-caption-controls-y:-7.5rem] sm:[--media-caption-controls-y:-8.5rem]",
              // (the skin sets its own offset on <video> for narrow players; use ours there too)
              "data-controls-visible:[&_video]:[--media-caption-track-y:var(--media-caption-controls-y)]"
            )}
          >
            <HlsJsVideo
              source={{ src: playback.src, ...qualityOptions[quality]?.source }}
              crossOrigin="anonymous"
              playsInline
              autoPlay
              className="h-full w-full"
            >
              <track kind="metadata" label="thumbnails" src={playback.storyboard} default />
              {/* Subtitle files added in admin; they join the stream's own tracks in the menu. */}
              {playback.subtitles?.map((t) => (
                <track key={t.url} kind="subtitles" label={t.label} srcLang={t.lang} src={t.url} />
              ))}
            </HlsJsVideo>
            <Poster />
            <BufferingIndicator />
            <ErrorDialog />
            <PausedOverlay />
            <NetflixControls />
            <SkipIntroButton />
            <NextEpisodeCard />
            <ResumeManager />
            <PlayerHotkeys />
            <PlayerGestures />
            <VideoStatusIndicators />
            <PlayerPreferences />
            <DevProbe />
            <FatalErrorWatcher onError={onFatalError} />
            {overlay}
          </Container>
        </VideoPlayer>
      </PlayerInfoProvider>
    </div>
  );
}
