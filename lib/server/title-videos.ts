// Videos per title / episode (table video_source, since migration 0010; the old title_video
// table is a read-only backup), managed from /admin/videos. The watch page asks getVideoSource();
// admins' saves call updateTag(titleVideosTag(titleId)) and updateTag(ALL_TITLE_VIDEOS_TAG).
//
// A source plays only when it is "active" and its provider is enabled (video_provider).
import type { SubtitleTrack, VideoSource } from "@/lib/types";
import { cacheTag } from "next/cache";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { catalogTitle, videoProvider, videoSource } from "@/db/schema";
import { setCacheLife } from "@/lib/tmdb/cache";
import { ensureTitle } from "@/lib/server/titles";
import { isAllowedEmbedUrl, type VideoKind } from "@/lib/videos";

export const titleVideosTag = (titleId: string) => `title-video:${titleId}`;
/** Any video added, changed or removed (availability, the bell's "Now available" list). */
export const ALL_TITLE_VIDEOS_TAG = "title-videos";

type Source = typeof videoSource.$inferSelect;

/** Sources that may play: active, from an enabled provider, and (embeds) on an allowed host. */
const playable = and(eq(videoSource.status, "active"), eq(videoProvider.enabled, true));
const stillAllowed = (s: Pick<Source, "kind" | "url">) => s.kind === "hls" || isAllowedEmbedUrl(s.url);

/**
 * Ids of every title that has at least one playable video on the site (a movie, a whole show, or
 * any episode). Drives "Play" vs "Not on CineYellow yet", the "On CineYellow" badges and whether
 * checkout is open. Cached as one set; any admin save refreshes it. On a database error: an empty
 * set for a minute.
 */
export async function getAvailableTitleIds(): Promise<string[]> {
  "use cache";
  cacheTag(ALL_TITLE_VIDEOS_TAG);
  try {
    const rows = await db
      .select({ titleId: videoSource.titleId, kind: videoSource.kind, url: videoSource.url })
      .from(videoSource)
      .innerJoin(videoProvider, eq(videoProvider.id, videoSource.providerId))
      .where(playable);
    setCacheLife("hours");
    return [...new Set(rows.filter(stillAllowed).map((r) => r.titleId))];
  } catch (error) {
    console.warn("[title-videos] availability lookup failed:", error instanceof Error ? error.message : error);
    setCacheLife("minutes");
    return [];
  }
}

export interface RecentVideo {
  titleId: string;
  season: number | null;
  episode: number | null;
  updatedAt: string;
}

/**
 * The titles whose videos were added or updated most recently, one entry per title (its newest
 * video). null when the database can't be reached (callers then just leave these out).
 */
export async function getRecentVideos(limit = 6): Promise<RecentVideo[] | null> {
  "use cache";
  cacheTag(ALL_TITLE_VIDEOS_TAG);
  let rows: Pick<Source, "titleId" | "season" | "episode" | "kind" | "url" | "updatedAt">[];
  try {
    rows = await db
      .select({
        titleId: videoSource.titleId,
        season: videoSource.season,
        episode: videoSource.episode,
        kind: videoSource.kind,
        url: videoSource.url,
        updatedAt: videoSource.updatedAt,
      })
      .from(videoSource)
      .innerJoin(videoProvider, eq(videoProvider.id, videoSource.providerId))
      .where(playable)
      .orderBy(desc(videoSource.updatedAt))
      .limit(limit * 5);
  } catch (error) {
    console.warn("[title-videos] recent videos:", error instanceof Error ? error.message : error);
    setCacheLife("minutes");
    return null;
  }
  setCacheLife("hours");
  const seen = new Set<string>();
  return rows
    .filter((r) => stillAllowed(r) && !seen.has(r.titleId) && seen.add(r.titleId))
    .slice(0, limit)
    .map((r) => ({ titleId: r.titleId, season: r.season, episode: r.episode, updatedAt: r.updatedAt.toISOString() }));
}

const toSource = (row: Source & { providerName: string }): VideoSource => ({
  id: row.id,
  kind: row.kind,
  url: row.url,
  label: row.label,
  providerId: row.providerId,
  providerName: row.providerName,
  introStart: row.introStart,
  introEnd: row.introEnd,
  creditsAt: row.creditsAt,
  subtitles: row.kind === "hls" ? (row.subtitles ?? []) : [],
});

