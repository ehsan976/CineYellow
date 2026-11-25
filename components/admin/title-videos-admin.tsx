"use client";

import type { TitleVideoRow } from "@/lib/server/title-videos";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ChevronLeft, ChevronRight, ExternalLink, Loader2, Lock, LockOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  checkSourceAction,
  deleteTitleVideoAction,
  saveTitleVideoAction,
  updateSourceAction,
  type VideoActionResult,
} from "@/app/actions/title-videos";
import { Switch } from "@/components/ui/switch";
import { checkVideoUrl, EMBED_HOSTS, MAX_SUBTITLES } from "@/lib/videos";
import { languageName, normalizeLanguageCode } from "@/lib/languages";
import { watchHref } from "@/lib/player/playback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormState {
  /** The source being edited ("" = adding a new source). */
  id: string;
  title: string;
  season: string;
  episode: string;
  url: string;
  /** Optional name in the viewer's "Server" menu, e.g. "Hindi dub". */
  label: string;
  introStart: string;
  introEnd: string;
  creditsAt: string;
  /** Subtitle files (HLS only): language code or name + .vtt link. */
  subtitles: { lang: string; url: string }[];
}

const EMPTY: FormState = { id: "", title: "", season: "", episode: "", url: "", label: "", introStart: "", introEnd: "", creditsAt: "", subtitles: [] };

const str = (n: number | null) => (n === null || n === undefined ? "" : String(n));

const fromRow = (row: TitleVideoRow): FormState => ({
  id: row.id,
  title: row.titleId,
  season: str(row.season),
  episode: str(row.episode),
  url: row.url,
  label: row.label,
  introStart: str(row.introStart),
  introEnd: str(row.introEnd),
  creditsAt: str(row.creditsAt),
  subtitles: (row.subtitles ?? []).map((t) => ({ lang: t.lang, url: t.url })),
});

