"use client";

import type { EmbedServerAdminRow } from "@/lib/server/embed-health";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, Flag, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  checkAllEmbedServersAction,
  checkOneEmbedServerAction,
  updateEmbedServerAction,
  type EmbedActionResult,
} from "@/app/actions/embed-servers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const STATUS_STYLE = {
  online: { dot: "bg-emerald-500", text: "text-emerald-500", label: "Online" },
  slow: { dot: "bg-amber-400", text: "text-amber-400", label: "Slow" },
  down: { dot: "bg-red-500", text: "text-red-500", label: "Down" },
} as const;

function formatLatency(ms: number | null): string {
  if (ms === null) return "";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/**
 * Admin panel for all 16 built-in embed servers: toggle On/Off, set Priority, run live health
 * checks ("Check All Now" or per-row), inspect 24h/7d uptime %, and clear user broken reports.
 */
export function EmbedServersAdmin({ servers }: { servers: EmbedServerAdminRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function run(key: string, action: () => Promise<EmbedActionResult>) {
    setBusy(key);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Action failed.");
        return;
      }
      if (result.message) toast.success(result.message);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Embed Servers ({servers.length})</h2>
            <p className="text-sm text-muted-foreground">
              Built-in streaming embed servers. Turn broken ones off, set priority (lower plays first), or run a live
              health check. 3 consecutive failures auto-skip a server until it recovers.
            </p>
          </div>
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
  );
}
