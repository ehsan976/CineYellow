"use client";

import type { BrowseSort, CatalogPage, GenreOption, TitleType } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { gridClass } from "@/lib/ui";
import { PosterCard } from "@/components/common/poster-card";
import { GridSkeleton } from "@/components/common/grid-skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const sortLabels: Record<BrowseSort, string> = {
  popular: "Most Popular",
  newest: "Newest",
  rating: "Top Rated",
  az: "A – Z",
};

async function fetchPage(type: TitleType, genre: string, sort: BrowseSort, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ type, genre, sort, page: String(page) });
  const res = await fetch(`/api/catalog/discover?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as CatalogPage;
}

/**
 * Movies / Series / Anime grid. The first page (popular, all genres) comes from the server;
 * changing the genre or sort, and "Load more", fetch from /api/catalog/discover.
 */
export function BrowsePage({
  type,
  heading,
  description,
  initial,
  genres,
}: {
  type: TitleType;
  heading: string;
  description: string;
  initial: CatalogPage;
  genres: GenreOption[];
}) {
  const [genre, setGenre] = useState("all");
  const [sort, setSort] = useState<BrowseSort>("popular");
  const [data, setData] = useState<CatalogPage>(initial);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    // The initial page is already rendered by the server.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetchPage(type, genre, sort, 1, controller.signal)
      .then(setData)
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [type, genre, sort]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await fetchPage(type, genre, sort, data.page + 1);
      setData((prev) => {
        const seen = new Set(prev.items.map((t) => t.id));
        return { ...next, items: [...prev.items, ...next.items.filter((t) => !seen.has(t.id))] };
      });
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const { items } = data;
  const total = data.totalResults;

  return (
    <div>
      <header className="mb-4 md:mb-6">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl md:text-5xl">{heading}</h1>
        <span className="mt-3 block h-1 w-16 rounded-full bg-primary" />
        <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
      </header>

      <div className="mb-5 flex flex-col gap-3 md:mb-8 md:flex-row md:items-start md:justify-between md:gap-4">
        <ToggleGroup
          type="single"
          value={genre}
          onValueChange={(v) => v && setGenre(v)}
          aria-label="Filter by genre"
          // Phones: one swipeable line of chips, edge to edge. md and up: wrapped.
          className="scrollbar-none -mx-4 w-[calc(100%+2rem)] flex-nowrap justify-start overflow-x-auto px-4 md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0"
        >
          {[{ value: "all", label: "All" }, ...genres].map((g) => (
            <ToggleGroupItem
              key={g.value}
              value={g.value}
              className="h-8 shrink-0 rounded-full border border-border px-3.5 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {g.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex shrink-0 items-center justify-between gap-3 md:justify-start">
          <span className="text-sm text-muted-foreground">
            {total.toLocaleString("en-US")} title{total === 1 ? "" : "s"}
          </span>
          <Select value={sort} onValueChange={(v) => setSort(v as BrowseSort)}>
            <SelectTrigger className="w-40" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {Object.entries(sortLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : items.length ? (
        <>
          <div className={gridClass}>
            {items.map((t, i) => (
              <PosterCard key={t.id} title={t} priority={i < 6} />
            ))}
          </div>
          {data.page < data.totalPages && (
            <div className="mt-10 flex justify-center">
              <Button variant="outline" size="lg" className="rounded-full px-8" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="animate-spin" />} Load more
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="py-16 text-center text-muted-foreground">
          {error ? "Couldn't load titles. Please try again." : "No titles found for this filter."}
        </p>
      )}
      {error && items.length > 0 && !loading && (
        <p className="mt-4 text-center text-sm text-muted-foreground">Couldn&apos;t load more titles. Please try again.</p>
      )}
    </div>
  );
}
