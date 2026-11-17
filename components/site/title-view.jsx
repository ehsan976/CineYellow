import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { metaLine, similarTitles, typeLabels } from "@/lib/catalog";
import { gridClass } from "@/lib/ui";
import { PosterCard } from "@/components/site/poster-card";
import { TitleActions } from "@/components/site/title-actions";
import { Details, Episodes } from "@/components/site/title-sections";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const sectionFor = { movie: ["Movies", "/movies"], series: ["Series", "/series"], anime: ["Anime", "/anime"] };

const initials = (name) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

/** Full, shareable page for one title: /title/[id] */
export function TitleView({ title }) {
  const [sectionName, sectionHref] = sectionFor[title.type];
  const isShow = title.type !== "movie";
  const similar = similarTitles(title.id, 12);

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative h-[72svh] max-h-[780px] min-h-[540px] w-full">
        <Image src={title.backdrop} alt="" fill preload sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-black/40" />

        <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-4 pb-10 md:px-10 md:pb-14">
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="size-3.5" />
            <Link href={sectionHref} className="hover:text-primary">{sectionName}</Link>
            <ChevronRight className="size-3.5" />
            <span className="truncate text-foreground" aria-current="page">{title.title}</span>
          </nav>

          <div className="max-w-2xl">
            <Badge className="mb-4 rounded-md px-2.5 tracking-[0.2em] uppercase">{typeLabels[title.type]}</Badge>
            <h1 className="text-5xl leading-[0.95] font-black tracking-tight uppercase sm:text-6xl md:text-7xl">
              {title.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm">
              <span className="font-semibold text-primary">{title.match}% Match</span>
              <span className="text-muted-foreground">{title.year}</span>
              <Badge variant="outline">{title.rating}</Badge>
              <span className="text-muted-foreground">{metaLine(title)}</span>
              <Badge variant="outline" className="text-[10px]">HD</Badge>
            </div>
            <p className="mt-4 text-base leading-relaxed text-foreground/90 md:text-lg">{title.description}</p>
            <div className="mt-7">
              <TitleActions title={title} />
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 pt-6 md:px-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          {isShow && (
            <section>
              <Episodes title={title} headingClassName="text-2xl" />
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
