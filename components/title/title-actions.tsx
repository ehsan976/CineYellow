"use client";

import type { Title, Trailer } from "@/lib/types";
import { Check, Play, Plus, Server, Share2 } from "lucide-react";
import { toast } from "sonner";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/app-context";
import { useWatchTarget } from "@/hooks/use-watch-target";
import { TrailerButton } from "@/components/title/trailer-button";
import { Button } from "@/components/ui/button";

/** Play / Trailer / My List / Share buttons on the full title page. */
export function TitleActions({ title, trailer }: { title: Title; trailer?: Trailer | null }) {
  const { id, title: name } = title;
  const { isInList, toggleList } = useApp();
  const target = useWatchTarget(title);
  const inList = isInList(id);

  async function share() {
    const url = window.location.href;
    try {
      // Native share sheet on phones/tablets; desktops just copy the link.
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: url });
    } catch (err) {
      if (err?.name !== "AbortError") toast("Couldn't share this link", { description: url });
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        asChild
        size="lg"
        className="h-11 rounded-full px-7 text-base font-semibold shadow-[0_0_30px] shadow-primary/30"
      >
        <Link href={target.href}>
          <Play className="fill-current" /> {target.label}
        </Link>
      </Button>
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-11 rounded-full border-foreground/30 bg-black/30 px-5 text-base backdrop-blur hover:border-primary hover:text-primary"
      >
        <Link href={`${target.href}${target.href.includes("?") ? "&" : "?"}player=embed`}>
          <Server className="size-4 text-primary" /> Embed Stream
        </Link>
      </Button>
      <TrailerButton trailer={trailer} titleName={name} className="h-11 px-6 text-base" />
      <Button
        size="lg"
        variant="outline"
        onClick={() => toggleList(id, name)}
        aria-pressed={inList}
        className={cn(
          "h-11 rounded-full border-foreground/30 bg-black/30 px-6 text-base backdrop-blur",
          inList && "border-primary text-primary"
        )}
      >
        {inList ? <Check /> : <Plus />} {inList ? "In My List" : "My List"}
      </Button>
      <Button
        size="lg"
        variant="ghost"
        onClick={share}
        className="h-11 rounded-full px-5 text-base"
      >
        <Share2 /> Share
      </Button>
    </div>
  );
}
