// Audio / subtitle languages per title, stored in Postgres (title_language).
//
// The first time a title page asks for a title, its languages are fetched from Movie of the Night
// and saved as "unverified". Every later visit reads the saved row, so the API is called once per
// title. Admins edit and verify rows from /admin/languages; their saves call updateTag() on
// titleLanguagesTag(id), so the title page shows the change straight away.
import "server-only";
import type { LanguageStatus, TitleLanguages } from "@/lib/types";
import { cacheTag } from "next/cache";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { titleLanguage } from "@/db/schema";
import { fetchShowLanguages } from "@/lib/motn/client";
import { motn } from "@/lib/motn/config";
import { setCacheLife } from "@/lib/tmdb/cache";

export const titleLanguagesTag = (titleId: string) => `title-languages:${titleId}`;

type Row = typeof titleLanguage.$inferSelect;

export interface TitleRef {
  id: string;
  name: string;
  imdbId?: string | null;
}

function toDto(row: Row): TitleLanguages {
  return {
    titleId: row.titleId,
    audio: row.audioLanguages ?? [],
    subtitles: row.subtitleLanguages ?? [],
    status: row.status,
    notFound: row.fetchResult === "not_found",
  };
}

async function selectRow(titleId: string): Promise<Row | undefined> {
  const [row] = await db.select().from(titleLanguage).where(eq(titleLanguage.titleId, titleId)).limit(1);
  return row;
}

/**
 * Languages for the title page. Fetches from Movie of the Night and inserts the row on the first
 * request only; never overwrites a row (so admin edits are safe). null when nothing is known yet.
 * Call it at request time (after connection()), never during prerendering.
 */
export async function getTitleLanguages(ref: TitleRef): Promise<TitleLanguages | null> {
  "use cache";
  cacheTag(titleLanguagesTag(ref.id));

  let row = await selectRow(ref.id);
  if (!row && motn.enabled) {
    const result = await fetchShowLanguages(ref);
    if ("reason" in result) {
      // Rate limit, bad key, network: save nothing so a later visit tries again.
      setCacheLife("minutes");
      return null;
    }
    await db
      .insert(titleLanguage)
      .values({
        titleId: ref.id,
        titleName: ref.name.slice(0, 300),
        imdbId: ref.imdbId ?? null,
        audioLanguages: result.audio,
        subtitleLanguages: result.subtitles,
        fetchResult: result.found ? "ok" : "not_found",
        country: motn.country,
        fetchedAt: new Date(),
      })
      .onConflictDoNothing({ target: titleLanguage.titleId });
    row = await selectRow(ref.id);
  }
  if (!row) {
    // No Movie of the Night key and no admin entry yet.
    setCacheLife("hours");
    return null;
  }
  setCacheLife("days");
  return toDto(row);
}

// ---------- Admin ----------

export interface TitleLanguageRow extends TitleLanguages {
  titleName: string;
  source: "api" | "admin";
  fetchResult: "ok" | "not_found" | "manual";
  updatedAt: string;
  verifiedAt: string | null;
}

const toAdminRow = (row: Row): TitleLanguageRow => ({
  ...toDto(row),
  titleName: row.titleName,
  source: row.source,
  fetchResult: row.fetchResult,
  updatedAt: row.updatedAt.toISOString(),
  verifiedAt: row.verifiedAt?.toISOString() ?? null,
});

export type StatusFilter = LanguageStatus | "all";

export async function listTitleLanguages({ status = "unverified", q = "", page = 1 }: { status?: StatusFilter; q?: string; page?: number }) {
  const pageSize = 50;
  const where: SQL[] = [];
  if (status !== "all") where.push(eq(titleLanguage.status, status));
  const term = q.trim().slice(0, 100);
  if (term) {
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(titleLanguage.titleName, like), ilike(titleLanguage.titleId, like)));
  }
  const filter = where.length ? and(...where) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(titleLanguage)
      .where(filter)
      .orderBy(sql`case when ${titleLanguage.status} = 'unverified' then 0 else 1 end`, desc(titleLanguage.updatedAt))
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(titleLanguage).where(filter),
  ]);
  return { rows: rows.map(toAdminRow), total: count, page, pageSize };
}

