// The site's own title registry (table "title"): only titles it manages (has videos or overrides).
// TMDB stays the source of truth for metadata; this keeps ids and manual corrections.
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { catalogTitle } from "@/db/schema";
import { parseTitleId } from "@/lib/titles";

/**
 * Makes sure a registry row exists for `titleId` and refreshes its stored name / IMDb id.
 * Returns false for ids that aren't TMDB title ids.
 */
export async function ensureTitle(titleId: string, name: string, imdbId: string | null = null): Promise<boolean> {
  const ref = parseTitleId(titleId);
  if (!ref) return false;
  await db
    .insert(catalogTitle)
    .values({ id: titleId, media: ref.media, tmdbId: ref.tmdbId, name: name.slice(0, 300), imdbId })
    .onConflictDoUpdate({
      target: catalogTitle.id,
      set: {
        name: name.slice(0, 300),
        // Keep a known IMDb id if this save doesn't have one.
        imdbId: sql`coalesce(${imdbId}, ${catalogTitle.imdbId})`,
        updatedAt: new Date(),
      },
    });
  return true;
}