/**
 * Every video that may play for a title (movies) or an episode, best first; the player starts
 * with the first and falls back down the list. Order: the episode's own sources before ones for the
 * whole show, then the source's priority, then the provider's, then the most recently updated.
 * [] → nothing to play. Cached per title; admin saves refresh it.
 */
export async function getVideoSources(titleId: string, season: number | null, episode: number | null): Promise<VideoSource[]> {
  "use cache";
  // Per title for source edits; the global tag too, since turning a provider off affects every title.
  cacheTag(titleVideosTag(titleId), ALL_TITLE_VIDEOS_TAG);
  let rows: (Source & { providerName: string })[];
  try {
    const forEpisode = season && episode ? and(eq(videoSource.season, season), eq(videoSource.episode, episode)) : sql`false`;
    const wholeTitle = and(isNull(videoSource.season), isNull(videoSource.episode));
    rows = (
      await db
        .select({ source: videoSource, providerName: videoProvider.name })
        .from(videoSource)
        .innerJoin(videoProvider, eq(videoProvider.id, videoSource.providerId))
        .where(and(eq(videoSource.titleId, titleId), playable, or(forEpisode, wholeTitle)))
        .orderBy(
          // Episode-specific before whole-show.
          sql`(${videoSource.season} is null)`,
          asc(videoSource.priority),
          asc(videoProvider.priority),
          desc(videoSource.updatedAt)
        )
        .limit(20)
    ).map((r) => ({ ...r.source, providerName: r.providerName }));
  } catch (error) {
    // Database unreachable: don't crash the watch page; try again in a minute.
    console.warn("[title-videos] video lookup failed:", error instanceof Error ? error.message : error);
    setCacheLife("minutes");
    return [];
  }
  setCacheLife("days");
  return rows.filter(stillAllowed).map(toSource);
}

/** The best video for a title / episode, or null (see getVideoSources). */
export async function getVideoSource(titleId: string, season: number | null, episode: number | null): Promise<VideoSource | null> {
  return (await getVideoSources(titleId, season, episode))[0] ?? null;
}

export interface TitleVideoRow {
  id: string;
  titleId: string;
  titleName: string;
  season: number | null;
  episode: number | null;
  kind: VideoKind;
  url: string;
  label: string;
  providerId: string;
  providerName: string;
  status: Source["status"];
  locked: boolean;
  origin: Source["origin"];
  priority: number;
  introStart: number | null;
  introEnd: number | null;
  creditsAt: number | null;
  subtitles: SubtitleTrack[];
  updatedAt: string;
  /** Health check: when it last ran (ISO) and what went wrong, if anything. */
  lastCheckedAt: string | null;
  lastError: string | null;
  audioLanguages: string[];
  maxHeight: number | null;
}

export async function listTitleVideos({ q = "", page = 1 }: { q?: string; page?: number }) {
  const pageSize = 50;
  const term = q.trim().slice(0, 100);
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const filter = term ? or(ilike(catalogTitle.name, like), ilike(videoSource.titleId, like)) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db
      .select({ source: videoSource, titleName: catalogTitle.name, providerName: videoProvider.name })
      .from(videoSource)
      .innerJoin(catalogTitle, eq(catalogTitle.id, videoSource.titleId))
      .innerJoin(videoProvider, eq(videoProvider.id, videoSource.providerId))
      .where(filter)
      .orderBy(desc(videoSource.updatedAt))
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(videoSource)
      .innerJoin(catalogTitle, eq(catalogTitle.id, videoSource.titleId))
      .where(filter),
  ]);
  return {
    rows: rows.map(({ source: s, titleName, providerName }): TitleVideoRow => ({
      id: s.id,
      titleId: s.titleId,
      titleName,
      season: s.season,
      episode: s.episode,
      kind: s.kind,
      url: s.url,
      label: s.label,
      providerId: s.providerId,
      providerName,
      status: s.status,
      locked: s.locked,
      origin: s.origin,
      priority: s.priority,
      introStart: s.introStart,
      introEnd: s.introEnd,
      creditsAt: s.creditsAt,
      subtitles: s.subtitles ?? [],
      updatedAt: s.updatedAt.toISOString(),
      lastCheckedAt: s.lastCheckedAt?.toISOString() ?? null,
      lastError: s.lastError,
      audioLanguages: s.audioLanguages ?? [],
      maxHeight: s.maxHeight,
    })),
    total: count,
    page,
    pageSize,
  };
}

