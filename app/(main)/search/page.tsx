import { Suspense } from "react";

import { searchTitles } from "@/lib/tmdb/catalog";
import { getTopPicks } from "@/lib/tmdb/home";
import { GridSkeleton } from "@/components/common/grid-skeleton";
import { SearchResults } from "@/components/browse/search-results";

export const metadata = { title: "Search" };

type SearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function SearchPage({ searchParams }: SearchProps) {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      {/* The query is read inside Suspense so the App Shell stays shared (cacheComponents). */}
      <Suspense fallback={<GridSkeleton />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchContent({ searchParams }: SearchProps) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 80) ?? "";
  const [results, topPicks] = await Promise.all([q ? searchTitles(q) : [], q ? [] : getTopPicks(12)]);
  return <SearchResults q={q} results={results} topPicks={topPicks} />;
}
