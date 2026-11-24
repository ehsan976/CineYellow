import type { Row as RowData } from "@/lib/types";
import { getHomePage } from "@/lib/tmdb/home";
import { Hero } from "@/components/home/hero";
import { Row } from "@/components/home/row";
import { LandscapeCard } from "@/components/home/landscape-card";
import { Top10Card } from "@/components/home/top10-card";
import { ContinueWatchingRow } from "@/components/home/continue-card";

function LandscapeRow({ row }: { row: RowData }) {
  return (
    <Row id={row.id} title={row.title} href={row.href}>
      {row.items.map((item) => (
        <LandscapeCard key={item.title.id} item={item} />
      ))}
    </Row>
  );
}

// Rows come from TMDB (cached for hours), so the whole page is part of the static shell.
export default async function Home() {
  const { featured, topRows, trendingRows, moreRows } = await getHomePage();
  const empty = !featured.length && !topRows.length && !trendingRows.length && !moreRows.length;

  return (
    <main className="overflow-x-hidden">
      {featured.length > 0 ? <Hero items={featured} /> : <div className="h-28" />}

      <div className={featured.length > 0 ? "relative z-10 -mt-12 space-y-10 md:-mt-20" : "relative z-10 space-y-10"}>
        {empty && (
          <p className="mx-auto max-w-[1600px] px-4 text-muted-foreground md:px-10">
            Couldn&apos;t load titles right now. Please try again in a minute.
          </p>
        )}

        <ContinueWatchingRow />

        {/* 1. First three landscape rows */}
        {topRows.map((row) => (
          <LandscapeRow key={row.id} row={row} />
        ))}

        {/* 2. Trending — two Top 10 rows */}
        {trendingRows.length > 0 && (
          <div id="trending" className="space-y-10 bg-linear-to-b from-transparent via-primary/[0.04] to-transparent py-4">
            {trendingRows.map((row) => (
              <Row key={row.id} id={row.id} title={row.title} href={row.href} contentClassName="-ml-2 py-2">
                {row.items.map((item, i) => (
                  <Top10Card key={item.title.id} item={item} rank={i + 1} />
                ))}
              </Row>
            ))}
          </div>
        )}

        {/* 3. Remaining rows (Anime last) */}
        {moreRows.map((row) => (
          <LandscapeRow key={row.id} row={row} />
        ))}
      </div>
    </main>
  );
}
