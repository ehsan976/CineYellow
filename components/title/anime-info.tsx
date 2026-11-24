import { connection } from "next/server";
import { ExternalLink, Sparkles } from "lucide-react";

import { getAnimeInfo, type AnimeLookup } from "@/lib/anilist/anime";
import { NextEpisode } from "@/components/title/next-episode";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Anime details from AniList for the title page. Renders at request time only, so builds and
 * prerenders never call AniList. Renders nothing when AniList has no confident match.
 */
export async function AnimeInfo(lookup: AnimeLookup) {
  await connection();
  const info = await getAnimeInfo(lookup);
  if (!info) return null;

  const rows: [string, React.ReactNode][] = [];
  if (info.score) rows.push(["Score", <span key="s" className="font-semibold text-primary">{info.score}%</span>]);
  if (info.studios.length) rows.push(["Studio", info.studios.join(", ")]);
  if (info.source) rows.push(["Source", info.source]);
  if (info.season) rows.push(["Premiered", info.season]);
  if (info.status) rows.push(["Status", info.status]);
  if (info.nextEpisode) rows.push(["Next", <NextEpisode key="n" {...info.nextEpisode} />]);

  return (
    <section aria-labelledby="anime-heading" className="border-t border-border pt-3">
      <h3 id="anime-heading" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Sparkles className="size-4" /> Anime info
      </h3>
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <a href={info.anilistUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
          AniList <ExternalLink className="size-3" />
        </a>
        {info.malUrl && (
          <a href={info.malUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
            MyAnimeList <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </section>
  );
}

export function AnimeInfoSkeleton() {
  return (
    <div className="space-y-2 border-t border-border pt-3" aria-busy="true" aria-label="Loading anime info">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
