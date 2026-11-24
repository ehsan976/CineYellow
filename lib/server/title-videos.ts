// Video links per title / episode (table title_video), managed from /admin/videos.
// The watch page asks getVideoSource(); admins' saves call updateTag(titleVideosTag(titleId)).
import type { VideoSource } from "@/lib/types";
import { cacheTag } from "next/cache";
import { desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { titleVideo } from "@/db/schema";
import { setCacheLife } from "@/lib/tmdb/cache";
import { isAllowedEmbedUrl, videoKey, type VideoKind } from "@/lib/videos";

export const titleVideosTag = (titleId: string) => `title-video:${titleId}`;

type Row = typeof titleVideo.$inferSelect;

const toSource = (row: Row): VideoSource => ({
  kind: row.kind,
  url: row.url,
  introStart: row.introStart,
  introEnd: row.introEnd,
  creditsAt: row.creditsAt,
});

/**
 * The video for a title (movies) or an episode, falling back to a link for the whole show.
 * null → nothing added yet (the watch page plays the demo stream).
 */
export async function getVideoSource(titleId: string, season: number | null, episode: number | null): Promise<VideoSource | null> {
  "use cache";
  cacheTag(titleVideosTag(titleId));
  setCacheLife("days");
  const keys = [...new Set([videoKey(titleId, season, episode), titleId])];
  const rows = await db.select().from(titleVideo).where(inArray(titleVideo.key, keys));
  const row = keys.map((k) => rows.find((r) => r.key === k)).find(Boolean);
  // An embed link whose host is no longer allowed is ignored.
  if (!row || (row.kind === "embed" && !isAllowedEmbedUrl(row.url))) return null;
  return toSource(row);
}

export interface TitleVideoRow {
  key: string;
  titleId: string;
  titleName: string;
  season: number | null;
  episode: number | null;
  kind: VideoKind;
  url: string;
  introStart: number | null;
  introEnd: number | null;
  creditsAt: number | null;
  updatedAt: string;
}

const toAdminRow = (row: Row): TitleVideoRow => ({
  key: row.key,
  titleId: row.titleId,
  titleName: row.titleName,
  season: row.season,
  episode: row.episode,
  kind: row.kind,
  url: row.url,
  introStart: row.introStart,
  introEnd: row.introEnd,
  creditsAt: row.creditsAt,
  updatedAt: row.updatedAt.toISOString(),
});

export async function listTitleVideos({ q = "", page = 1 }: { q?: string; page?: number }) {
  const pageSize = 50;
  const term = q.trim().slice(0, 100);
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const filter = term ? or(ilike(titleVideo.titleName, like), ilike(titleVideo.key, like)) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(titleVideo)
      .where(filter)
      .orderBy(desc(titleVideo.updatedAt))
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(titleVideo).where(filter),
  ]);
  return { rows: rows.map(toAdminRow), total: count, page, pageSize };
}

export async function saveTitleVideo(input: {
  titleId: string;
  titleName: string;
  season: number | null;
  episode: number | null;
  kind: VideoKind;
  url: string;
  introStart: number | null;
  introEnd: number | null;
  creditsAt: number | null;
  adminId: string;
}) {
  const key = videoKey(input.titleId, input.season, input.episode);
  const values = {
    titleName: input.titleName.slice(0, 300),
    season: input.season,
    episode: input.episode,
    kind: input.kind,
    url: input.url,
    introStart: input.introStart,
    introEnd: input.introEnd,
    creditsAt: input.creditsAt,
    updatedAt: new Date(),
  };
  await db
    .insert(titleVideo)
    .values({ key, titleId: input.titleId, createdBy: input.adminId, ...values })
    .onConflictDoUpdate({ target: titleVideo.key, set: values });
  return key;
}

/** Deletes one link; returns its title id (for cache invalidation) or null. */
export async function deleteTitleVideo(key: string): Promise<string | null> {
  const [row] = await db.delete(titleVideo).where(eq(titleVideo.key, key)).returning({ titleId: titleVideo.titleId });
  return row?.titleId ?? null;
}
