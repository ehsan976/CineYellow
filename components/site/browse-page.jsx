"use client";

import { useState } from "react";

import { genresFor, getByType } from "@/lib/catalog";
import { gridClass } from "@/lib/ui";
import { PosterCard } from "@/components/site/poster-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const sorters = {
  popular: { label: "Most Popular", fn: (a, b) => b.popularity - a.popularity },
  newest: { label: "Newest", fn: (a, b) => b.year - a.year || b.popularity - a.popularity },
  rating: { label: "Top Rated", fn: (a, b) => b.match - a.match },
  az: { label: "A – Z", fn: (a, b) => a.title.localeCompare(b.title) },
};

export function BrowsePage({ type, heading, description }) {
  const [genre, setGenre] = useState("all");
  const [sort, setSort] = useState("popular");

  const all = getByType(type);
  const genres = genresFor(type);
  const items = all
    .filter((t) => genre === "all" || t.genres.includes(genre))
    .sort(sorters[sort].fn);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">{heading}</h1>
        <span className="mt-3 block h-1 w-16 rounded-full bg-primary" />
        <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
      </header>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <ToggleGroup
          type="single"
          value={genre}
          onValueChange={(v) => v && setGenre(v)}
          aria-label="Filter by genre"
          className="w-full flex-wrap md:w-auto"
        >
          {["all", ...genres].map((g) => (
            <ToggleGroupItem
              key={g}
              value={g}
              className="h-8 rounded-full border border-border px-3.5 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {g === "all" ? "All" : g}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {items.length} title{items.length === 1 ? "" : "s"}
          </span>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {Object.entries(sorters).map(([key, s]) => (
                <SelectItem key={key} value={key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={gridClass}>
        {items.map((t, i) => (
          <PosterCard key={t.id} title={t} priority={i < 6} />
        ))}
      </div>
    </div>
  );
}
