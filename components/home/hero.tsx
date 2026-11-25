"use client";

import type { FeaturedItem, Title } from "@/lib/types";
import { useEffect, useState } from "react";
import { Check, Info, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { titleSizeClass } from "@/lib/ui";
import { metaLine } from "@/lib/titles";
import { useApp } from "@/components/providers/app-context";
import { PlayButton } from "@/components/common/play-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

/** "Watch Now" opens the player (resuming when there is history); "Where to Watch" if not on the site. */
function HeroWatchButton({ title, available, className }: { title: Title; available: boolean; className?: string }) {
  return (
    <PlayButton
      title={title}
      available={available}
      className={cn("h-11 px-6 text-base", available && "shadow-[0_0_30px] shadow-primary/30", className)}
      label={(target) => (target.resume ? target.label : "Watch Now")}
    />
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
    // Phones: an app-style poster card on a soft brand glow. md and up: the full-bleed backdrop.
    <section className="relative bg-linear-to-b from-primary/20 via-primary/5 to-transparent md:bg-none">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="ml-0">
          {slides.map(({ title, tagline, available }, i) => {
            const inList = isInList(title.id);
            const meta = [title.year || "", title.rating, metaLine(title), title.genres[0]].filter(Boolean);
            return (
              <CarouselItem key={title.id} className="pl-0">
                <div className="relative px-4 pt-26 pb-10 md:h-[88svh] md:max-h-[860px] md:min-h-[640px] md:p-0 lg:min-h-[700px]">
                  {/* The card on phones; on md+ it's static, so the image and gradients fill the whole slide. */}
                  <div className="relative mx-auto aspect-2/3 w-[min(100%,22rem,calc((100svh-13rem)*2/3))] overflow-hidden rounded-xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/15 md:static md:aspect-auto md:h-full md:w-full md:overflow-visible md:rounded-none md:shadow-none md:ring-0">
                    {/* One <picture>: phones download only the poster, larger screens only the backdrop. */}
                    <picture>
                      <source media="(max-width: 767px)" srcSet={title.poster} />
                      <img
                        src={title.backdrop}
                        alt={title.title}
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : "auto"}
                        decoding="async"
                        className="absolute inset-0 size-full object-cover"
                      />
                    </picture>
                    {/* Readability gradients */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/10 to-transparent md:hidden" />
                    <div className="absolute inset-0 hidden bg-linear-to-r from-background via-background/60 to-transparent md:block" />
                    <div className="absolute inset-0 hidden bg-linear-to-t from-background via-transparent to-black/30 md:block" />

                    {/* Phones: tap the card for details; genres and two buttons along the bottom. */}
                    <button
                      type="button"
                      onClick={() => openTitle(title.id, title)}
                      aria-label={`${title.title} — details`}
                      className="absolute inset-0 md:hidden"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 md:hidden">
                      <h2 className="sr-only">{title.title}</h2>
                      {title.genres.length > 0 && (
                        <p className="flex flex-wrap items-center justify-center gap-x-2 text-center text-sm font-medium text-white/90">
                          {title.genres.slice(0, 3).map((g, gi) => (
                            <span key={g} className="flex items-center gap-2">
                              {gi > 0 && <span className="size-1 rounded-full bg-primary" />}
                              {g}
                            </span>
                          ))}
                        </p>
                      )}
                      <div className="pointer-events-auto flex w-full gap-2.5">
                        <HeroWatchButton title={title} available={available} className="h-10 flex-1 px-3 text-sm shadow-none" />
                        <Button
                          variant="secondary"
                          onClick={() => toggleList(title.id, title.title)}
                          aria-pressed={inList}
                          className={cn(
                            "h-10 flex-1 rounded-full bg-white/20 text-sm font-semibold text-white backdrop-blur hover:bg-white/30",
                            inList && "text-primary"
                          )}
                        >
                          {inList ? <Check /> : <Plus />} My List
                        </Button>
                      </div>
                    </div>

                  <div className="relative mx-auto hidden h-full max-w-[1600px] flex-col justify-end px-4 pb-28 md:flex md:px-10 md:pb-36 lg:pb-40">
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
                        <HeroWatchButton title={title} available={available} />
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
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 md:bottom-24">
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
