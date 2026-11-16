"use client";

import Image from "next/image";
import { Play } from "lucide-react";

import { getTitle } from "@/lib/catalog";
import { useApp } from "@/components/providers/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { CarouselItem } from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";

export function ContinueCard({ item }) {
  const { openTitle } = useApp();
  const title = getTitle(item.titleId);
  if (!title) return null;

  return (
    <CarouselItem className="basis-[60%] pl-3 sm:basis-[40%] md:basis-1/4 lg:basis-1/5 xl:basis-[16%]">
      <button
        type="button"
        onClick={() => openTitle(title.id)}
        aria-label={`Continue ${title.title}`}
        className="block w-full rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Card className="group/card gap-0 py-0 transition-all hover:ring-2 hover:ring-primary">
          <div className="relative aspect-4/3 overflow-hidden">
            <Image
              src={title.image}
              alt=""
              fill
              sizes="(max-width: 640px) 60vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover/card:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
            <span className="absolute bottom-3 left-3 flex size-9 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 backdrop-blur transition-colors group-hover/card:border-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground">
              <Play className="size-4 fill-current" />
            </span>
          </div>
          <Progress value={item.progress} className="h-1 rounded-none" />
          <CardContent className="px-3 py-2.5">
            <p className="truncate font-semibold">{title.title}</p>
            <p className="text-xs text-muted-foreground">{item.info}</p>
          </CardContent>
        </Card>
      </button>
    </CarouselItem>
  );
}
