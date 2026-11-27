import type { Episode, TitleDetails } from "@/lib/types";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { metaLine, typeLabels } from "@/lib/titles";
import { gridClass, titleSizeClass } from "@/lib/ui";
import { PosterCard } from "@/components/common/poster-card";
import { TitleActions } from "@/components/title/title-actions";
import { Details, Episodes } from "@/components/title/title-sections";
import { LanguagesSkeleton, TitleLanguages } from "@/components/title/title-languages";
import { AnimeInfo, AnimeInfoSkeleton } from "@/components/title/anime-info";
import { WhereToWatch } from "@/components/title/where-to-watch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const sectionFor = { movie: ["Movies", "/movies"], series: ["Series", "/series"], anime: ["Anime", "/anime"] };

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

/** Full, shareable page for one title: /title/[id] */
export function TitleView({ details, initialEpisodes }: { details: TitleDetails; initialEpisodes?: Episode[] }) {
  const { title, similar, imdbId, trailer } = details;
  const [sectionName, sectionHref] = sectionFor[title.type];
  const isShow = title.type !== "movie";

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      {/* At least 72% of the screen (540–780px), but it grows with long names / overviews, and the
          top padding keeps the breadcrumb clear of the fixed navbar (it used to slide under it). */}
      {/* Phones: the whole 16:9 image sits under the header (96px) and the text follows below it,
          instead of a tall crop of the image hidden behind the text. md and up: full-bleed backdrop. */}
      <section className="relative flex w-full flex-col pt-24 md:min-h-[clamp(540px,72svh,780px)] md:pt-0">
        <div className="relative aspect-video w-full md:absolute md:inset-0 md:aspect-auto">
          <Image src={title.backdrop} alt="" fill preload sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent md:hidden" />
          <div className="absolute inset-0 hidden bg-linear-to-r from-background via-background/60 to-transparent md:block" />
          <div className="absolute inset-0 hidden bg-linear-to-t from-background via-background/10 to-black/30 md:block" />
        </div>

        <div className="relative mx-auto -mt-8 flex w-full max-w-[1600px] flex-1 flex-col justify-end px-4 pb-10 md:mt-0 md:px-10 md:pt-24 md:pb-14">
          <nav aria-label="Breadcrumb" className="mb-5 hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
            <Link href="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="size-3.5" />
            <Link href={sectionHref} className="hover:text-primary">{sectionName}</Link>
            <ChevronRight className="size-3.5" />
            <span className="truncate text-foreground" aria-current="page">{title.title}</span>
          </nav>

          <div className="max-w-2xl">
            <Badge className="mb-4 rounded-md px-2.5 tracking-[0.2em] uppercase">{typeLabels[title.type]}</Badge>
            <h1
              title={title.title}
              className={`line-clamp-3 leading-[0.95] font-black tracking-tight text-balance uppercase ${titleSizeClass(title.title, "page")}`}
            >
              {title.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm">
              <span className="font-semibold text-primary">{title.match}% Match</span>
              {title.year > 0 && <span className="text-muted-foreground">{title.year}</span>}
              {title.rating && <Badge variant="outline">{title.rating}</Badge>}
              {metaLine(title) && <span className="text-muted-foreground">{metaLine(title)}</span>}
              {details.available === false && (
                <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">
                  Not on CineYellow yet
                </Badge>
              )}
            </div>
            <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-foreground/90 sm:line-clamp-none sm:text-base md:text-lg">{title.description}</p>
            <div className="mt-7">
              <TitleActions title={title} trailer={trailer} available={details.available} />
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 pt-6 md:px-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          {isShow && (
            <section>
              <Episodes title={title} initialEpisodes={initialEpisodes} headingClassName="text-2xl" />
            </section>
          )}
          <section>
            <h2 className="mb-4 text-2xl font-bold">About {title.title}</h2>
            <Details title={title} />
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="gap-0 py-0">
            <div className="relative aspect-2/3 w-full">
              {/* Often the largest image in the first screen (LCP), so don't lazy-load it */}
              <Image src={title.poster} alt={`${title.title} poster`} fill loading="eager" sizes="340px" className="object-cover" />
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap gap-1.5">
                {title.genres.map((g) => (
                  <Badge key={g} variant="outline" className="border-primary/40 text-primary">{g}</Badge>
                ))}
              </div>
              {title.cast.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Cast</h3>
                  <ul className="space-y-2">
                    {title.cast.map((name) => (
                      <li key={name} className="flex items-center gap-2.5 text-sm">
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {initials(name)}
                        </span>
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <WhereToWatch providers={details.watchProviders} />
              {/* Audio / subtitle languages: read from Postgres at request time (Movie of the Night on first visit). */}
              <Suspense fallback={<LanguagesSkeleton />}>
                <TitleLanguages titleId={title.id} name={title.title} imdbId={imdbId} />
              </Suspense>
              {/* Anime: score, studio, next episode from AniList (request time; cached per title). */}
              {details.isAnime && (
                <Suspense fallback={<AnimeInfoSkeleton />}>
                  <AnimeInfo id={title.id} name={title.title} originalName={details.originalTitle} year={title.year} />
                </Suspense>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* More like this */}
      {similar.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-4 pt-14 md:px-10">
          <h2 className="mb-5 text-2xl font-bold">More Like This</h2>
          <div className={gridClass}>
            {similar.map((t) => (
              <PosterCard key={t.id} title={t} asLink />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
