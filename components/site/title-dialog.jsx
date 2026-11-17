"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Play, X } from "lucide-react";

import { getTitle, metaLine, similarTitles, typeLabels } from "@/lib/catalog";
import { useApp } from "@/components/providers/app-context";
import { ListButton } from "@/components/site/list-button";
import { Details, Episodes } from "@/components/site/title-sections";
import { useWatchTarget } from "@/components/site/use-watch-target";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TitleDialog({ titleId, open, onOpenChange }) {
  const title = getTitle(titleId);
  if (!title) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block max-h-[92svh] gap-0 overflow-y-auto p-0 sm:max-w-3xl"
      >
        {/* key resets tabs / season when "More Like This" switches title */}
        <TitleDetails key={title.id} title={title} />
      </DialogContent>
    </Dialog>
  );
}

/** Play / Resume: closes the popup and opens the player. */
function PlayLink({ title }) {
  const target = useWatchTarget(title);
  return (
    <DialogClose asChild>
      <Button asChild size="lg" className="h-10 rounded-full px-6 font-semibold">
        <Link href={target.href}>
          <Play className="fill-current" /> {target.label}
        </Link>
      </Button>
    </DialogClose>
  );
}

function TitleDetails({ title }) {
  const rootRef = useRef(null);
  const isShow = title.type !== "movie";

  // Jump back to the top when switching to another title.
  useEffect(() => {
    rootRef.current?.closest("[data-slot=dialog-content]")?.scrollTo({ top: 0 });
  }, []);

  return (
    <div ref={rootRef}>
      {/* Backdrop */}
      <div className="relative aspect-video w-full">
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
            className="absolute top-3 right-3 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-primary"
          >
            <X />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>

        <div className="absolute inset-x-5 bottom-4 md:inset-x-8 md:bottom-6">
          <Badge variant="outline" className="mb-2 border-primary/60 bg-black/40 text-primary">
            {typeLabels[title.type]}
          </Badge>
          <DialogTitle className="text-3xl leading-none font-black tracking-tight uppercase drop-shadow-lg md:text-5xl">
            {title.title}
          </DialogTitle>
          <div className="mt-4 flex items-center gap-3">
            <PlayLink title={title} />
            <ListButton titleId={title.id} size="lg" />
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
            <span className="text-muted-foreground">{title.year}</span>
            <Badge variant="outline">{title.rating}</Badge>
            <span className="text-muted-foreground">{metaLine(title)}</span>
            <Badge variant="outline" className="text-[10px]">HD</Badge>
          </div>
          <DialogDescription className="mt-3 text-base leading-relaxed text-foreground/90">
            {title.description}
          </DialogDescription>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="inline text-muted-foreground">Cast: </dt>
            <dd className="inline">{title.cast.join(", ")}</dd>
          </div>
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
          <MoreLikeThis title={title} />
        </TabsContent>
        <TabsContent value="details">
          <Details title={title} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MoreLikeThis({ title }) {
  const { openTitle } = useApp();
  const items = similarTitles(title.id);

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No similar titles yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((t) => (
        <div key={t.id} className="group/sim relative overflow-hidden rounded-lg bg-muted/50 ring-1 ring-white/5 transition hover:ring-primary">
          <button type="button" onClick={() => openTitle(t.id)} className="block w-full text-left">
            <span className="relative block aspect-video">
              <Image src={t.image} alt="" fill sizes="240px" className="object-cover" />
              <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {typeLabels[t.type]}
              </span>
            </span>
            <span className="block p-3">
              <span className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-primary">{t.match}%</span>
                <span className="rounded border border-border px-1">{t.rating}</span>
                <span className="text-muted-foreground">{t.year}</span>
              </span>
              <span className="mt-1.5 block font-semibold">{t.title}</span>
              <span className="mt-1 line-clamp-3 text-xs text-muted-foreground">{t.description}</span>
            </span>
          </button>
          <ListButton titleId={t.id} className="absolute top-2 right-2" />
        </div>
      ))}
    </div>
  );
}