export async function saveTitleLanguages(
  ref: TitleRef,
  { audio, subtitles, verified, adminId }: { audio: string[]; subtitles: string[]; verified: boolean; adminId: string }
) {
  const now = new Date();
  const values = {
    audioLanguages: audio,
    subtitleLanguages: subtitles,
    status: (verified ? "verified" : "unverified") as LanguageStatus,
    source: "admin" as const,
    verifiedAt: verified ? now : null,
    verifiedBy: verified ? adminId : null,
    updatedAt: now,
  };
  await db
    .insert(titleLanguage)
    .values({ titleId: ref.id, titleName: ref.name.slice(0, 300), imdbId: ref.imdbId ?? null, fetchResult: "manual", country: motn.country, ...values })
    .onConflictDoUpdate({ target: titleLanguage.titleId, set: values });
}

export async function setTitleLanguagesVerified(titleId: string, verified: boolean, adminId: string): Promise<boolean> {
  const rows = await db
    .update(titleLanguage)
    .set({
      status: verified ? "verified" : "unverified",
      verifiedAt: verified ? new Date() : null,
      verifiedBy: verified ? adminId : null,
      updatedAt: new Date(),
    })
    .where(eq(titleLanguage.titleId, titleId))
    .returning({ id: titleLanguage.titleId });
  return rows.length > 0;
}

/**
 * Asks Movie of the Night again and replaces the lists (back to "unverified"). A row an admin has
 * verified keeps its lists: only the fetch date and title name are refreshed (`kept: true`), so an
 * automatic answer never overwrites a manual correction. Unverify first to replace it on purpose.
 */
export async function refetchTitleLanguages(
  ref: TitleRef
): Promise<{ ok: true; found: boolean; kept: boolean } | { ok: false; reason: string }> {
  const result = await fetchShowLanguages(ref);
  if ("reason" in result) return { ok: false, reason: result.reason };
  const now = new Date();
  const existing = await selectRow(ref.id);
  if (existing?.status === "verified") {
    await db
      .update(titleLanguage)
      .set({ titleName: ref.name.slice(0, 300), fetchedAt: now, fetchResult: result.found ? "ok" : "not_found", updatedAt: now })
      .where(eq(titleLanguage.titleId, ref.id));
    return { ok: true, found: result.found, kept: true };
  }
  const values = {
    titleName: ref.name.slice(0, 300),
    audioLanguages: result.audio,
    subtitleLanguages: result.subtitles,
    status: "unverified" as LanguageStatus,
    source: "api" as const,
    fetchResult: (result.found ? "ok" : "not_found") as Row["fetchResult"],
    country: motn.country,
    fetchedAt: now,
    verifiedAt: null,
    verifiedBy: null,
    updatedAt: now,
  };
  await db
    .insert(titleLanguage)
    .values({ titleId: ref.id, imdbId: ref.imdbId ?? null, ...values })
    .onConflictDoUpdate({ target: titleLanguage.titleId, set: values });
  return { ok: true, found: result.found, kept: false };
}

/**
 * Background refresh (cron): re-asks Movie of the Night for automatic rows older than 30 days, so
 * new dubs and subtitles show up. Admin-written or verified rows are never touched. One title at a
 * time and at most `limit` per run (the API has a small quota). Stops early on auth/rate limits.
 */
export async function refreshStaleLanguages(invalidate: (tag: string) => void, limit = 15) {
  const rows = await db
    .select({ titleId: titleLanguage.titleId, titleName: titleLanguage.titleName, imdbId: titleLanguage.imdbId })
    .from(titleLanguage)
    .where(
      and(
        eq(titleLanguage.status, "unverified"),
        eq(titleLanguage.source, "api"),
        or(sql`${titleLanguage.fetchedAt} is null`, sql`${titleLanguage.fetchedAt} < now() - interval '30 days'`)
      )
    )
    .orderBy(sql`${titleLanguage.fetchedAt} asc nulls first`)
    .limit(limit);

  const summary = { due: rows.length, refreshed: 0, failed: 0, stoppedFor: null as string | null };
  for (const row of rows) {
    const result = await refetchTitleLanguages({ id: row.titleId, name: row.titleName, imdbId: row.imdbId });
    if ("reason" in result) {
      summary.failed++;
      // A bad key or an exhausted quota won't fix itself during this run.
      if (result.reason === "auth" || result.reason === "rate_limited" || result.reason === "disabled") {
        summary.stoppedFor = result.reason;
        break;
      }
      continue;
    }
    summary.refreshed++;
    invalidate(titleLanguagesTag(row.titleId));
  }
  return summary;
}

export async function getTitleLanguageRow(titleId: string) {
  const row = await selectRow(titleId);
  return row ? toAdminRow(row) : null;
}
