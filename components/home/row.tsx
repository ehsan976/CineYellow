"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// At either end of a row the button is disabled: `invisible` hides it completely. (An opacity
// class alone lost to the row's hover opacity and the button's own disabled:opacity-50, leaving
// a dim dark box over the last card.)
const arrow =
  "top-0 bottom-0 z-10 hidden h-auto w-10 rounded-none border-0 bg-black/60 text-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-black/80 hover:text-primary disabled:invisible md:flex [&_svg]:size-7!";

/**
 * True once the pointer (or keyboard focus) has entered the row. Cards then load their images
 * eagerly, so the off-screen ones are ready before the arrow is pressed: otherwise a row whose
 * titles appear nowhere else (e.g. Anime) loads and decodes several large images mid-slide and
 * the animation stutters. Rows nobody touches stay lazy, so the page doesn't get heavier.
 */
const RowWarmContext = createContext(false);
export const useRowWarm = () => useContext(RowWarmContext);

/** Shared row shell: title + horizontally scrolling shadcn Carousel. */
export function Row({
  title,
  id,
  href,
  children,
  contentClassName,
}: {
  title: ReactNode;
  id: string;
  href?: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  const [warm, setWarm] = useState(false);
  const heading = (
    <>
      {title}
      <ChevronRight className="size-5 text-primary transition-transform group-hover/title:translate-x-1" />
    </>
  );

  return (
    <RowWarmContext.Provider value={warm}>
    <section
      id={id}
      className="group/row relative"
      onPointerEnter={warm ? undefined : () => setWarm(true)}
      onFocus={warm ? undefined : () => setWarm(true)}
    >
      <div className="mx-auto mb-3 flex max-w-[1600px] items-center justify-between px-4 md:px-10">
        <h2 className="text-lg font-bold md:text-xl">
          {href ? (
            <Link href={href} className="group/title flex items-center gap-1 hover:text-primary">
              {heading}
            </Link>
          ) : (
            <span className="group/title flex items-center gap-1">{heading}</span>
          )}
        </h2>
        {href && (
          <Link href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            See All
          </Link>
        )}
      </div>

      <Carousel
        opts={{ align: "start", dragFree: true, slidesToScroll: "auto" }}
        className="mx-auto max-w-[1600px] px-4 md:px-10"
      >
        <CarouselContent className={contentClassName ?? "-ml-2 py-2"}>{children}</CarouselContent>
        <CarouselPrevious className={`left-0 rounded-r-md ${arrow}`} />
        <CarouselNext className={`right-0 rounded-l-md ${arrow}`} />
      </Carousel>
    </section>
    </RowWarmContext.Provider>
  );
}
