"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";

import { getTitle } from "@/lib/data/catalog";
import { gridClass } from "@/lib/ui";
import { useApp } from "@/components/providers/app-context";
import { GridSkeleton } from "@/components/common/grid-skeleton";
import { PosterCard } from "@/components/common/poster-card";
import { Button } from "@/components/ui/button";

export function MyList() {
  const { myList, hydrated } = useApp();
  const items = myList.map(getTitle).filter(Boolean);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">My List</h1>
        <span className="mt-3 block h-1 w-16 rounded-full bg-primary" />
        <p className="mt-3 text-muted-foreground">
          {hydrated && items.length
            ? `${items.length} saved title${items.length === 1 ? "" : "s"}. Saved in this browser.`
            : "Titles you save with the + button show up here."}
        </p>
      </header>

      {!hydrated ? (
        <GridSkeleton count={6} />
      ) : items.length ? (
        <div className={gridClass}>
          {items.map((t, i) => (
            <PosterCard key={t.id} title={t} priority={i < 6} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bookmark className="size-8" />
          </span>
          <h2 className="text-xl font-bold">Your list is empty</h2>
          <p className="mt-2 mb-6 max-w-sm text-muted-foreground">
            Tap the <span className="font-semibold text-primary">+</span> on any movie, series or anime to save it for later.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full px-5">
              <Link href="/movies">Browse Movies</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-5">
              <Link href="/anime">Browse Anime</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
