"use client";

import { Check, Play, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useApp } from "@/components/providers/app-context";
import { notifyNoPlayback } from "@/components/site/title-sections";
import { Button } from "@/components/ui/button";

/** Play / My List / Share buttons on the full title page. */
export function TitleActions({ id, name }) {
  const { isInList, toggleList } = useApp();
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
        size="lg"
        onClick={() => notifyNoPlayback(name)}
        className="h-11 rounded-full px-7 text-base font-semibold shadow-[0_0_30px] shadow-primary/30"
      >
        <Play className="fill-current" /> Play
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => toggleList(id)}
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
