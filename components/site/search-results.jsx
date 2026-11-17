"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";

import { searchTitles, titles } from "@/lib/catalog";
import { gridClass } from "@/lib/ui";
import { PosterCard } from "@/components/site/poster-card";
import { SearchBox } from "@/components/site/search-box";

const popularSearches = ["Anime", "Thriller", "Comedy", "Romance", "Sci-Fi", "Night", "Horror", "Sports"];

function PopularChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {popularSearches.map((term) => (
        <Link
          key={term}
          href={`/search?q=${encodeURIComponent(term)}`}
          replace
          className="rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary"
        >
          {term}
        </Link>
      ))}
    </div>
  );
}

export function SearchResults() {
  const q = useSearchParams().get("q")?.trim() ?? "";
  const results = searchTitles(q);
  const topPicks = [...titles].sort((a, b) => b.match - a.match).slice(0, 12);

  return (
    <div>
      {/* Phones and tablets get a big search box here (the navbar one is desktop only). */}
      <SearchBox autoFocus className="mb-6 lg:hidden" inputClassName="h-11 text-base" />

      {!q ? (
        <>
          <h1 className="text-2xl font-bold md:text-3xl">Search</h1>
          <p className="mt-1 text-muted-foreground">Find movies, series and anime by title, genre or cast.</p>
          <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wider text-primary uppercase">Popular searches</h2>
          <PopularChips />
          <h2 className="mt-10 mb-4 text-lg font-bold">Top picks for you</h2>
          <div className={gridClass}>
            {topPicks.map((t, i) => (
              <PosterCard key={t.id} title={t} priority={i < 6} />
            ))}
          </div>
        </>
      ) : results.length ? (
        <>
          <h1 className="text-2xl font-bold md:text-3xl">
            Results for <span className="text-primary">&ldquo;{q}&rdquo;</span>
          </h1>
          <p className="mt-1 mb-6 text-muted-foreground">
            {results.length} title{results.length === 1 ? "" : "s"} found
          </p>
          <div className={gridClass}>
            {results.map((t, i) => (
              <PosterCard key={t.id} title={t} priority={i < 6} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SearchX className="size-8" />
          </span>
          <h1 className="text-xl font-bold md:text-2xl">No titles match &ldquo;{q}&rdquo;</h1>
          <p className="mt-2 mb-6 max-w-md text-muted-foreground">
            Check the spelling, or try a genre, an actor&apos;s name or one of these:
          </p>
          <PopularChips />
        </div>
      )}
    </div>
  );
}
