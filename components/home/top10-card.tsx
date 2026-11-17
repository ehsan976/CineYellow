"use client";

import type { RowItem } from "@/lib/types";
import Image from "next/image";

import { getTitle } from "@/lib/data/catalog";
import { useApp } from "@/components/providers/app-context";
import { CardBadges, listButtonReveal } from "@/components/home/landscape-card";
import { ListButton } from "@/components/common/list-button";
import { CarouselItem } from "@/components/ui/carousel";

export function Top10Card({ item, rank }: { item: RowItem; rank: number }) {
  const { openTitle } = useApp();
  const title = getTitle(item.titleId);
  if (!title) return null;

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
            onClick={() => openTitle(title.id)}
            aria-label={`Number ${rank}: ${title.title} — details`}
            className="absolute inset-0 block text-left"
          >
            <Image
              src={title.poster}
              alt=""
              fill
              sizes="(max-width: 640px) 40vw, (max-width: 1024px) 20vw, 12vw"
              className="object-cover transition-transform duration-500 group-hover/card:scale-110"
            />
            <span className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
            <span className="absolute inset-x-2 bottom-7 text-center text-sm leading-none font-black uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] md:text-base">
              {title.title}
            </span>
            <CardBadges badge={item.badge} watchNow={item.watchNow} compact />
          </button>
          <ListButton titleId={title.id} className={`absolute top-2 right-2 ${listButtonReveal}`} />
        </div>
      </div>
    </CarouselItem>
  );
}
