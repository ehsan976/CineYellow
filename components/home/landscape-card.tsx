"use client";

import type { RowItem } from "@/lib/types";
import Image from "next/image";
import { Play } from "lucide-react";

import { titleSizeClass } from "@/lib/ui";
import { useApp } from "@/components/providers/app-context";
import { ListButton } from "@/components/common/list-button";
import { Badge } from "@/components/ui/badge";
import { CarouselItem } from "@/components/ui/carousel";

export function CardBadges({ badge, watchNow, compact = false }: { badge?: string; watchNow?: boolean; compact?: boolean }) {
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

export function LandscapeCard({ item }: { item: RowItem }) {
  const { openTitle } = useApp();
  const { title } = item;

  return (
    <CarouselItem className="basis-[72%] pl-2 sm:basis-[45%] md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
      <div className="group/card relative aspect-video overflow-hidden rounded-md bg-card ring-1 ring-white/5 transition-all duration-300 hover:ring-2 hover:ring-primary">
        <button
          type="button"
          onClick={() => openTitle(title.id, title)}
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
          {/* Backdrops have no title art, so the name goes on top: smaller as it gets longer, max 2 lines. */}
          <span
            title={title.title}
            className={`absolute right-3 bottom-6 left-3 line-clamp-2 text-right leading-[1.05] font-black tracking-tight text-balance uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] ${titleSizeClass(title.title, "card")}`}
          >
            {title.title}
          </span>
          <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
            <Play className="size-5 fill-current" />
          </span>
          <CardBadges badge={item.badge} watchNow={item.watchNow} />
        </button>
        <ListButton titleId={title.id} name={title.title} className={`absolute top-2 right-2 ${listButtonReveal}`} />
      </div>
    </CarouselItem>
  );
}