/** Thrown when an edit points at a source that no longer exists. */
export class SourceNotFoundError extends Error {}

/**
 * Adds a source, or updates source `id`. Admin saves are manual and locked, so automatic
 * updates (P4) never change them. Saving the same link again for the same title/episode updates
 * that source instead of adding a duplicate. Returns the source id.
 */
export async function saveTitleVideo(input: {
  id?: string | null;
  titleId: string;
  titleName: string;
  imdbId?: string | null;
  season: number | null;
  episode: number | null;
  kind: VideoKind;
  url: string;
  label?: string;
  providerId: string;
  introStart: number | null;
  introEnd: number | null;
  creditsAt: number | null;
  subtitles: SubtitleTrack[];
  adminId: string;
}): Promise<string> {
  await ensureTitle(input.titleId, input.titleName, input.imdbId ?? null);
  const values = {
    titleId: input.titleId,
    season: input.season,
    episode: input.episode,
    providerId: input.providerId,
    kind: input.kind,
    url: input.url,
    label: (input.label ?? "").trim().slice(0, 60),
    origin: "manual" as const,
    locked: true,
    introStart: input.introStart,
    introEnd: input.introEnd,
    creditsAt: input.creditsAt,
    subtitles: input.subtitles,
    updatedAt: new Date(),
  };

  if (input.id) {
    const [row] = await db.update(videoSource).set(values).where(eq(videoSource.id, input.id)).returning({ id: videoSource.id });
    if (!row) throw new SourceNotFoundError();
    return row.id;
  }
  const [row] = await db
    .insert(videoSource)
    .values({ ...values, createdBy: input.adminId })
    .onConflictDoUpdate({
      target: [videoSource.titleId, videoSource.season, videoSource.episode, videoSource.url],
      set: values,
    })
    .returning({ id: videoSource.id });
  return row.id;
}

/**
 * Quick changes from the admin list: turn a source off/on, reorder it, rename it, lock/unlock it.
 * Returns the source's title id (for cache invalidation), or null when it doesn't exist.
 * Turning a "broken" source back on clears its failure count so the checker starts fresh.
 */
export async function updateSource(
  id: string,
  patch: { status?: "active" | "disabled"; priority?: number; label?: string; locked?: boolean }
): Promise<string | null> {
  const [row] = await db
    .update(videoSource)
    .set({
      ...patch,
      ...(patch.status === "active" ? { failCount: 0, lastError: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(videoSource.id, id))
    .returning({ titleId: videoSource.titleId });
  return row?.titleId ?? null;
}

export interface ProviderRow {
  id: string;
  name: string;
  kind: "hls" | "embed";
  enabled: boolean;
  priority: number;
  hosts: string[];
  /** Sources using this provider. */
  sources: number;
}

export async function listProviders(): Promise<ProviderRow[]> {
  const rows = await db
    .select({
      id: videoProvider.id,
      name: videoProvider.name,
      kind: videoProvider.kind,
      enabled: videoProvider.enabled,
      priority: videoProvider.priority,
      hosts: videoProvider.hosts,
      sources: sql<number>`(select count(*)::int from ${videoSource} where ${videoSource.providerId} = ${videoProvider.id})`,
    })
    .from(videoProvider)
    .orderBy(asc(videoProvider.priority), asc(videoProvider.name));
  return rows;
}

/** Turn a provider off/on or change its priority. Returns false when it doesn't exist. */
export async function updateProvider(id: string, patch: { enabled?: boolean; priority?: number }): Promise<boolean> {
  const rows = await db
    .update(videoProvider)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(videoProvider.id, id))
    .returning({ id: videoProvider.id });
  return rows.length > 0;
}

/** The title a source belongs to, or null when it doesn't exist. */
export async function getSourceTitleId(id: string): Promise<string | null> {
  const [row] = await db.select({ titleId: videoSource.titleId }).from(videoSource).where(eq(videoSource.id, id)).limit(1);
  return row?.titleId ?? null;
}

/** Deletes one source; returns its title id (for cache invalidation) or null. */
export async function deleteTitleVideo(id: string): Promise<string | null> {
  const [row] = await db.delete(videoSource).where(eq(videoSource.id, id)).returning({ titleId: videoSource.titleId });
  return row?.titleId ?? null;
}
