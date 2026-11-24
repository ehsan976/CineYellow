// Audio / subtitle languages per title, stored in Postgres (title_language).
//
// The first time a title page asks for a title, its languages are fetched from Movie of the Night
// and saved as "unverified". Every later visit reads the saved row, so the API is called once per
// title. Admins edit and verify rows from /admin/languages; their saves call updateTag() on
// titleLanguagesTag(id), so the title page shows the change straight away.
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

/** Asks Movie of the Night again and replaces the lists (back to "unverified"). */
export async function refetchTitleLanguages(ref: TitleRef): Promise<{ ok: true; found: boolean } | { ok: false; reason: string }> {
  const result = await fetchShowLanguages(ref);
  if ("reason" in result) return { ok: false, reason: result.reason };
  const now = new Date();
  const values = {
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
    .values({ titleId: ref.id, titleName: ref.name.slice(0, 300), imdbId: ref.imdbId ?? null, ...values })
    .onConflictDoUpdate({ target: titleLanguage.titleId, set: values });
  return { ok: true, found: result.found };
}

export async function getTitleLanguageRow(titleId: string) {
  const row = await selectRow(titleId);
  return row ? toAdminRow(row) : null;
}
