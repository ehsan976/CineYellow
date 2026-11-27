"use client";

import type { EmbedServerAdminRow } from "@/lib/server/embed-health";
import type { ServerLanguage } from "@/lib/types";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, Flag, Loader2, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  checkAllEmbedServersAction,
  checkOneEmbedServerAction,
  deleteEmbedServerAction,
  saveEmbedServerAction,
  updateEmbedServerAction,
  type EmbedActionResult,
} from "@/app/actions/embed-servers";
import { formatEmbedTemplate, validateEmbedTemplate } from "@/lib/player/embed-providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const STATUS_STYLE = {
  online: { dot: "bg-emerald-500", text: "text-emerald-500", label: "Online" },
  slow: { dot: "bg-amber-400", text: "text-amber-400", label: "Slow" },
  down: { dot: "bg-red-500", text: "text-red-500", label: "Down" },
} as const;

interface ServerFormState {
  isNew: boolean;
  isCustom: boolean;
  hasOverrides: boolean;
  id: string;
  name: string;
  badge: string;
  language: ServerLanguage;
  movieUrlTemplate: string;
  tvUrlTemplate: string;
  mirrors: string;
  priority: string;
}

const EMPTY_FORM: ServerFormState = {
  isNew: true,
  isCustom: true,
  hasOverrides: false,
  id: "",
  name: "",
  badge: "",
  language: "english",
  movieUrlTemplate: "",
  tvUrlTemplate: "",
  mirrors: "",
  priority: "100",
};

const formFromRow = (row: EmbedServerAdminRow): ServerFormState => ({
  isNew: false,
  isCustom: row.isCustom,
  hasOverrides: row.hasOverrides,
  id: row.id,
  name: row.name,
  badge: row.badge,
  language: row.language,
  movieUrlTemplate: row.movieUrlTemplate,
  tvUrlTemplate: row.tvUrlTemplate,
  mirrors: row.mirrors.join(", "),
  priority: String(row.priority),
});

