"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { getEpisodes, metaLine, typeLabels } from "@/lib/catalog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function notifyNoPlayback(name) {
  toast("Playback isn't available in this demo", { description: name });
}

/** Episode list with a season picker. Shared by the popup and the title page. */
export function Episodes({ title, headingClassName = "text-lg" }) {
  const [season, setSeason] = useState("1");
  const episodes = getEpisodes(title, Number(season));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-bold ${headingClassName}`}>Episodes</h3>
        {title.seasons > 1 ? (
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-36" aria-label="Season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {Array.from({ length: title.seasons }, (_, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  Season {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">Season 1</span>
        )}
      </div>
      <ol className="divide-y divide-border">
        {episodes.map((ep) => (
          <li key={ep.id}>
            <button
              type="button"
              onClick={() => notifyNoPlayback(`${title.title} · S${season} E${ep.number}`)}
              className="group/ep flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/60"
            >
              <span className="w-5 shrink-0 text-center text-xl font-bold text-muted-foreground">
                {ep.number}
              </span>
              <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-muted sm:w-36">
                <Image src={ep.image} alt="" fill sizes="144px" className="object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/ep:opacity-100">
                  <Play className="size-6 fill-primary text-primary" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">{ep.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ep.runtime}</span>
                </span>
                <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ep.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Key facts as a definition list. */
export function Details({ title }) {
  const rows = [
    ["Title", title.title],
    ["Type", typeLabels[title.type]],
    ["Year", title.year],
    ["Maturity rating", title.rating],
    [title.type === "movie" ? "Runtime" : "Seasons", metaLine(title)],
    ["Genres", title.genres.join(", ")],
    ["Cast", title.cast.join(", ")],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
