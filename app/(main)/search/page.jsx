import { Suspense } from "react";

import { GridSkeleton } from "@/components/common/grid-skeleton";
import { SearchResults } from "@/components/browse/search-results";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-24 pb-8 md:px-10">
      {/* useSearchParams needs a Suspense boundary under cacheComponents */}
      <Suspense fallback={<GridSkeleton />}>
        <SearchResults />
      </Suspense>
    </main>
  );
}
