"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, X } from "lucide-react";
import { useHotkey } from "@videojs/react";
import { usePlayer } from "@videojs/react/video";

import { Button } from "@/components/ui/button";
import { useAutoplayNext, usePlayerInfo } from "@/components/player/player-context";

const COUNTDOWN = 10;

/**
 * Appears when the end credits start (or the video ends). Series: "Next Episode" with a
 * countdown that autoplays when the preference is on. Movies: a way back to the title.
 */
export function NextEpisodeCard() {
  const { title, playback } = usePlayerInfo();
  const router = useRouter();
  const currentTime = usePlayer((s) => s.currentTime);
  const ended = usePlayer((s) => s.ended);
  const [dismissed, setDismissed] = useState(false);
  const inCredits = currentTime >= playback.creditsAt || ended;

  // Seeking back before the credits brings the card back next time.
  if (dismissed && !inCredits) setDismissed(false);

  const next = playback.next;
  const goNext = () => next && router.push(next.href);

  // "n" plays the next episode at any time.
  useHotkey({ keys: "n", target: "document", disabled: !next, onActivate: goNext });

  if (!inCredits || dismissed) return null;

  if (!next) {
    return (
      <aside className="absolute right-4 bottom-32 z-40 w-[min(22rem,calc(100%-2rem))] rounded-xl bg-black/80 p-5 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur sm:right-10 sm:bottom-36">
        <p className="text-sm font-semibold text-primary">{title.type === "movie" ? "Thanks for watching" : "You finished the season"}</p>
        <p className="mt-1 text-lg font-bold">{title.title}</p>
        <div className="mt-4 flex gap-2">
          <Button asChild className="rounded-full">
            <Link href={`/title/${title.id}`}>Back to {title.type === "movie" ? "movie" : "series"}</Link>
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => setDismissed(true)}>
            Watch credits
          </Button>
        </div>
      </aside>
    );
  }

  return <Countdown next={next} onPlay={goNext} onCancel={() => setDismissed(true)} />;
}

function Countdown({ next, onPlay, onCancel }) {
  const autoplayNext = useAutoplayNext();
  const paused = usePlayer((s) => s.paused);
  const ended = usePlayer((s) => s.ended);
  const [left, setLeft] = useState(COUNTDOWN);
  const counting = autoplayNext && left > 0 && (!paused || ended);
  const fired = useRef(false);

  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [counting]);

  // Navigate exactly once when the countdown reaches zero.
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      onPlay();
    }
  }, [left, onPlay]);

  const progress = (COUNTDOWN - left) / COUNTDOWN;

  return (
    <aside
      aria-live="polite"
      className="absolute right-4 bottom-32 z-40 w-[min(24rem,calc(100%-2rem))] overflow-hidden rounded-xl bg-black/85 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur sm:right-10 sm:bottom-36"
    >
      <div className="relative aspect-video w-full">
        <Image src={next.data.image} alt="" fill sizes="384px" className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
        <span className="absolute top-3 left-3 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-primary">
          Next Episode
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Hide next episode"
          className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 hover:text-primary"
        >
          <X className="size-4" />
        </button>
        <div className="absolute inset-x-4 bottom-3">
          <p className="text-xs text-white/70">
            Season {next.season} · Episode {next.episode} · {next.data.runtime}
          </p>
          <p className="text-lg font-bold leading-tight">{next.data.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={onPlay}
          className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-md bg-white px-4 py-2.5 font-bold text-black transition hover:bg-primary"
        >
          {/* Fill sweeps across the button as the countdown runs */}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: autoplayNext ? `${progress * 100}%` : "0%" }}
          />
          <Play className="relative size-4 fill-current" />
          <span className="relative">
            {autoplayNext ? `Next episode in ${left}` : "Play next episode"}
          </span>
        </button>
        <Button variant="ghost" onClick={onCancel} className="text-white hover:text-primary">
          Watch credits
        </Button>
      </div>
    </aside>
  );
}
