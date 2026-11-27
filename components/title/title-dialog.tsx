"use client";

import type { Title, Trailer, WatchProviders } from "@/lib/types";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, X } from "lucide-react";

import { metaLine, typeLabels } from "@/lib/titles";
import { getKnownTitle, useTitleDetails } from "@/lib/stores/title-store";
import { titleSizeClass } from "@/lib/ui";
import { useApp } from "@/components/providers/app-context";
import { ListButton } from "@/components/common/list-button";
import { TrailerButton } from "@/components/title/trailer-button";
import { WhereToWatch } from "@/components/title/where-to-watch";
import { Details, Episodes } from "@/components/title/title-sections";
import { PlayButton } from "@/components/common/play-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TitleDialog({
  titleId,
  open,
  onOpenChange,
}: {
  titleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const details = useTitleDetails(titleId);
  if (!titleId) return null;
  // While details load, show what the card already knew (backdrop, name, overview).
  const title = details?.title ?? getKnownTitle(titleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // Phones: a full-screen sheet that slides up, like an app. sm and up: the centred popup.
        className="block max-h-[92svh] gap-0 overflow-x-hidden overflow-y-auto overscroll-contain p-0 sm:max-w-3xl max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:pb-[env(safe-area-inset-bottom)] max-sm:ring-0 max-sm:data-open:zoom-in-100 max-sm:data-open:slide-in-from-bottom-8"
      >
        {title ? (
          // key resets tabs / season when "More Like This" switches title
          <TitleDetails
            key={title.id}
            title={title}
            similar={details?.similar}
            trailer={details?.trailer}
            providers={details?.watchProviders ?? null}
            available={details?.available}
            loading={details === undefined}
          />
        ) : details === null ? (
          <div className="p-8 text-center">
            <DialogTitle className="text-xl font-bold">This title isn&apos;t available</DialogTitle>
            <DialogDescription className="mt-2">It may have been removed. Try another one.</DialogDescription>
          </div>
        ) : (
          <div className="space-y-4 p-0" aria-busy="true">
            <DialogTitle className="sr-only">Loading title</DialogTitle>
            <DialogDescription className="sr-only">Loading details</DialogDescription>
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-3 px-8 pb-8">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Play / Resume: closes the popup and opens the player. */
function PlayLink({ title, available }: { title: Title; available?: boolean }) {
  // "Where to Watch" (not on CineYellow) also closes the popup: it opens the title page.
  return (
    <DialogClose asChild>
      <PlayButton title={title} available={available} className="h-10 px-6" />
    </DialogClose>
  );
}

function TitleDetails({
  title,
  similar,
  trailer,
  providers,
  available,
  loading,
}: {
  title: Title;
  similar?: Title[];
  trailer?: Trailer | null;
  providers: WatchProviders | null;
  /** Has a video on CineYellow; undefined while details load. */
  available?: boolean;
  loading: boolean;
}) {
  const rootRef = useRef(null);
  const isShow = title.type !== "movie";

  // Jump back to the top when switching to another title.
  useEffect(() => {
    rootRef.current?.closest("[data-slot=dialog-content]")?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={rootRef}>
      {/* Backdrop */}
      {/* Taller on phones so the title and the (wrapping) buttons fit over the image. */}
      <div className="relative aspect-4/3 w-full sm:aspect-video">
        <Image
          src={title.backdrop}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-popover via-popover/30 to-transparent" />
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-primary"
          >
            <X />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>

        <div className="absolute inset-x-5 bottom-4 md:inset-x-8 md:bottom-6">
          <Badge variant="outline" className="mb-2 border-primary/60 bg-black/40 text-primary">
            {typeLabels[title.type]}
          </Badge>
          <DialogTitle
            title={title.title}
            className={`line-clamp-2 leading-[0.95] font-black tracking-tight text-balance uppercase drop-shadow-lg ${titleSizeClass(title.title, "dialog")}`}
          >
            {title.title}
          </DialogTitle>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <PlayLink title={title} available={available} />
            <TrailerButton trailer={trailer} titleName={title.title} size="default" className="h-10 px-4" />
            <ListButton titleId={title.id} name={title.title} size="lg" />
            <DialogClose asChild>
              <Button asChild variant="ghost" className="ml-auto h-10 rounded-full bg-black/40 px-4 hover:text-primary">
                <Link href={`/title/${title.id}`}>
                  Full page <ArrowUpRight />
                </Link>
              </Button>
            </DialogClose>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="grid gap-6 px-5 pt-4 pb-2 md:grid-cols-[1.7fr_1fr] md:px-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-primary">{title.match}% Match</span>
            {title.year > 0 && <span className="text-muted-foreground">{title.year}</span>}
            {title.rating && <Badge variant="outline">{title.rating}</Badge>}
            {metaLine(title) && <span className="text-muted-foreground">{metaLine(title)}</span>}
            <Badge variant="outline" className="text-[10px]">HD</Badge>
          </div>
          <DialogDescription className="mt-3 text-base leading-relaxed text-foreground/90">
            {title.description}
          </DialogDescription>
        </div>
        <dl className="space-y-2 text-sm">
          {loading && !title.cast.length ? (
            <Skeleton className="h-4 w-3/4" />
          ) : (
            title.cast.length > 0 && (
              <div>
                <dt className="inline text-muted-foreground">Cast: </dt>
                <dd className="inline">{title.cast.join(", ")}</dd>
              </div>
            )
          )}
          <div>
            <dt className="inline text-muted-foreground">Genres: </dt>
            <dd className="inline">{title.genres.join(", ")}</dd>
          </div>
        </dl>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isShow ? "episodes" : "similar"} className="px-5 pt-4 pb-8 md:px-8">
        <TabsList variant="line" className="mb-4 w-full justify-start gap-4 border-b border-border">
          {isShow && <TabsTrigger value="episodes" className="flex-none px-0 data-active:text-primary">Episodes</TabsTrigger>}
          <TabsTrigger value="similar" className="flex-none px-0 data-active:text-primary">More Like This</TabsTrigger>
          <TabsTrigger value="details" className="flex-none px-0 data-active:text-primary">Details</TabsTrigger>
        </TabsList>

        {isShow && (
          <TabsContent value="episodes">
            <Episodes title={title} />
          </TabsContent>
        )}
        <TabsContent value="similar">
          {similar ? <MoreLikeThis items={similar} /> : <Skeleton className="h-40 w-full" />}
        </TabsContent>
        <TabsContent value="details">
          <Details title={title} />
          <div className="mt-4">
            <WhereToWatch providers={providers} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MoreLikeThis({ items }: { items: Title[] }) {
  const { openTitle } = useApp();

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No similar titles yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((t) => (
        <div key={t.id} className="group/sim relative overflow-hidden rounded-lg bg-muted/50 ring-1 ring-white/5 transition hover:ring-primary">
          <button type="button" onClick={() => openTitle(t.id, t)} className="block w-full text-left">
            <span className="relative block aspect-video">
              <Image src={t.image} alt="" fill sizes="240px" className="object-cover" />
              <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {typeLabels[t.type]}
              </span>
            </span>
            <span className="block p-3">
              <span className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-primary">{t.match}%</span>
                {t.rating && <span className="rounded border border-border px-1">{t.rating}</span>}
                {t.year > 0 && <span className="text-muted-foreground">{t.year}</span>}
              </span>
              <span className="mt-1.5 block font-semibold">{t.title}</span>
              <span className="mt-1 line-clamp-3 text-xs text-muted-foreground">{t.description}</span>
            </span>
          </button>
          <ListButton titleId={t.id} name={t.title} className="absolute top-2 right-2" />
        </div>
      ))}
    </div>
  );
}
