"use client";

import type { TitleLanguageRow, StatusFilter } from "@/lib/server/title-languages";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import {
  addTitleLanguagesAction,
  refetchTitleLanguagesAction,
  saveTitleLanguagesAction,
  setTitleLanguagesVerifiedAction,
  type LanguageActionResult,
} from "@/app/actions/title-languages";
import { languageName } from "@/lib/languages";
import { LanguagePicker } from "@/components/admin/language-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Codes({ codes, empty }: { codes: string[]; empty: string }) {
  if (!codes.length) return <span className="text-xs text-muted-foreground">{empty}</span>;
  const shown = codes.slice(0, 6);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <Badge key={c} variant="outline" className="text-[11px]" title={c}>
          {languageName(c)}
        </Badge>
      ))}
      {codes.length > shown.length && (
        <span className="text-xs text-muted-foreground" title={codes.slice(6).map(languageName).join(", ")}>
          +{codes.length - shown.length}
        </span>
      )}
    </span>
  );
}

export function TitleLanguagesAdmin({
  rows,
  total,
  page,
  pageSize,
  status,
  q,
  motnEnabled,
}: {
  rows: TitleLanguageRow[];
  total: number;
  page: number;
  pageSize: number;
  status: StatusFilter;
  q: string;
  motnEnabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<TitleLanguageRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const go = (next: { status?: StatusFilter; q?: string; page?: number }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const text = next.q ?? query;
    if (s !== "unverified") params.set("status", s);
    if (text.trim()) params.set("q", text.trim());
    if ((next.page ?? 1) > 1) params.set("page", String(next.page));
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname));
  };

  // Search as you type (debounced).
  useEffect(() => {
    if (query === q) return;
    const id = setTimeout(() => go({ q: query, page: 1 }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the typed query changes
  }, [query]);

  async function run(key: string, action: () => Promise<LanguageActionResult>) {
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
      {!motnEnabled && (
        <Card className="mb-4 border-amber-500/40 bg-amber-500/5">
          <CardContent className="text-sm">
            Movie of the Night isn&apos;t set up (<code>MOTN_API_KEY</code> is empty), so new titles aren&apos;t filled in
            automatically. You can still add titles and enter their languages by hand.
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or id"
              aria-label="Search titles"
              className="pl-9"
            />
          </div>
          <ToggleGroup
            type="single"
            value={status}
            onValueChange={(v) => v && go({ status: v as StatusFilter, page: 1 })}
            aria-label="Filter by status"
          >
            {(["unverified", "verified", "all"] as const).map((s) => (
              <ToggleGroupItem
                key={s}
                value={s}
                className="h-9 rounded-full border border-border px-3.5 capitalize data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {s}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run("add", () => addTitleLanguagesAction(newTitle))) setNewTitle("");
            }}
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="movie-550 or TMDB link"
              aria-label="Add a title by TMDB id or link"
              className="w-48"
            />
            <Button type="submit" disabled={!newTitle.trim() || busy === "add"}>
              {busy === "add" ? <Loader2 className="animate-spin" /> : <Plus />} Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} title{total === 1 ? "" : "s"}
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
            {status === "unverified" && !q
              ? "Nothing waiting for review. Titles appear here after someone opens their page."
              : "No titles match."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Audio</th>
                <th className="px-4 py-3 font-medium">Subtitles</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.titleId} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/title/${row.titleId}`} className="font-semibold hover:text-primary">
                      {row.titleName || row.titleId}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {row.titleId}
                      {row.notFound && " · not on Movie of the Night"}
                      {row.source === "admin" && " · edited by admin"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "verified" ? (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">
                        <BadgeCheck className="size-3.5" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-400">
                        Unverified
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Codes codes={row.audio} empty="None" />
                  </td>
                  <td className="px-4 py-3">
                    <Codes codes={row.subtitles} empty="None" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(row.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit ${row.titleName}`} onClick={() => setEditing(row)}>
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={row.status === "verified" ? "Mark unverified" : "Mark verified"}
                        aria-label={row.status === "verified" ? "Mark unverified" : "Mark verified"}
                        disabled={busy === `verify:${row.titleId}`}
                        onClick={() =>
                          run(`verify:${row.titleId}`, () => setTitleLanguagesVerifiedAction(row.titleId, row.status !== "verified"))
                        }
                      >
                        {busy === `verify:${row.titleId}` ? (
                          <Loader2 className="animate-spin" />
                        ) : row.status === "verified" ? (
                          <ShieldOff />
                        ) : (
                          <ShieldCheck className="text-emerald-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Fetch again from Movie of the Night"
                        aria-label="Fetch again from Movie of the Night"
                        disabled={!motnEnabled || busy === `refetch:${row.titleId}`}
                        onClick={() => {
                          if (row.status === "verified" && !window.confirm("This replaces the verified languages and marks the title unverified. Continue?"))
                            return;
                          run(`refetch:${row.titleId}`, () => refetchTitleLanguagesAction(row.titleId));
                        }}
                      >
                        <RefreshCw className={busy === `refetch:${row.titleId}` ? "animate-spin" : undefined} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSave={async (audio, subtitles, verified) => {
          if (!editing) return;
          const ok = await run(`save:${editing.titleId}`, () =>
            saveTitleLanguagesAction({ titleId: editing.titleId, audio, subtitles, verified })
          );
          if (ok) setEditing(null);
        }}
        saving={Boolean(editing && busy === `save:${editing.titleId}`)}
      />
    </>
  );
}

function EditDialog({
  row,
  onClose,
  onSave,
  saving,
}: {
  row: TitleLanguageRow | null;
  onClose: () => void;
  onSave: (audio: string[], subtitles: string[], verified: boolean) => void;
  saving: boolean;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {/* key: fresh form state for each row */}
        {row && <EditForm key={row.titleId} row={row} onSave={onSave} saving={saving} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  row,
  onSave,
  saving,
}: {
  row: TitleLanguageRow;
  onSave: (audio: string[], subtitles: string[], verified: boolean) => void;
  saving: boolean;
}) {
  const [audio, setAudio] = useState(row.audio);
  const [subtitles, setSubtitles] = useState(row.subtitles);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{row.titleName || row.titleId}</DialogTitle>
        <DialogDescription>Check the languages against the real release, then save and verify.</DialogDescription>
      </DialogHeader>
      <div className="space-y-6">
        <LanguagePicker label="Audio" value={audio} onChange={setAudio} />
        <LanguagePicker label="Subtitles" value={subtitles} onChange={setSubtitles} />
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button variant="outline" disabled={saving} onClick={() => onSave(audio, subtitles, false)}>
          Save
        </Button>
        <Button disabled={saving} onClick={() => onSave(audio, subtitles, true)}>
          {saving ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Save &amp; verify
        </Button>
      </DialogFooter>
    </>
  );
}
