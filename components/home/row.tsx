import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const arrow =
  "top-0 bottom-0 z-10 hidden h-auto w-10 rounded-none border-0 bg-black/60 text-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-black/80 hover:text-primary disabled:opacity-0 md:flex [&_svg]:size-7!";

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
  const heading = (
    <>
      {title}
      <ChevronRight className="size-5 text-primary transition-transform group-hover/title:translate-x-1" />
    </>
  );

  return (
    <section id={id} className="group/row relative">
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
  );
}
