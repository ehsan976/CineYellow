"use client";

import type { Playback, Title, WatchOption } from "@/lib/types";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Check, RotateCcw, Server } from "lucide-react";
import { toast } from "sonner";

import { NetflixPlayer } from "@/components/player/netflix-player";
import { EmbedWatch } from "@/components/watch/embed-watch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Plays a title's sources in ranked order (lib/server/video-sources.ts getVideoSources).
 * - Automatic: when the site player reports a fatal error, the next source takes over.
 *   (Embeds run inside the host's iframe, which doesn't report errors to the page; switch those
 *   by hand.)
 * - Manual: the "Server" menu, shown when there is more than one source.
 */
export function WatchSources({ title, playback, options }: { title: Title; playback: Playback; options: WatchOption[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const current = options[index];

  const choose = useCallback((i: number) => setIndex(i), []);

  // Fatal error in the site player: mark this source and move to the next one that hasn't failed.
  const onFatalError = useCallback(() => {
    if (!current) return;
    const nowFailed = [...new Set([...failed, current.id])];
    setFailed(nowFailed);
    const next = options.findIndex((o, i) => i !== index && !nowFailed.includes(o.id));
    if (next === -1) {
      setIndex(options.length); // past the end: "nothing could play"
      return;
    }
    toast(`${current.name} isn't working`, { description: `Switched to ${options[next].name}.` });
    setIndex(next);
  }, [current, failed, index, options]);

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">{title.title} can&apos;t play right now</h1>
        <p className="max-w-md text-white/70">
          {options.length > 1 ? "None of its servers are responding." : "Its server isn't responding."} Please try again in a few
          minutes.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setFailed([]);
              setIndex(0);
            }}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/85"
          >
            <RotateCcw className="size-4" /> Try again
          </button>
          <Link href={`/title/${title.id}`} className="rounded-md bg-white/15 px-5 py-2.5 font-semibold hover:bg-white/25">
            Back
          </Link>
        </div>
      </div>
    );
  }

  const menu = options.length > 1 && <ServerMenu options={options} index={index} failed={failed} onChoose={choose} />;

  if (current.kind === "embed") {
    return (
      <EmbedWatch
        key={current.id}
        title={title}
        playback={playback}
        url={current.embedUrl}
        providerId={current.providerId}
        header={menu}
      />
    );
  }
  return (
    <NetflixPlayer
      key={current.id}
      title={title}
      playback={current.playback}
      onFatalError={onFatalError}
      overlay={menu && <div className="absolute top-3 right-3 z-[60] sm:top-5 sm:right-5">{menu}</div>}
    />
  );
}

function ServerMenu({
  options,
  index,
  failed,
  onChoose,
}: {
  options: WatchOption[];
  index: number;
  failed: string[];
  onChoose: (i: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:border-white"
        aria-label={`Server: ${options[index].name}. Choose another server`}
      >
        <Server className="size-4" /> <span className="max-w-40 truncate">{options[index].name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[70] w-64 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Servers ({options.length})</DropdownMenuLabel>
        {options.map((o, i) => (
          <DropdownMenuItem key={o.id} onSelect={() => onChoose(i)} className="gap-2">
            <Check className={i === index ? "size-4 text-primary" : "size-4 opacity-0"} />
            <span className="flex-1 truncate">{o.name}</span>
            {failed.includes(o.id) && <span className="text-xs text-destructive">failed</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