function formatLatency(ms: number | null): string {
  if (ms === null) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/**
 * Admin panel for built-in and custom embed servers: Add/Edit URL templates & metadata without code edits,
 * toggle On/Off, set Priority, run live health checks, inspect 24h/7d uptime %, and clear user reports.
 */
export function EmbedServersAdmin({ servers }: { servers: EmbedServerAdminRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<ServerFormState | null>(null);
  const [, startTransition] = useTransition();

  async function run(key: string, action: () => Promise<EmbedActionResult>) {
    setBusy(key);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Action failed.");
        return false;
      }
      if (result.message) toast.success(result.message);
      startTransition(() => router.refresh());
      return true;
    } finally {
      setBusy(null);
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const ok = await run("save", () =>
      saveEmbedServerAction({
        id: form.id,
        isNew: form.isNew,
        name: form.name,
        badge: form.badge,
        language: form.language,
        movieUrlTemplate: form.movieUrlTemplate,
        tvUrlTemplate: form.tvUrlTemplate,
        mirrors: form.mirrors,
        priority: form.priority,
      })
    );
    if (ok) setForm(null);
  }

  async function restoreDefaults() {
    if (!form || form.isNew || form.isCustom) return;
    const ok = await run("save", () =>
      saveEmbedServerAction({
        id: form.id,
        isNew: false,
        name: form.name,
        language: form.language,
        movieUrlTemplate: form.movieUrlTemplate,
        resetOverrides: true,
      })
    );
    if (ok) setForm(null);
  }

  const moviePreview = form?.movieUrlTemplate ? validateEmbedTemplate(form.movieUrlTemplate, { required: true }) : null;
  const tvPreview = form?.tvUrlTemplate ? validateEmbedTemplate(form.tvUrlTemplate, { required: false }) : null;

  return (
    <>
      <Card className="mb-6">
        <CardContent>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Embed Servers ({servers.length})</h2>
              <p className="text-sm text-muted-foreground">
                Add new embed servers or edit URLs without changing code. Turn broken ones off, set priority (lower
                plays first), or run a live health check. 3 consecutive failures auto-skip a server until it recovers.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => setForm(EMPTY_FORM)}
                className="gap-1.5"
              >
                <Plus className="size-4" /> Add Server
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy !== null}
                onClick={() => run("all", checkAllEmbedServersAction)}
                className="gap-1.5"
              >
                {busy === "all" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Check All Now
              </Button>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {servers.map((s) => {
              const st = STATUS_STYLE[s.status];
              const isRowBusy = busy === s.id || busy === "all";
              const autoSkipped = s.failCount >= 3;
              const demoted = s.reportCount >= 3;

              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Switch
                    checked={s.enabled}
                    disabled={isRowBusy}
                    onCheckedChange={(enabled) => run(s.id, () => updateEmbedServerAction(s.id, { enabled }))}
                    aria-label={`${s.name} ${s.enabled ? "on" : "off"}`}
                  />

                  <div className="min-w-44 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.badge && <Badge variant="secondary">{s.badge}</Badge>}
                      <Badge variant="outline" className="capitalize">
                        {s.language}
                      </Badge>
                      {s.isCustom && (
                        <Badge variant="outline" className="border-primary/50 text-[10px] text-primary">
                          Custom
                        </Badge>
                      )}
                      {s.hasOverrides && (
                        <Badge variant="outline" className="text-[10px]">
                          Edited
                        </Badge>
                      )}
                      {autoSkipped && (
                        <Badge variant="destructive" className="text-[10px]">
                          Auto-skipped ({s.failCount} fails)
                        </Badge>
                      )}
                      {demoted && (
                        <Badge variant="outline" className="border-amber-500/60 text-[10px] text-amber-500">
                          Demoted ({s.reportCount} reports)
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className={`inline-flex items-center gap-1.5 font-medium ${st.text}`}>
                        <span className={`size-2 rounded-full ${st.dot}`} aria-hidden />
                        {s.lastCheckedAt ? st.label : "Unchecked"}
                        {s.latencyMs !== null && ` (${formatLatency(s.latencyMs)})`}
                      </span>
                      <span>
                        Uptime 24h: {s.uptime24h !== null ? `${s.uptime24h}%` : "—"} · 7d:{" "}
                        {s.uptime7d !== null ? `${s.uptime7d}%` : "—"}
                      </span>
                      {s.mirrors.length > 0 && <span>Mirrors: {s.mirrors.join(", ")}</span>}
                      {s.reportCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <Flag className="size-3" /> {s.reportCount} report{s.reportCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {s.lastError && s.status === "down" && (
                        <span className="max-w-64 truncate text-destructive" title={s.lastError}>
                          {s.lastError}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {(s.reportCount > 0 || s.failCount > 0) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRowBusy}
                        onClick={() => run(s.id, () => updateEmbedServerAction(s.id, { resetReports: true }))}
                        title="Clear reports and fail count"
                        className="h-8 gap-1 px-2 text-xs"
                      >
                        <RotateCcw className="size-3.5" /> Reset
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRowBusy}
                      onClick={() => run(s.id, () => checkOneEmbedServerAction(s.id))}
                      title="Check this server now"
                      className="h-8 gap-1 px-2.5 text-xs"
                    >
                      {busy === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}
                      Check
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRowBusy}
                      onClick={() => setForm(formFromRow(s))}
                      title="Edit server name, language, or URL templates"
                      className="h-8 gap-1 px-2.5 text-xs"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    {s.isCustom && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRowBusy}
                        onClick={() => run(s.id, () => deleteEmbedServerAction(s.id))}
                        title="Delete custom server"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      Priority
                      <Input
                        type="number"
                        min={0}
                        max={1000}
                        defaultValue={s.priority}
                        disabled={isRowBusy}
                        className="h-8 w-20"
                        onBlur={(e) => {
                          if (Number(e.target.value) !== s.priority) {
                            run(s.id, () => updateEmbedServerAction(s.id, { priority: e.target.value }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.isNew ? "Add Embed Server" : `Edit ${form?.name || form?.id}`}</DialogTitle>
            <DialogDescription>
              Use placeholders <code className="rounded bg-muted px-1">{"{id}"}</code> (TMDB ID),{" "}
              <code className="rounded bg-muted px-1">{"{imdb}"}</code>,{" "}
              <code className="rounded bg-muted px-1">{"{s}"}</code> (season), and{" "}
              <code className="rounded bg-muted px-1">{"{e}"}</code> (episode).
            </DialogDescription>
          </DialogHeader>

          {form && (
            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="embed-name">Server Name</Label>
                  <Input
                    id="embed-name"
                    required
                    placeholder="e.g. VidFast"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="embed-id">Server ID (slug)</Label>
                  <Input
                    id="embed-id"
                    disabled={!form.isNew}
                    placeholder="auto from name (e.g. vidfast)"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="embed-language">Language</Label>
                  <Select
                    value={form.language}
                    onValueChange={(v) => setForm({ ...form, language: v as ServerLanguage })}
                  >
                    <SelectTrigger id="embed-language" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="embed-badge">Badge (optional)</Label>
                  <Input
                    id="embed-badge"
                    placeholder="e.g. Fast HD"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="embed-priority">Priority (0–1000)</Label>
                  <Input
                    id="embed-priority"
                    type="number"
                    min={0}
                    max={1000}
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="embed-movie-url">Movie URL Template</Label>
                <Input
                  id="embed-movie-url"
                  required
                  placeholder="https://example.com/embed/movie/{id}"
                  value={form.movieUrlTemplate}
                  onChange={(e) => setForm({ ...form, movieUrlTemplate: e.target.value })}
                />
                {moviePreview && (
                  <p className={`text-xs ${moviePreview.ok ? "text-muted-foreground" : "text-destructive"}`}>
                    {moviePreview.ok
                      ? `Preview: ${formatEmbedTemplate(moviePreview.value, { tmdbId: 438631, imdbId: "tt1160419" })}`
                      : moviePreview.error}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="embed-tv-url">TV Show URL Template (optional)</Label>
                <Input
                  id="embed-tv-url"
                  placeholder="https://example.com/embed/tv/{id}/{s}/{e}"
                  value={form.tvUrlTemplate}
                  onChange={(e) => setForm({ ...form, tvUrlTemplate: e.target.value })}
                />
                {tvPreview && form.tvUrlTemplate.trim() && (
                  <p className={`text-xs ${tvPreview.ok ? "text-muted-foreground" : "text-destructive"}`}>
                    {tvPreview.ok
                      ? `Preview: ${formatEmbedTemplate(tvPreview.value, { tmdbId: 1399, season: 1, episode: 2, imdbId: "tt0944947" })}`
                      : tvPreview.error}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="embed-mirrors">Backup Mirrors (optional server IDs, comma-separated)</Label>
                <Input
                  id="embed-mirrors"
                  placeholder="e.g. vidlink, vidrift"
                  value={form.mirrors}
                  onChange={(e) => setForm({ ...form, mirrors: e.target.value })}
                />
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                {!form.isNew && !form.isCustom && form.hasOverrides ? (
                  <Button type="button" variant="outline" disabled={busy === "save"} onClick={restoreDefaults}>
                    Restore Defaults
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={busy === "save"}>
                    {busy === "save" && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                    {form.isNew ? "Add Server" : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
