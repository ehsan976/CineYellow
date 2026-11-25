import { NextResponse, after } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { watchHistory } from "@/db/schema";
import { UnauthorizedError, requireProfile } from "@/lib/server/dal";
import { isHistoryEntry } from "@/lib/user-data";
import { addToTraktHistory, type FinishedItem } from "@/lib/server/trakt";
import { trakt } from "@/lib/trakt/config";
import { hitLimit } from "@/lib/server/rate-limit";

/** Watched this share of a video → it counts as finished (sent to Trakt once). */
const FINISHED = 0.9;

const MAX_ITEMS = 200;

/**
 * Saves watch progress for one profile: { profileId, upserts: HistoryEntry[], deletes: string[] }.
 * The player batches positions in the browser and sends them here every few seconds, and with
 * navigator.sendBeacon when the tab closes — that's why this is a route handler, not a server action.
 */
export async function POST(request: Request) {
  let body: { profileId?: unknown; upserts?: unknown; deletes?: unknown };
  try {
    // sendBeacon may post as text/plain, so parse the text ourselves.
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const upserts = Array.isArray(body.upserts) ? body.upserts.filter(isHistoryEntry).slice(0, MAX_ITEMS) : [];
  const deletes = Array.isArray(body.deletes)
    ? body.deletes.filter((k): k is string => typeof k === "string" && k.length <= 128).slice(0, MAX_ITEMS)
    : [];

  let profileId: string;
  try {
    ({ profileId } = await requireProfile(body.profileId));
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }
  // Per profile (several people at home can share one IP): normal playback sends ~6 a minute.
  const limit = hitLimit(profileId, "progress");
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  // Trakt: entries that just reached the end are added to the profile's Trakt history. Two ways to
  // finish: a save at ≥ 90%, or a delete (the browser drops an entry once it passes 95%, so jumping
  // straight to the end arrives as a delete, never as a ≥ 90% save). Either counts only if the
  // stored position was still below 90%, so a title goes to Trakt once. Only these cases read the
  // saved rows, so normal saves cost nothing extra.
  const nearEnd = trakt.enabled ? upserts.filter((e) => e.duration > 0 && e.time / e.duration >= FINISHED) : [];
  const droppedKeys = trakt.enabled ? deletes : [];
  let finished: FinishedItem[] = [];
  if (nearEnd.length || droppedKeys.length) {
    const before = await db
      .select({
        key: watchHistory.key,
        titleId: watchHistory.titleId,
        season: watchHistory.season,
        episode: watchHistory.episode,
        positionSec: watchHistory.positionSec,
        durationSec: watchHistory.durationSec,
      })
      .from(watchHistory)
      .where(and(eq(watchHistory.profileId, profileId), inArray(watchHistory.key, [...nearEnd.map((e) => e.key), ...droppedKeys])));
    const wasFinished = (r: (typeof before)[number]) => r.durationSec > 0 && r.positionSec / r.durationSec >= FINISHED;
    const finishedBefore = new Set(before.filter(wasFinished).map((r) => r.key));
    const dropped = new Set(droppedKeys);
    finished = [
      ...nearEnd.filter((e) => !finishedBefore.has(e.key)).map(({ titleId, season, episode }) => ({ titleId, season, episode })),
      ...before.filter((r) => dropped.has(r.key) && !wasFinished(r)).map(({ titleId, season, episode }) => ({ titleId, season, episode })),
    ];
  }

  // Different keys, so the delete and the upsert can run at the same time.
  await Promise.all([
    deletes.length &&
      db.delete(watchHistory).where(and(eq(watchHistory.profileId, profileId), inArray(watchHistory.key, deletes))),
    upserts.length &&
      db
      .insert(watchHistory)
      .values(
        upserts.map((e) => ({
          profileId,
          key: e.key,
          titleId: e.titleId,
          season: e.season,
          episode: e.episode,
          positionSec: Math.round(e.time),
          durationSec: Math.round(e.duration),
          updatedAt: new Date(),
        }))
      )
      .onConflictDoUpdate({
        target: [watchHistory.profileId, watchHistory.key],
        set: {
          titleId: sql`excluded.title_id`,
          season: sql`excluded.season`,
          episode: sql`excluded.episode`,
          positionSec: sql`excluded.position_sec`,
          durationSec: sql`excluded.duration_sec`,
          updatedAt: sql`excluded.updated_at`,
        },
      }),
  ]);
  // After the response: Trakt is slow-ish and the player doesn't need to wait for it.
  if (finished.length) after(() => addToTraktHistory(profileId, finished));
  return new NextResponse(null, { status: 204 });
}
