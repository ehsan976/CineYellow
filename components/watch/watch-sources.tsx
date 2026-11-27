"use client";

import type { Playback, ServerHealthStatus, Title, WatchOption } from "@/lib/types";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRightLeft, Check, Flag, RotateCcw, Server } from "lucide-react";
import { toast } from "sonner";

import { reportBrokenServerAction } from "@/app/actions/embed-servers";
import { NetflixPlayer } from "@/components/player/netflix-player";
import { EmbedWatch } from "@/components/watch/embed-watch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_DOT: Record<ServerHealthStatus, string> = {
  online: "bg-emerald-500",
  slow: "bg-amber-400",
  down: "bg-red-500",
};

function formatHealthLabel(health?: WatchOption["health"]): string | null {
  if (!health) return null;
  if (health.status === "down") return "Down";
  if (health.latencyMs === null) return health.status === "slow" ? "Slow" : "Online";
  if (health.latencyMs >= 1000) return `${(health.latencyMs / 1000).toFixed(1)}s`;
  return `${health.latencyMs}ms`;
}

/**
 * Plays a title's sources in ranked order (lib/server/video-sources.ts + embed-providers.ts):
 * - Automatic: skips servers marked down when choosing the initial server; falls back on HLS fatal error.
 * - Manual: "Servers" dropdown (grouped by English / Hindi with live status dots & latency),
 *   plus 1-click "Next" server switcher and "Report" broken button in the watch header.
 */
export function WatchSources({ title, playback, options }: { title: Title; playback: Playback; options: WatchOption[] }) {
  // Start on the first healthy (non-down) server if one is available.
  const [index, setIndex] = useState(() => {
    const healthyIdx = options.findIndex((o) => o.health?.status !== "down");
    return healthyIdx >= 0 ? healthyIdx : 0;
  });
  const [failed, setFailed] = useState<string[]>([]);
  const [reported, setReported] = useState<string[]>([]);
  const [reporting, startReport] = useTransition();
  const current = options[index];

  const choose = useCallback((i: number) => setIndex(i), []);

  const findNextWorking = useCallback(
    (skipIds: string[]) => {
      const len = options.length;
      if (len <= 1) return -1;
      // Prefer healthy, non-skipped servers first.
      for (let offset = 1; offset < len; offset++) {
        const idx = (index + offset) % len;
        const candidate = options[idx];
        if (!skipIds.includes(candidate.id) && candidate.health?.status !== "down") return idx;
      }
      // Fallback: any non-skipped server.
      for (let offset = 1; offset < len; offset++) {
        const idx = (index + offset) % len;
        if (!skipIds.includes(options[idx].id)) return idx;
      }
      return -1;
    },
    [index, options]
  );

  // Fatal error in the site player: mark this source and move to the next one that hasn't failed.
  const onFatalError = useCallback(() => {
    if (!current) return;
    const nowFailed = [...new Set([...failed, current.id])];
    setFailed(nowFailed);
    const next = findNextWorking(nowFailed);
    if (next === -1) {
      setIndex(options.length); // past the end: "nothing could play"
      return;
    }
    toast(`${current.name} isn't working`, { description: `Switched to ${options[next].name}.` });
    setIndex(next);
  }, [current, failed, findNextWorking, options]);

  const onNextServer = useCallback(() => {
    if (!current || options.length <= 1) return;
    const next = findNextWorking(failed);
    const target = next !== -1 ? next : (index + 1) % options.length;
    setIndex(target);
    toast(`Switched to ${options[target].name}`);
  }, [current, failed, findNextWorking, index, options]);

  const onReportBroken = useCallback(() => {
    if (!current || reporting) return;
    const targetId = current.id;
    const providerId = current.providerId;
    const nowReported = [...new Set([...reported, targetId])];
    const nowFailed = [...new Set([...failed, targetId])];
    setReported(nowReported);
    setFailed(nowFailed);

    const next = findNextWorking(nowFailed);
    if (next !== -1) setIndex(next);

    if (targetId.startsWith("embed-")) {
      startReport(async () => {
        const result = await reportBrokenServerAction({ serverId: providerId, titleId: title.id });
        if (!result.ok) {
          toast.error(result.error ?? "Could not send report.");
          return;
        }
        toast.success(next !== -1 ? `${result.message} · Switched to ${options[next].name}` : result.message);
      });
    } else {
      toast(next !== -1 ? `Marked broken · Switched to ${options[next].name}` : "Marked server as broken");
    }
  }, [current, failed, findNextWorking, options, reported, reporting, title.id]);

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">{title.title} can&apos;t play right now</h1>
        <p className="max-w-md text-white/70">
          {options.length > 1 ? "None of its servers are responding." : "Its server isn't responding."} Please try again in a few
          minutes.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setFailed([]);
              setIndex(0);
            }}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/85"
          >
            <RotateCcw className="size-4" /> Try again
          </button>
          <Link href={`/title/${title.id}`} className="rounded-md bg-white/15 px-5 py-2.5 font-semibold hover:bg-white/25">
            Back
          </Link>
        </div>
      </div>
    );
  }

  const controls = (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {options.length > 1 && <ServerMenu options={options} index={index} failed={failed} onChoose={choose} />}
      {options.length > 1 && (
        <button
          type="button"
          onClick={onNextServer}
          title="Switch to next server"
          aria-label="Switch to next server"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-black/50 px-2.5 py-1.5 text-sm text-white backdrop-blur-sm hover:border-white"
        >
          <ArrowRightLeft className="size-4" />
          <span className="hidden md:inline">Next Server</span>
        </button>
      )}
      <button
        type="button"
        onClick={onReportBroken}
        disabled={reporting || reported.includes(current.id)}
        title="Report broken server"
        aria-label="Report broken server"
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-black/50 px-2.5 py-1.5 text-sm text-white/80 backdrop-blur-sm hover:border-red-400/70 hover:text-red-300 disabled:opacity-50"
      >
        <Flag className="size-4" />
        <span className="hidden md:inline">{reported.includes(current.id) ? "Reported" : "Report"}</span>
      </button>
    </div>
  );

  if (current.kind === "embed") {
    return (
      <EmbedWatch
        key={current.id}
        title={title}
        playback={playback}
        url={current.embedUrl}
        providerId={current.providerId}
        header={controls}
      />
    );
  }
  return (
    <NetflixPlayer
      key={current.id}
      title={title}
      playback={current.playback}
      onFatalError={onFatalError}
      overlay={<div className="absolute top-3 right-3 z-[60] sm:top-5 sm:right-5">{controls}</div>}
    />
  );
}