export function TitleVideosAdmin({
  rows,
  total,
  page,
  pageSize,
  q,
}: {
  rows: TitleVideoRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const go = (next: { q?: string; page?: number }) => {
    const params = new URLSearchParams();
    const text = next.q ?? query;
    if (text.trim()) params.set("q", text.trim());
    if ((next.page ?? 1) > 1) params.set("page", String(next.page));
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname));
  };

  useEffect(() => {
    if (query === q) return;
    const id = setTimeout(() => go({ q: query, page: 1 }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the typed query changes
  }, [query]);

  async function run(key: string, action: () => Promise<VideoActionResult>) {
    setBusy(key);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return false;
      }
      if (result.message) toast.success(result.message);
      startTransition(() => router.refresh());
      return true;
    } finally {
      setBusy(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or id"
              aria-label="Search video links"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setForm(EMPTY)}>
            <Plus /> Add video link
          </Button>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} link{total === 1 ? "" : "s"}
          {pending && <Loader2 className="ml-2 inline size-4 animate-spin" />}
        </span>
        {pages > 1 && (
          <span className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => go({ page: page - 1 })} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            Page {page} of {pages}
            <Button variant="ghost" size="icon" disabled={page >= pages} onClick={() => go({ page: page + 1 })} aria-label="Next page">
              <ChevronRight />
            </Button>
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {q ? "No links match." : "No video links yet. Until you add one, viewers see “Not on CineYellow yet” (admins get the demo video)."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/title/${row.titleId}`} className="font-semibold hover:text-primary">
                      {row.titleName || row.titleId}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {row.season ? `Season ${row.season} · Episode ${row.episode}` : row.titleId.startsWith("tv-") ? "Whole show" : "Movie"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{row.kind === "hls" ? "HLS · site player" : `Embed · ${row.providerName}`}</Badge>
                    {row.status !== "active" && (
                      <Badge variant="outline" className="ml-1 border-destructive/50 text-destructive">
                        {row.status}
                      </Badge>
                    )}
                    <label className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      Priority
                      <Input
                        type="number"
                        min={0}
                        max={1000}
                        defaultValue={row.priority}
                        disabled={busy === `update:${row.id}`}
                        className="h-7 w-16 px-1.5 text-xs"
                        onBlur={(e) => {
                          if (Number(e.target.value) !== row.priority) {
                            run(`update:${row.id}`, () => updateSourceAction(row.id, { priority: e.target.value }));
                          }
                        }}
                      />
                    </label>
                    {row.subtitles?.length > 0 && (
                      <Badge variant="outline" className="ml-1" title={row.subtitles.map((t) => t.label).join(", ")}>
                        CC {row.subtitles.length}
                      </Badge>
                    )}
                  </td>
                  <td className="max-w-80 px-4 py-3">
                    <span className="block truncate text-xs text-muted-foreground" title={row.url}>
                      {row.url}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {row.lastCheckedAt ? `Checked ${new Date(row.lastCheckedAt).toLocaleString()}` : "Not checked yet"}
                      {row.maxHeight ? ` · ${row.maxHeight}p` : ""}
                      {row.audioLanguages.length ? ` · audio: ${row.audioLanguages.join(", ")}` : ""}
                    </span>
                    {row.lastError && (
                      <span className="block truncate text-[11px] text-destructive" title={row.lastError}>
                        {row.lastError}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Switch
                        checked={row.status === "active"}
                        disabled={busy === `update:${row.id}`}
                        aria-label={row.status === "active" ? "Turn this source off" : "Turn this source on"}
                        title={row.status === "broken" ? "Marked broken by the health check; turn on to retry" : undefined}
                        onCheckedChange={(on) =>
                          run(`update:${row.id}`, () => updateSourceAction(row.id, { status: on ? "active" : "disabled" }))
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy === `update:${row.id}`}
                        title={row.locked ? "Locked: automatic updates leave it alone" : "Unlocked: automatic updates may change it"}
                        aria-label={row.locked ? "Unlock source" : "Lock source"}
                        aria-pressed={row.locked}
                        onClick={() => run(`update:${row.id}`, () => updateSourceAction(row.id, { locked: !row.locked }))}
                      >
                        {row.locked ? <Lock /> : <LockOpen className="text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy === `check:${row.id}`}
                        title="Check now: is it still working?"
                        aria-label="Check this source now"
                        onClick={() => run(`check:${row.id}`, () => checkSourceAction(row.id))}
                      >
                        {busy === `check:${row.id}` ? <Loader2 className="animate-spin" /> : <Activity />}
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Open the watch page">
                        <Link href={watchHref(row.titleId, row.season, row.episode)} target="_blank" aria-label="Open the watch page">
                          <ExternalLink />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" aria-label="Edit link" onClick={() => setForm(fromRow(row))}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove"
                        aria-label="Remove link"
                        disabled={busy === `delete:${row.id}`}
                        onClick={() => {
                          if (!window.confirm(`Remove the video link for ${row.titleName}?`)) return;
                          run(`delete:${row.id}`, () => deleteTitleVideoAction(row.id));
                        }}
                      >
                        {busy === `delete:${row.id}` ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          {form && (
            <VideoForm
              initial={form}
              saving={busy === "save"}
              onSave={async (values) => {
                // Subtitle files only apply to HLS streams; don't send leftovers for an embed.
                const hls = checkVideoUrl(values.url).kind === "hls";
                const ok = await run("save", () => saveTitleVideoAction({ ...values, subtitles: hls ? values.subtitles : [] }));
                if (ok) setForm(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VideoForm({ initial, saving, onSave }: { initial: FormState; saving: boolean; onSave: (values: FormState) => void }) {
  const [f, setF] = useState(initial);
  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setF((prev) => ({ ...prev, [key]: e.target.value }));
  const checked = f.url.trim() ? checkVideoUrl(f.url) : null;
  const isHls = checked?.ok && checked.kind === "hls";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(f);
      }}
      className="space-y-5"
    >
      <DialogHeader>
        <DialogTitle>{initial.id ? "Edit video link" : "Add video link"}</DialogTitle>
        <DialogDescription>
          Only add videos you have the rights to show. Accepted: HLS streams (.m3u8) or {EMBED_HOSTS.join(", ")} links.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="video-title">Title</Label>
        <Input id="video-title" value={f.title} onChange={set("title")} placeholder="movie-550, tv-1399 or a themoviedb.org link" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="video-season">Season</Label>
          <Input id="video-season" inputMode="numeric" value={f.season} onChange={set("season")} placeholder="Series only" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="video-episode">Episode</Label>
          <Input id="video-episode" inputMode="numeric" value={f.episode} onChange={set("episode")} placeholder="Series only" />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">Leave both empty for a movie, or for one video that covers a whole show.</p>

      <div className="space-y-2">
        <Label htmlFor="video-url">Video link</Label>
        <Input id="video-url" value={f.url} onChange={set("url")} placeholder="https://…/video.m3u8 or https://vimeo.com/…" required />
        {checked && (
          <p className={checked.ok ? "text-xs text-emerald-400" : "text-xs text-destructive"}>
            {checked.ok
              ? checked.kind === "hls"
                ? "HLS stream: plays in the site's own player."
                : `Embed: ${checked.url}`
              : checked.error}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="video-label">Label (optional)</Label>
        <Input id="video-label" value={f.label} onChange={set("label")} maxLength={60} placeholder="e.g. Hindi dub, 1080p" />
        <p className="text-xs text-muted-foreground">Shown in the viewer&apos;s Server menu when a title has more than one source.</p>
      </div>

      {isHls && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="intro-start">Intro start (s)</Label>
            <Input id="intro-start" inputMode="numeric" value={f.introStart} onChange={set("introStart")} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intro-end">Intro end (s)</Label>
            <Input id="intro-end" inputMode="numeric" value={f.introEnd} onChange={set("introEnd")} placeholder="optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credits-at">Credits start (s)</Label>
            <Input id="credits-at" inputMode="numeric" value={f.creditsAt} onChange={set("creditsAt")} placeholder="optional" />
          </div>
          <p className="col-span-3 -mt-1 text-xs text-muted-foreground">
            Intro times show the &ldquo;Skip Intro&rdquo; button; credits start shows &ldquo;Next episode&rdquo; early. For anime left
            empty, times are taken from AniSkip when they fit the video. The stream&apos;s host must allow requests from this site (CORS).
          </p>
        </div>
      )}

      {isHls && <SubtitleRows rows={f.subtitles} onChange={(subtitles) => setF((prev) => ({ ...prev, subtitles }))} />}

      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={saving || !f.title.trim() || !checked?.ok}>
          {saving && <Loader2 className="animate-spin" />} Save
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Subtitle files for an HLS video: one WebVTT link per language. */
function SubtitleRows({ rows, onChange }: { rows: FormState["subtitles"]; onChange: (rows: FormState["subtitles"]) => void }) {
  const update = (i: number, patch: Partial<FormState["subtitles"][number]>) =>
    onChange(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">Subtitle files</legend>
      {rows.map((row, i) => {
        const code = normalizeLanguageCode(row.lang);
        return (
          <div key={i} className="flex items-start gap-2">
            <div className="w-28 shrink-0">
              <Input
                value={row.lang}
                onChange={(e) => update(i, { lang: e.target.value })}
                placeholder="en, hi, ur"
                aria-label={`Subtitle ${i + 1} language`}
              />
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">{code ? languageName(code) : row.lang ? "Unknown code" : ""}</span>
            </div>
            <Input
              value={row.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://…/subtitles.en.vtt"
              aria-label={`Subtitle ${i + 1} link`}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove subtitle ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              <X />
            </Button>
          </div>
        );
      })}
      {rows.length < MAX_SUBTITLES && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { lang: "", url: "" }])}>
          <Plus /> Add subtitle file
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        WebVTT (.vtt) files, shown in the player&apos;s Audio &amp; Subtitles menu. Their host must allow CORS, like the stream.
      </p>
    </fieldset>
  );
}
