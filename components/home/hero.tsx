"use client";

import type { FeaturedItem, Title } from "@/lib/types";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Info, Play, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { titleSizeClass } from "@/lib/ui";
import { metaLine } from "@/lib/titles";
import { useApp } from "@/components/providers/app-context";
import { useWatchTarget } from "@/hooks/use-watch-target";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

/** "Watch Now" opens the player (resuming when there is history). */
function HeroWatchButton({ title }: { title: Title }) {
  const target = useWatchTarget(title);
  return (
    <Button
      asChild
      size="lg"
      className="h-11 rounded-full px-6 text-base font-semibold shadow-[0_0_30px] shadow-primary/30"
    >
      <Link href={target.href}>
        <Play className="fill-current" /> {target.resume ? target.label : "Watch Now"}
      </Link>
    </Button>
  );
}

export function Hero({ items }: { items: FeaturedItem[] }) {
  const { openTitle, isInList, toggleList } = useApp();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    const timer = setInterval(() => api.scrollNext(), 7000);
    return () => {
      clearInterval(timer);
      api.off("select", onSelect);
    };
  }, [api]);

  const slides = items;

  return (
    <section className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="ml-0">
          {slides.map(({ title, tagline }, i) => {
            const inList = isInList(title.id);
            const meta = [title.year || "", title.rating, metaLine(title), title.genres[0]].filter(Boolean);
            return (
              <CarouselItem key={title.id} className="pl-0">
                <div className="relative h-[75svh] max-h-[860px] min-h-[600px] w-full md:h-[88svh] md:min-h-[640px] lg:min-h-[700px]">
                  <Image
                    src={title.backdrop}
                    alt={title.title}
                    fill
                    preload={i === 0}
                    sizes="100vw"
                    className="object-cover"
                  />
                  {/* Readability gradients */}
                  <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent" />
                  <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-black/30" />

                  <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-4 pb-28 md:px-10 md:pb-36 lg:pb-40">
                    <div className="max-w-xl">
                      <Badge className="mb-4 rounded-md px-2.5 tracking-[0.2em] uppercase">
                        Featured
                      </Badge>
                      <h1
                        title={title.title}
                        className={cn(
                          "line-clamp-3 leading-[0.95] font-black tracking-tight text-balance uppercase",
                          titleSizeClass(title.title, "hero")
                        )}
                      >
                        {title.title}
                      </h1>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">{title.match}% Match</span>
                        {meta.map((m, i) => (
                          <span key={i} className="flex items-center gap-2">
                            <span className="size-1 rounded-full bg-primary" />
                            {m}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 max-w-md text-base text-foreground/85 md:text-lg">{tagline}</p>
                      <div className="mt-7 flex flex-wrap gap-3">
                        <HeroWatchButton title={title} />
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => toggleList(title.id, title.title)}
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
                          onClick={() => openTitle(title.id, title)}
                          className="hidden h-11 rounded-full px-5 text-base sm:inline-flex"
                        >
                          <Info /> More Info
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="absolute inset-x-0 bottom-16 z-20 flex justify-center gap-2 md:bottom-24">
        {slides.map(({ title }, i) => (
          <button
            key={title.id}
            onClick={() => api?.scrollTo(i)}
            aria-label={`Show ${title.title}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              current === i ? "w-8 bg-primary" : "w-3 bg-foreground/40 hover:bg-foreground/70"
            )}
          />
        ))}
      </div>
    </section>
  );
}
