"use client";

import { MessageSquareText } from "lucide-react";
import { AudioTrackRadioGroup } from "@videojs/react/ui/audio-track-radio-group";
import { CaptionsRadioGroup } from "@videojs/react/ui/captions-radio-group";

import { RadioItem } from "@/components/videojs/ui/radio-item";
import { PlayerMenu } from "@/components/player/player-menu";

const columnTitle = "mb-1.5 px-2.5 text-sm font-bold tracking-wide text-media-primary";
const optionsClass = "flex max-h-[min(22rem,calc(var(--media-menu-available-height,30rem)-4rem))] flex-col gap-0.5 overflow-y-auto pe-1";

/** Netflix-style "Audio & Subtitles" panel: two columns of Video.js radio groups. */
export function AudioSubtitlesMenu({ className }) {
  return (
    <PlayerMenu
      label="Audio & Subtitles"
      className={className}
      icon={<MessageSquareText className="size-media-icon" />}
      popupClassName="w-[min(34rem,var(--media-menu-available-width,34rem))]"
    >
      <div className="grid grid-cols-2 gap-3">
        <section aria-label="Audio">
          <h3 className={columnTitle}>Audio</h3>
          <AudioTrackRadioGroup.Root>
            <AudioTrackRadioGroup.Options
              className={optionsClass}
              renderItem={(props, item) => (
                <RadioItem {...props}>
                  {/* Track names come straight from the stream */}
                  <span className="truncate">{item.label}</span>
                </RadioItem>
              )}
            />
          </AudioTrackRadioGroup.Root>
        </section>
        <section aria-label="Subtitles">
          <h3 className={columnTitle}>Subtitles</h3>
          <CaptionsRadioGroup.Root>
            <CaptionsRadioGroup.Options
              className={optionsClass}
              renderItem={(props, item) => (
                <RadioItem {...props}>
                  <span className="truncate">{item.label}</span>
                </RadioItem>
              )}
            />
          </CaptionsRadioGroup.Root>
        </section>
      </div>
    </PlayerMenu>
  );
}
