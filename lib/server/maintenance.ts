// Housekeeping run by /api/cron/prune.
import "server-only";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { watchHistory } from "@/db/schema";

/** Resume positions untouched for this long are dropped (Continue Watching only shows recent ones). */
const HISTORY_DAYS = 365;

/**
 * Deletes watch history nobody has touched in a year, so /api/me (which loads all of a user's
 * history) stays small. Trakt-linked profiles keep their full record on Trakt itself.
 */
export async function pruneOldHistory() {
  const deleted = await db
    .delete(watchHistory)
    .where(sql`${watchHistory.updatedAt} < now() - make_interval(days => ${HISTORY_DAYS})`)
    .returning({ key: watchHistory.key });
  return { historyDeleted: deleted.length, olderThanDays: HISTORY_DAYS };
}