function ServerMenu({
  options,
  index,
  failed,
  onChoose,
}: {
  options: WatchOption[];
  index: number;
  failed: string[];
  onChoose: (i: number) => void;
}) {
  const indexed = options.map((option, i) => ({ option, index: i }));
  const englishServers = indexed.filter((item) => item.option.language !== "hindi");
  const hindiServers = indexed.filter((item) => item.option.language === "hindi");
  const active = options[index];
  const activeStatus = active.health?.status;

  const renderItem = ({ option, index: itemIndex }: { option: WatchOption; index: number }) => {
    const isFailed = failed.includes(option.id);
    const isDown = option.health?.status === "down";
    const statusLabel = isFailed ? "failed" : formatHealthLabel(option.health);
    const dotClass = isFailed
      ? "bg-red-500"
      : option.health
        ? STATUS_DOT[option.health.status]
        : "bg-emerald-500";

    return (
      <DropdownMenuItem
        key={option.id}
        onSelect={() => onChoose(itemIndex)}
        className={`gap-2 ${isDown && !isFailed ? "opacity-60" : ""}`}
      >
        <Check className={itemIndex === index ? "size-4 shrink-0 text-primary" : "size-4 shrink-0 opacity-0"} />
        <span className={`size-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <span className="flex-1 truncate">{option.name}</span>
        {statusLabel && (
          <span
            className={`shrink-0 text-[11px] tabular-nums ${
              isFailed || isDown
                ? "text-destructive"
                : option.health?.status === "slow"
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
          >
            {statusLabel}
          </span>
        )}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:border-white"
        aria-label={`Server: ${active.name}. Choose another server`}
      >
        <Server className="size-4 shrink-0" />
        {activeStatus && <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[activeStatus]}`} aria-hidden />}
        <span className="max-w-20 truncate sm:max-w-40">{active.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[70] w-72 max-h-80 overflow-y-auto">
        {englishServers.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-primary">
              English ({englishServers.length})
            </DropdownMenuLabel>
            {englishServers.map(renderItem)}
          </DropdownMenuGroup>
        )}
        {englishServers.length > 0 && hindiServers.length > 0 && <DropdownMenuSeparator />}
        {hindiServers.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-primary">
              Hindi ({hindiServers.length})
            </DropdownMenuLabel>
            {hindiServers.map(renderItem)}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
