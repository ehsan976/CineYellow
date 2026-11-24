"use client";

import type { ElementType } from "react";
import type { Title } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { metaLine, typeLabels } from "@/lib/titles";
import { useApp } from "@/components/providers/app-context";
import { listButtonReveal } from "@/components/home/landscape-card";
import { ListButton } from "@/components/common/list-button";

/**
 * Portrait card used on the Movies / Series / Anime, Search and My List grids.
 * Opens the detail popup, or navigates to the full title page when `asLink` is set.
 */
export function PosterCard({ title, priority = false, asLink = false }: { title: Title; priority?: boolean; asLink?: boolean }) {
  const { openTitle } = useApp();
  const Body: ElementType = asLink ? Link : "button";
  const bodyProps: Record<string, unknown> = asLink
    ? { href: `/title/${title.id}` }
    : { type: "button", onClick: () => openTitle(title.id, title) };

  return (
    <div className="group/card relative">
      <Body
        {...bodyProps}
        aria-label={`${title.title} — details`}
        className="block w-full text-left"
      >
        <span className="relative block aspect-2/3 overflow-hidden rounded-md bg-card ring-1 ring-white/5 transition-all duration-300 group-hover/card:ring-2 group-hover/card:ring-primary">
          <Image
            src={title.poster}
            alt=""
            fill
            loading={priority ? "eager" : undefined}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover transition-transform duration-500 group-hover/card:scale-110"
          />
          <span className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
          <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase">
            {typeLabels[title.type]}
          </span>
          <span className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
            <Play className="size-5 fill-current" />
          </span>
        </span>
        {/* Under the poster, not on it: TMDB posters already show the name as artwork. */}
        <span title={title.title} className="mt-2 block truncate text-sm font-semibold">
          {title.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">{title.match}%</span>
          {title.year > 0 && <span>{title.year}</span>}
          {metaLine(title) && (
            <>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span>{metaLine(title)}</span>
            </>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {title.genres.join(" · ")}
        </span>
      </Body>
      <ListButton titleId={title.id} name={title.title} className={`absolute top-2 right-2 ${listButtonReveal}`} />
    </div>
  );
}
