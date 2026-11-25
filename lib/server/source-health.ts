// Runs health checks on video sources and records the results (video_source health columns).
// Used by the cron route (/api/cron/source-health) and the admin "Check now" button.
//
// Rules:
// - Disabled sources and providers that are off aren't checked.
// - "ok" resets the failure count; a "broken" source becomes active again (a dead mark expires:
//   broken sources are re-checked after 30 minutes).
// - 3 failures in a row mark an *unlocked* source "broken" (the watch page skips it). A locked
//   source (an admin's) only gets its health fields: automation never changes its status.
// - Detected audio languages / max height fill empty fields on locked sources and overwrite them
//   on unlocked ones, so a manual value is never replaced.
// - "advisory" (e.g. 403 from a signed URL) and "skipped" only record when it was checked.
import { and, asc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { videoProvider, videoSource } from "@/db/schema";
import { checkSourceHealth, type HealthMethod, type HealthResult } from "@/lib/providers/health";
import { ALL_TITLE_VIDEOS_TAG, titleVideosTag } from "@/lib/server/title-videos";

/** Failures in a row before an unlocked source is marked broken. */
const FAILS_TO_BREAK = 3;

type Invalidate = (tag: string) => void;

interface Candidate {
  id: string;
  titleId: string;
  url: string;
  status: "active" | "disabled" | "broken";
  locked: boolean;
  failCount: number;
  audioLanguages: string[];
  maxHeight: number | null;
  providerId: string;
  method: HealthMethod;
  hosts: string[];
}

const candidateColumns = {
  id: videoSource.id,
  titleId: videoSource.titleId,
  url: videoSource.url,
  status: videoSource.status,
  locked: videoSource.locked,
  failCount: videoSource.failCount,
  audioLanguages: videoSource.audioLanguages,
  maxHeight: videoSource.maxHeight,
  providerId: videoSource.providerId,
  method: videoProvider.healthMethod,
  hosts: videoProvider.hosts,
};

/** Writes one result. Returns true when the source's playable state changed. */
async function record(source: Candidate, result: HealthResult): Promise<boolean> {
  const now = new Date();
  const base = { lastCheckedAt: now, lastError: result.error };
  let set: Partial<typeof videoSource.$inferInsert> = base;
  let changed = false;

  if (result.outcome === "ok") {
    set = { ...base, lastOkAt: now, failCount: 0, lastError: null };
    if (source.status === "broken" && !source.locked) {
      set.status = "active";
      changed = true;
    }
    if (result.audioLanguages?.length && (!source.locked || !source.audioLanguages.length)) {
      set.audioLanguages = result.audioLanguages;
    }
    if (result.maxHeight && (!source.locked || source.maxHeight === null)) set.maxHeight = result.maxHeight;
  } else if (result.outcome === "failed") {
    const failCount = source.failCount + 1;
    set = { ...base, failCount };
    if (!source.locked && source.status === "active" && failCount >= FAILS_TO_BREAK) {
      set.status = "broken";
      changed = true;
    }
  }
  // Don't touch a source an admin disabled while the check was running.
  await db.update(videoSource).set(set).where(and(eq(videoSource.id, source.id), ne(videoSource.status, "disabled")));
  return changed;
}

export interface HealthRunSummary {
  checked: number;
  ok: number;
  failed: number;
  advisory: number;
  skipped: number;
  nowBroken: number;
  recovered: number;
}

/**
 * Checks the sources most in need of it: never checked first, then the oldest. Active sources are
 * re-checked after 6 hours, broken ones after 30 minutes. At most `limit` per run, 4 at a time.
 */
export async function runSourceHealth(invalidate: Invalidate, limit = 25): Promise<HealthRunSummary> {
  const due = or(
    sql`${videoSource.lastCheckedAt} is null`,
    and(eq(videoSource.status, "active"), lt(videoSource.lastCheckedAt, sql`now() - interval '6 hours'`)),
    and(eq(videoSource.status, "broken"), lt(videoSource.lastCheckedAt, sql`now() - interval '30 minutes'`))
  );
  const candidates = (await db
    .select(candidateColumns)
    .from(videoSource)
    .innerJoin(videoProvider, eq(videoProvider.id, videoSource.providerId))
    .where(and(inArray(videoSource.status, ["active", "broken"]), eq(videoProvider.enabled, true), ne(videoProvider.healthMethod, "none"), due))
    .orderBy(sql`${videoSource.lastCheckedAt} asc nulls first`, asc(videoSource.createdAt))
    .limit(limit)) as Candidate[];

  const summary: HealthRunSummary = { checked: 0, ok: 0, failed: 0, advisory: 0, skipped: 0, nowBroken: 0, recovered: 0 };
  const touched = new Set<string>();
  for (let i = 0; i < candidates.length; i += 4) {
    await Promise.all(
      candidates.slice(i, i + 4).map(async (source) => {
        const result = await checkSourceHealth(source);
        const changed = await record(source, result);
        summary.checked++;
        summary[result.outcome]++;
        if (changed) {
          touched.add(source.titleId);
          if (result.outcome === "ok") summary.recovered++;
          else summary.nowBroken++;
        }
      })
    );
  }
  for (const titleId of touched) invalidate(titleVideosTag(titleId));
  if (touched.size) invalidate(ALL_TITLE_VIDEOS_TAG);
  return summary;
}

/** Checks one source now (admin "Check now"), whatever its schedule. null when it doesn't exist. */
export async function checkOneSource(id: string, invalidate: Invalidate): Promise<HealthResult | null> {
  const [source] = (await db
    .select(candidateColumns)
    .from(videoSource)
    .innerJoin(videoProvider, eq(videoProvider.id, videoSource.providerId))
    .where(eq(videoSource.id, id))
    .limit(1)) as Candidate[];
  if (!source) return null;
  const result = await checkSourceHealth(source);
  if (source.status !== "disabled") {
    await record(source, result);
    invalidate(titleVideosTag(source.titleId));
    invalidate(ALL_TITLE_VIDEOS_TAG);
  }
  return result;
}
