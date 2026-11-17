"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { BufferingIndicator, Controls, Time, TimeSlider as TimeSliderPrimitive, Tooltip, useCreateTextTrack } from "@videojs/react";

import { Button } from "@/components/videojs/ui/button";
import { ButtonTooltip } from "@/components/videojs/ui/button-tooltip";
import { CastButton } from "@/components/videojs/ui/cast-button";
import { AirPlayButton } from "@/components/videojs/ui/airplay-button";
import { FullscreenButton } from "@/components/videojs/ui/fullscreen-button";
import { PiPButton } from "@/components/videojs/ui/pip-button";
import { PlayButton } from "@/components/videojs/ui/play-button";
import { SeekButton } from "@/components/videojs/ui/seek-button";
import { TimeSlider } from "@/components/videojs/ui/time-slider";
import { VolumePopover } from "@/components/videojs/ui/volume-popover";
import { cn } from "@/lib/resolve-class-name";
import { AudioSubtitlesMenu } from "@/components/player/audio-subtitles-menu";
import { EpisodesMenu } from "@/components/player/episodes-menu";
import { NetflixSettingsMenu } from "@/components/player/netflix-settings-menu";
import { usePlayerInfo } from "@/components/player/player-context";

/** Adds the intro range as an app text track so the time slider can mark it. */
function IntroTrack() {
  const { playback } = usePlayerInfo();
  const cues = useMemo(
    () => [{ startTime: playback.intro.start, endTime: playback.intro.end, text: "Intro" }],
    [playback.intro.start, playback.intro.end]
  );
  useCreateTextTrack({ kind: "metadata", label: "intro", cues });
  return null;
}

const centerButton = cn(
  "pointer-events-auto group-not-data-visible/center:pointer-events-none",
  "rounded-media-pill! bg-black/45! text-white! backdrop-blur-sm"
);

/** Netflix-style control layout composed from the Video.js skin's components. */
export function NetflixControls() {
  const router = useRouter();
  const { title, playback } = usePlayerInfo();

  return (
    <Controls.Root>
      <IntroTrack />

      {/* Center: big play before start / on touch, with ∓10s on touch screens */}
      <BufferingIndicator className="group/buffering contents">
        <Controls.Group
          className={cn(
            "group/center pointer-events-none absolute top-1/2 left-1/2 z-30 flex -translate-1/2 items-center gap-10",
            "transition-[opacity,scale] duration-300 ease-out not-data-visible:scale-95 not-data-visible:opacity-0",
            "group-data-visible/buffering:hidden"
          )}
        >
          <SeekButton seconds={-10} className={cn(centerButton, "pointer-fine:hidden! group-not-data-started/center:hidden! size-14!")} />
          <PlayButton
            className={cn(
              "pointer-events-auto group-not-data-visible/center:pointer-events-none rounded-media-pill! size-auto! p-5!",
              "bg-media-primary! text-media-primary-foreground! shadow-[0_0_40px] shadow-primary/40",
              "pointer-fine:data-started:not-focus-visible:pointer-events-none! pointer-fine:data-started:not-focus-visible:opacity-0!"
            )}
            iconClassName="size-10!"
          />
          <SeekButton seconds={10} className={cn(centerButton, "pointer-fine:hidden! group-not-data-started/center:hidden! size-14!")} />
        </Controls.Group>
      </BufferingIndicator>

      {/* Netflix scrims at the top and bottom */}
      <Controls.Backdrop
        className={cn(
          "pointer-events-none absolute inset-0 z-10",
          "bg-[linear-gradient(to_bottom,rgb(0_0_0/0.75),transparent_24%,transparent_58%,rgb(0_0_0/0.9))]",
          "transition-opacity duration-300 ease-out not-data-visible:opacity-0"
        )}
      />

      <Controls.Content
        className={cn(
          "group/controls pointer-events-none absolute inset-0 z-30 flex flex-col justify-between text-white text-shadow-media",
          "transition-opacity duration-300 ease-out not-data-visible:opacity-0",
          "not-data-started:[visibility:var(--media-controls-before-start,hidden)]"
        )}
      >
        <Tooltip.Provider>
          {/* Top bar */}
          <div className="pointer-events-auto flex items-start justify-between gap-4 p-3 sm:p-5 group-not-data-visible/controls:pointer-events-none">
            <Link
              href={`/title/${title.id}`}
              onClick={(e) => {
                // Prefer going back in history (like Netflix) when we came from inside the site.
                if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
                  e.preventDefault();
                  router.back();
                }
              }}
              aria-label={`Back to ${title.title}`}
              className="rounded-full p-2 transition hover:scale-110 hover:text-primary focus-visible:ring-3 focus-visible:ring-primary/60 focus-visible:outline-none"
            >
              <ArrowLeft className="size-8 sm:size-9" />
            </Link>
            <div className="flex items-center gap-1">
              <span className="me-2 hidden text-right text-[11px] text-white/55 md:block">{playback.credit}</span>
              <ButtonTooltip side="bottom">
                <CastButton />
              </ButtonTooltip>
              <ButtonTooltip side="bottom">
                <AirPlayButton />
              </ButtonTooltip>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pointer-events-auto px-3 pb-3 sm:px-6 sm:pb-5 group-not-data-visible/controls:pointer-events-none">
            <div className="flex items-center gap-3 sm:gap-4">
              <TimeSlider className="min-w-0! flex-1">
                <TimeSliderPrimitive.Markers
                  filter={{ label: "intro" }}
                  renderMarker={(props) => (
                    <div
                      {...props}
                      title="Intro"
                      className="pointer-events-none absolute top-1/2 z-[1] h-1 -translate-y-1/2 rounded-full bg-primary/55 [left:var(--media-slider-marker-start)] [width:var(--media-slider-marker-width)]"
                    />
                  )}
                />
              </TimeSlider>
              <Time.Value type="remaining" className="shrink-0 text-sm tabular-nums sm:text-base" />
            </div>

            <div className="mt-1 flex items-center gap-1 sm:gap-2">
              <ButtonTooltip side="top">
                <PlayButton />
              </ButtonTooltip>
              {/* Narrow (phone) players: ∓10 live in the center, volume is the hardware buttons */}
              <ButtonTooltip side="top">
                <SeekButton seconds={-10} className="media-max-md:hidden" />
              </ButtonTooltip>
              <ButtonTooltip side="top">
                <SeekButton seconds={10} className="media-max-md:hidden" />
              </ButtonTooltip>
              <VolumePopover className="media-max-md:hidden" />

              <p className="mx-2 hidden min-w-0 flex-1 truncate text-center text-base md:block lg:text-lg">
                <span className="font-bold">{title.title}</span>
                {playback.label && <span className="ms-3 text-white/75">{playback.label}</span>}
              </p>
              <span className="flex-1 md:hidden" />

              {playback.next && (
                <ButtonTooltip label="Next Episode (N)" side="top">
                  <Button onClick={() => router.push(playback.next.href)} aria-label="Next episode">
                    <SkipForward className="size-media-icon fill-current" />
                  </Button>
                </ButtonTooltip>
              )}
              {playback.season && <EpisodesMenu />}
              <AudioSubtitlesMenu />
              <NetflixSettingsMenu />
              <ButtonTooltip side="top">
                <PiPButton className="media-max-md:hidden" />
              </ButtonTooltip>
              <ButtonTooltip side="top">
                <FullscreenButton />
              </ButtonTooltip>
            </div>
          </div>
        </Tooltip.Provider>
      </Controls.Content>
    </Controls.Root>
  );
}
