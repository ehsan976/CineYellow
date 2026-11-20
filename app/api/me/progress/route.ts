import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { watchHistory } from "@/db/schema";
import { UnauthorizedError, requireProfile } from "@/lib/server/dal";
import { isHistoryEntry } from "@/lib/user-data";

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
  return new NextResponse(null, { status: 204 });
}
