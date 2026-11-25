"use client";

import type { RowItem } from "@/lib/types";

import { PLACEHOLDER_POSTER } from "@/lib/titles";
import { useApp } from "@/components/providers/app-context";
import { CardBadges, listButtonReveal } from "@/components/home/landscape-card";
import { ListButton } from "@/components/common/list-button";
import { CarouselItem } from "@/components/ui/carousel";
import { CardImage } from "@/components/common/card-image";
import { useRowWarm } from "@/components/home/row";

export function Top10Card({ item, rank }: { item: RowItem; rank: number }) {
  const warm = useRowWarm();
  const { openTitle } = useApp();
  const { title } = item;

  return (
    <CarouselItem className="basis-[62%] pl-2 sm:basis-[40%] md:basis-[30%] lg:basis-[22%] xl:basis-[18%]">
      <div className="group/card relative flex justify-end">
        {/* Giant hollow rank number sits behind the poster's left edge */}
        <span
          aria-hidden
          className="text-outline pointer-events-none absolute bottom-0 left-0 text-[8.5rem] leading-[0.78] font-black tracking-[-0.08em] transition-all duration-300 select-none group-hover/card:[-webkit-text-stroke-color:var(--primary)] md:text-[10rem]"
        >
          {rank}
        </span>
        <div className="relative aspect-2/3 w-[62%] overflow-hidden rounded-md bg-card ring-1 ring-white/5 transition-all duration-300 group-hover/card:ring-2 group-hover/card:ring-primary">
          <button
            type="button"
            onClick={() => openTitle(title.id, title)}
            aria-label={`Number ${rank}: ${title.title} — details`}
            className="absolute inset-0 block text-left"
          >
            <CardImage
              src={title.poster}
              fallback={PLACEHOLDER_POSTER}
              alt=""
              fill
              sizes="(max-width: 640px) 40vw, (max-width: 1024px) 20vw, 12vw"
              loading={warm ? "eager" : "lazy"}
              className="object-cover transition-transform duration-500 group-hover/card:scale-110"
            />
            <span className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
            {/* TMDB posters already show the name; write it only on the placeholder. */}
            {title.poster === PLACEHOLDER_POSTER && (
              <span className="absolute inset-x-2 bottom-7 line-clamp-3 text-center text-sm leading-tight font-black uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] md:text-base">
                {title.title}
              </span>
            )}
            <CardBadges badge={item.badge} watchNow={item.watchNow} compact />
          </button>
          <ListButton titleId={title.id} name={title.title} className={`absolute top-2 right-2 ${listButtonReveal}`} />
        </div>
      </div>
    </CarouselItem>
  );
}
