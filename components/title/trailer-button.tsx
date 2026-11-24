"use client";

import type { Trailer } from "@/lib/types";
import { useState } from "react";
import { Clapperboard, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** "Trailer" button: plays the official YouTube trailer (from TMDB) in a popup. */
export function TrailerButton({
  trailer,
  titleName,
  className,
  size = "lg",
}: {
  trailer: Trailer | null | undefined;
  titleName: string;
  className?: string;
  size?: "lg" | "default";
}) {
  const [open, setOpen] = useState(false);
  if (!trailer) return null;

  return (
    <>
      <Button
        size={size}
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn("rounded-full border-foreground/30 bg-black/30 backdrop-blur", className)}
      >
        <Clapperboard /> Trailer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="block overflow-hidden bg-black p-0 sm:max-w-4xl">
          <DialogTitle className="sr-only">{`${titleName} — ${trailer.name}`}</DialogTitle>
          <DialogDescription className="sr-only">Official trailer from YouTube</DialogDescription>
          <div className="relative aspect-video w-full">
            {/* Mounted only while open, so closing stops the video. */}
            {open && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`}
                title={`${titleName} — ${trailer.name}`}
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-primary"
            >
              <X />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
