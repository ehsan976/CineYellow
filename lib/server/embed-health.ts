// Live health checks, admin state, custom servers, broken-report counts, and 24h/7d uptime stats
// for built-in and admin-added embed servers (lib/player/embed-providers.ts).
import "server-only";
import type { ServerHealthStatus, ServerLanguage } from "@/lib/types";
import { cacheTag } from "next/cache";
import { eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { embedServerCheck, embedServerReport, embedServerState } from "@/db/schema";
import {
  EMBED_PROVIDERS,
  defaultMovieTemplate,
  defaultProviderPriority,
  defaultTvTemplate,
  resolveEmbedProviders,
  type EmbedServerRuntimeState,
  type ResolvedEmbedProvider,
} from "@/lib/player/embed-providers";
import { setCacheLife } from "@/lib/tmdb/cache";

export const EMBED_SERVERS_TAG = "embed-servers";

/** Response slower than this (ms) is shown as yellow "Slow" instead of green "Online". */
const SLOW_THRESHOLD_MS = 1500;
/** Timeout per server probe. */
const PROBE_TIMEOUT_MS = 7000;
/** Test movie (Dune, TMDB 438631) used by health probes. */
const PROBE_TMDB_ID = 438631;
/** Prune historical check samples older than 14 days. */
const HISTORY_RETENTION_DAYS = 14;

export interface EmbedProbeResult {
  status: ServerHealthStatus;
  latencyMs: number | null;
  httpStatus: number | null;
  error: string | null;
}

export interface EmbedServerAdminRow {
  id: string;
  isCustom: boolean;
  hasOverrides: boolean;
  name: string;
  badge: string;
  language: ServerLanguage;
  movieUrlTemplate: string;
  tvUrlTemplate: string;
  mirrors: string[];
  enabled: boolean;
  priority: number;
  status: ServerHealthStatus;
  latencyMs: number | null;
  failCount: number;
  reportCount: number;
  lastError: string | null;
  lastCheckedAt: string | null;
  lastOkAt: string | null;
  uptime24h: number | null;
  uptime7d: number | null;
  checks24h: number;
  checks7d: number;
}

export interface EmbedHealthRunSummary {
  checked: number;
  online: number;
  slow: number;
  down: number;
}

type Invalidate = (tag: string) => void;

const defaultPriorityById = new Map(EMBED_PROVIDERS.map((p, idx) => [p.id, defaultProviderPriority(idx)]));
const builtInById = new Map(EMBED_PROVIDERS.map((p) => [p.id, p]));

function toRuntimeStateMap(rows: (typeof embedServerState.$inferSelect)[]): Record<string, EmbedServerRuntimeState> {
  const map: Record<string, EmbedServerRuntimeState> = {};
  for (const row of rows) {
    map[row.id] = {
      isCustom: row.isCustom,
      name: row.name,
      badge: row.badge,
      language: row.language,
      movieUrlTemplate: row.movieUrlTemplate,
      tvUrlTemplate: row.tvUrlTemplate,
      mirrors: row.mirrors,
      enabled: row.enabled,
      priority: row.priority,
      status: row.status,
      latencyMs: row.latencyMs,
      failCount: row.failCount,
      reportCount: row.reportCount,
    };
  }
  return map;
}

/** Probes one embed server URL and measures latency + reachability. */
export async function probeEmbedProvider(
  provider: Pick<ResolvedEmbedProvider, "id" | "getMovieUrl">
): Promise<EmbedProbeResult> {
  const url = provider.getMovieUrl(PROBE_TMDB_ID);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;

    // VidRift returns HTTP 403 "Embed this page in an iframe." on direct server fetches (no Sec-Fetch-Dest: iframe).
    let iframeOnlyOk = false;
    if (res.status === 403) {
      const snippet = (await res.text().catch(() => "")).slice(0, 200);
      iframeOnlyOk = /embed this page in an iframe/i.test(snippet);
    }

    if ((res.status >= 200 && res.status < 400) || iframeOnlyOk) {
      return {
        status: latencyMs >= SLOW_THRESHOLD_MS ? "slow" : "online",
        latencyMs,
        httpStatus: res.status,
        error: null,
      };
    }
    return { status: "down", latencyMs: null, httpStatus: res.status, error: `HTTP ${res.status}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    return { status: "down", latencyMs: null, httpStatus: null, error: msg.slice(0, 120) };
  }
}

/**
 * Cached map of runtime states for all configured embed servers (built-in + custom).
 * Falls back to empty object on DB failure so watch pages always keep playing.
 */
export async function getEmbedServerStates(): Promise<Record<string, EmbedServerRuntimeState>> {
  "use cache";
  cacheTag(EMBED_SERVERS_TAG);
  try {
    const rows = await db.select().from(embedServerState);
    setCacheLife("minutes");
    return toRuntimeStateMap(rows);
  } catch (error) {
    console.warn("[embed-health] state read failed:", error instanceof Error ? error.message : error);
    setCacheLife("minutes");
    return {};
  }
}

/** Full admin rows combining built-in servers (with overrides), custom servers, and 24h/7d uptime %. */
export async function listEmbedServersForAdmin(): Promise<EmbedServerAdminRow[]> {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  type UptimeAgg = { serverId: string; total7d: number; ok7d: number; total24h: number; ok24h: number };

  const [states, uptimeRows] = await Promise.all([
    db.select().from(embedServerState).catch((): (typeof embedServerState.$inferSelect)[] => []),
    db
      .select({
        serverId: embedServerCheck.serverId,
        total7d: sql<number>`count(*)::int`,
        ok7d: sql<number>`count(*) filter (where ${embedServerCheck.status} in ('online', 'slow'))::int`,
        total24h: sql<number>`count(*) filter (where ${embedServerCheck.checkedAt} >= ${since24h})::int`,
        ok24h: sql<number>`count(*) filter (where ${embedServerCheck.checkedAt} >= ${since24h} and ${embedServerCheck.status} in ('online', 'slow'))::int`,
      })
      .from(embedServerCheck)
      .where(gte(embedServerCheck.checkedAt, since7d))
      .groupBy(embedServerCheck.serverId)
      .catch((): UptimeAgg[] => []),
  ]);

  const stateById = new Map<string, typeof embedServerState.$inferSelect>(states.map((s) => [s.id, s]));
  const uptimeById = new Map<string, UptimeAgg>(uptimeRows.map((u) => [u.serverId, u]));

  const builtInRows: EmbedServerAdminRow[] = EMBED_PROVIDERS.map((p, idx) => {
    const s = stateById.get(p.id);
    const u = uptimeById.get(p.id);
    const hasOverrides = Boolean(
      s &&
        (s.name !== null ||
          s.badge !== null ||
          s.language !== null ||
          s.movieUrlTemplate !== null ||
          s.tvUrlTemplate !== null ||
          s.mirrors !== null)
    );
    return {
      id: p.id,
      isCustom: false,
      hasOverrides,
      name: s?.name?.trim() || p.name,
      badge: s?.badge !== undefined && s.badge !== null ? s.badge : (p.badge ?? ""),
      language: s?.language ?? p.language,
      movieUrlTemplate: s?.movieUrlTemplate?.trim() || defaultMovieTemplate(p),
      tvUrlTemplate: s?.tvUrlTemplate?.trim() || defaultTvTemplate(p),
      mirrors: s?.mirrors ?? p.mirrors ?? [],
      enabled: s?.enabled ?? true,
      priority: s?.priority ?? defaultProviderPriority(idx),
      status: s?.status ?? "online",
      latencyMs: s?.latencyMs ?? null,
      failCount: s?.failCount ?? 0,
      reportCount: s?.reportCount ?? 0,
      lastError: s?.lastError ?? null,
      lastCheckedAt: s?.lastCheckedAt ? s.lastCheckedAt.toISOString() : null,
      lastOkAt: s?.lastOkAt ? s.lastOkAt.toISOString() : null,
      uptime24h: u && u.total24h > 0 ? Math.round((u.ok24h / u.total24h) * 100) : null,
      uptime7d: u && u.total7d > 0 ? Math.round((u.ok7d / u.total7d) * 100) : null,
      checks24h: u?.total24h ?? 0,
      checks7d: u?.total7d ?? 0,
    };
  });

  const customRows: EmbedServerAdminRow[] = states
    .filter((s) => !builtInById.has(s.id) && s.isCustom)
    .map((s) => {
      const u = uptimeById.get(s.id);
      return {
        id: s.id,
        isCustom: true,
        hasOverrides: false,
        name: s.name?.trim() || s.id,
        badge: s.badge ?? "",
        language: s.language ?? "english",
        movieUrlTemplate: s.movieUrlTemplate ?? "",
        tvUrlTemplate: s.tvUrlTemplate ?? "",
        mirrors: s.mirrors ?? [],
        enabled: s.enabled,
        priority: s.priority,
        status: s.status,
        latencyMs: s.latencyMs,
        failCount: s.failCount,
        reportCount: s.reportCount,
        lastError: s.lastError,
        lastCheckedAt: s.lastCheckedAt ? s.lastCheckedAt.toISOString() : null,
        lastOkAt: s.lastOkAt ? s.lastOkAt.toISOString() : null,
        uptime24h: u && u.total24h > 0 ? Math.round((u.ok24h / u.total24h) * 100) : null,
        uptime7d: u && u.total7d > 0 ? Math.round((u.ok7d / u.total7d) * 100) : null,
        checks24h: u?.total24h ?? 0,
        checks7d: u?.total7d ?? 0,
      };
    });

  const rows = [...builtInRows, ...customRows];
  rows.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  return rows;
}

/** Ensures a state row exists before updating, then applies `patch`. Supports both built-in and custom servers. */
export async function updateEmbedServerState(
  id: string,
  patch: { enabled?: boolean; priority?: number; resetReports?: boolean }
): Promise<boolean> {
  const builtIn = builtInById.get(id);
  const [existing] = await db.select().from(embedServerState).where(eq(embedServerState.id, id)).limit(1);
  if (!builtIn && !existing) return false;

  const basePriority = defaultPriorityById.get(id) ?? 100;
  const now = new Date();

  if (!existing) {
    await db
      .insert(embedServerState)
      .values({ id, priority: patch.priority ?? basePriority, enabled: patch.enabled ?? true })
      .onConflictDoNothing();
  }

  const updateFields: Partial<typeof embedServerState.$inferInsert> = { updatedAt: now };
  if (patch.enabled !== undefined) updateFields.enabled = patch.enabled;
  if (patch.priority !== undefined) updateFields.priority = patch.priority;
  if (patch.resetReports) {
    await db.delete(embedServerReport).where(eq(embedServerReport.serverId, id));
    updateFields.reportCount = 0;
    updateFields.failCount = 0;
    updateFields.lastError = null;
    updateFields.status = "online";
  }

  await db.update(embedServerState).set(updateFields).where(eq(embedServerState.id, id));
  return true;
}

/**
 * Adds a new custom embed server, or updates an existing custom or built-in server's
 * name, badge, language, Movie/TV URL templates, mirrors, and priority.
 */
export async function saveEmbedServer(input: {
  id: string;
  isNew: boolean;
  name: string;
  badge: string;
  language: ServerLanguage;
  movieUrlTemplate: string;
  tvUrlTemplate: string;
  mirrors: string[];
  priority: number;
  resetOverrides?: boolean;
}): Promise<{ ok: boolean; created?: boolean; error?: string }> {
  const builtIn = builtInById.get(input.id);
  const [existing] = await db.select().from(embedServerState).where(eq(embedServerState.id, input.id)).limit(1);

  if (input.isNew && (builtIn || existing)) {
    return { ok: false, error: `A server with id "${input.id}" already exists.` };
  }
  if (!input.isNew && !builtIn && !existing) {
    return { ok: false, error: "Server not found." };
  }

  const now = new Date();

  // Revert a built-in server's custom name/URL/mirror overrides back to code defaults.
  if (input.resetOverrides && builtIn) {
    await db
      .update(embedServerState)
      .set({
        name: null,
        badge: null,
        language: null,
        movieUrlTemplate: null,
        tvUrlTemplate: null,
        mirrors: null,
        priority: defaultPriorityById.get(input.id) ?? 100,
        updatedAt: now,
      })
      .where(eq(embedServerState.id, input.id));
    return { ok: true, created: false };
  }

  const isCustom = !builtIn;
  const payload = {
    isCustom,
    name: input.name,
    badge: input.badge,
    language: input.language,
    movieUrlTemplate: input.movieUrlTemplate,
    tvUrlTemplate: input.tvUrlTemplate || null,
    mirrors: input.mirrors,
    priority: input.priority,
    updatedAt: now,
  };

  await db
    .insert(embedServerState)
    .values({ id: input.id, enabled: true, ...payload })
    .onConflictDoUpdate({
      target: embedServerState.id,
      set: payload,
    });

  return { ok: true, created: Boolean(input.isNew) };
}

/** Deletes an admin-added custom server (and its health history/reports). Built-in servers cannot be deleted. */
export async function deleteCustomEmbedServer(id: string): Promise<"deleted" | "builtin" | "not_found"> {
  if (builtInById.has(id)) return "builtin";
  const [row] = await db
    .delete(embedServerState)
    .where(eq(embedServerState.id, id))
    .returning({ id: embedServerState.id });
  if (!row) return "not_found";
  await Promise.all([
    db.delete(embedServerCheck).where(eq(embedServerCheck.serverId, id)),
    db.delete(embedServerReport).where(eq(embedServerReport.serverId, id)),
  ]);
  return "deleted";
}

/** Records one broken report per signed-in user for `serverId`. Returns the updated count. */
export async function recordBrokenEmbedReport(serverId: string, userId: string, titleId: string): Promise<number> {
  const builtIn = builtInById.get(serverId);
  const [existing] = await db.select().from(embedServerState).where(eq(embedServerState.id, serverId)).limit(1);
  if (!builtIn && !existing) return 0;

  await db
    .insert(embedServerReport)
    .values({ serverId, userId, titleId: titleId.slice(0, 60) })
    .onConflictDoNothing();

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(embedServerReport)
    .where(eq(embedServerReport.serverId, serverId));

  const reportCount = countRow?.count ?? 1;
  const basePriority = defaultPriorityById.get(serverId) ?? 100;

  await db
    .insert(embedServerState)
    .values({ id: serverId, priority: basePriority, reportCount })
    .onConflictDoUpdate({
      target: embedServerState.id,
      set: { reportCount, updatedAt: new Date() },
    });

  return reportCount;
}

/**
 * Probes all (or selected) embed providers 4 at a time, persists status + latency + history,
 * prunes samples older than 14 days, and invalidates the cached watch-page server list.
 */
export async function runEmbedHealthCheck(invalidate: Invalidate, targetIds?: string[]): Promise<EmbedHealthRunSummary> {
  const existing = await db.select().from(embedServerState);
  const existingMap = new Map(existing.map((r) => [r.id, r]));
  const allProviders = resolveEmbedProviders(toRuntimeStateMap(existing));
  const targets = targetIds?.length ? allProviders.filter((p) => targetIds.includes(p.id)) : allProviders;

  const summary: EmbedHealthRunSummary = { checked: 0, online: 0, slow: 0, down: 0 };
  const CONCURRENCY = 4;

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (provider) => ({ provider, probe: await probeEmbedProvider(provider) }))
    );

    const now = new Date();
    for (const { provider, probe } of results) {
      summary.checked++;
      summary[probe.status]++;

      const prev = existingMap.get(provider.id);
      const basePriority = defaultPriorityById.get(provider.id) ?? 100;
      const nextFailCount = probe.status === "down" ? (prev?.failCount ?? 0) + 1 : 0;

      await db
        .insert(embedServerState)
        .values({
          id: provider.id,
          isCustom: provider.isCustom,
          priority: prev?.priority ?? basePriority,
          enabled: prev?.enabled ?? true,
          status: probe.status,
          latencyMs: probe.latencyMs,
          failCount: nextFailCount,
          lastError: probe.error,
          lastCheckedAt: now,
          lastOkAt: probe.status === "down" ? (prev?.lastOkAt ?? null) : now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: embedServerState.id,
          set: {
            status: probe.status,
            latencyMs: probe.latencyMs,
            failCount: nextFailCount,
            lastError: probe.error,
            lastCheckedAt: now,
            ...(probe.status === "down" ? {} : { lastOkAt: now }),
            updatedAt: now,
          },
        });

      await db.insert(embedServerCheck).values({
        serverId: provider.id,
        status: probe.status,
        latencyMs: probe.latencyMs,
        httpStatus: probe.httpStatus,
        error: probe.error,
        checkedAt: now,
      });
    }
  }

  // Keep uptime history bounded to 14 days.
  const cutoff = new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(embedServerCheck).where(lt(embedServerCheck.checkedAt, cutoff));

  if (summary.checked > 0) invalidate(EMBED_SERVERS_TAG);
  return summary;
}
