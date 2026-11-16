"use client";

import Image from "next/image";
import { Play } from "lucide-react";

import { getTitle } from "@/lib/catalog";
import { useApp } from "@/components/providers/app-context";
import { ListButton } from "@/components/site/list-button";
import { Badge } from "@/components/ui/badge";
import { CarouselItem } from "@/components/ui/carousel";

export function CardBadges({ badge, watchNow, compact = false }) {
  if (!badge) return null;
  const pad = compact ? "px-1.5 text-[10px]" : "px-2 text-[11px]";
  return (
    <span className="absolute inset-x-0 bottom-0 flex justify-center">
      <span className="flex overflow-hidden rounded-t-sm font-semibold whitespace-nowrap shadow-lg">
        <Badge className={`h-auto rounded-none py-0.5 font-bold ${pad}`}>{badge}</Badge>
        {watchNow && <span className={`bg-white py-0.5 text-black ${pad}`}>Watch Now</span>}
      </span>
    </span>
  );
}

// Visible on touch screens, hover-revealed on desktop; always visible once saved.
export const listButtonReveal =
  "md:opacity-0 md:group-hover/card:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100";

export function LandscapeCard({ item }) {
  const { openTitle } = useApp();
  const title = getTitle(item.titleId);
  if (!title) return null;

  return (
    <CarouselItem className="basis-[72%] pl-2 sm:basis-[45%] md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
      <div className="group/card relative aspect-video overflow-hidden rounded-md bg-card ring-1 ring-white/5 transition-all duration-300 hover:ring-2 hover:ring-primary">
        <button
          type="button"
          onClick={() => openTitle(title.id)}
          aria-label={`${title.title} — details`}
          className="absolute inset-0 block text-left"
        >
          <Image
            src={title.image}
            alt=""
            fill
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover/card:scale-110"
          />
          <span className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
          <span className="absolute right-3 bottom-6 left-3 text-right text-xl leading-none font-black tracking-tight uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] md:text-2xl">
            {title.title}
          </span>
          <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
            <Play className="size-5 fill-current" />
          </span>
          <CardBadges badge={item.badge} watchNow={item.watchNow} />
        </button>
        <ListButton titleId={title.id} className={`absolute top-2 right-2 ${listButtonReveal}`} />
      </div>
    </CarouselItem>
  );
}
