import {
  featured,
  moreRows,
  topRows,
  trendingRows,
} from "@/lib/data";
import { Hero } from "@/components/site/hero";
import { Row } from "@/components/site/row";
import { LandscapeCard } from "@/components/site/landscape-card";
import { Top10Card } from "@/components/site/top10-card";
import { ContinueWatchingItems } from "@/components/site/continue-card";

function LandscapeRow({ row }) {
  return (
    <Row id={row.id} title={row.title} href={row.href}>
      {row.items.map((item) => (
        <LandscapeCard key={item.titleId} item={item} />
      ))}
    </Row>
  );
}

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <Hero items={featured} />

      <div className="relative z-10 -mt-12 space-y-10 md:-mt-20">
        <Row id="continue" title="Continue Watching" contentClassName="-ml-3 py-2">
          <ContinueWatchingItems />
        </Row>

        {/* 1. First three landscape rows */}
        {topRows.map((row) => (
          <LandscapeRow key={row.id} row={row} />
        ))}

        {/* 2. Trending — two Top 10 rows */}
        <div id="trending" className="space-y-10 bg-linear-to-b from-transparent via-primary/[0.04] to-transparent py-4">
          {trendingRows.map((row) => (
            <Row key={row.id} id={row.id} title={row.title} href={row.href} contentClassName="-ml-2 py-2">
              {row.items.map((item, i) => (
                <Top10Card key={item.titleId} item={item} rank={i + 1} />
              ))}
            </Row>
          ))}
        </div>

        {/* 3. Remaining rows (Anime last) */}
        {moreRows.map((row) => (
          <LandscapeRow key={row.id} row={row} />
        ))}
      </div>
    </main>
  );
}
