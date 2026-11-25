"use server";

// Server actions behind the browser stores in lib/stores/*. Each one re-checks the session, and
// every write is limited to the signed-in user's own profiles *inside the same SQL statement*
// (no separate ownership query), so a save is a single round trip to the database.
import type { Account, PlanId, PlayerPrefs } from "@/lib/types";
import { headers } from "next/headers";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { myList, profile, userSettings, watchHistory } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { UnauthorizedError, requireUser } from "@/lib/server/dal";
import { cleanPlayerPrefs, cleanProfilePatch, isPlanId, isTitleIdList, titleIdsOnly } from "@/lib/user-data";
import { isTitleId } from "@/lib/titles";

export type ActionResult = { ok: boolean; error?: string };

/** Most titles one profile's My List can hold. */
const MAX_LIST = 500;

const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 128;

async function attempt(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "Your session has ended. Please sign in again." };
    console.error(error);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
}

/** Ids of the user's profiles, as a subquery (used to scope every write). */
const ownProfiles = (userId: string) => db.select({ id: profile.id }).from(profile).where(eq(profile.userId, userId));

/** Save one title to a profile's list (no-op if it isn't the user's profile or already saved). */
export async function addToListAction(profileId: string, titleId: string) {
  return attempt(async () => {
    if (!isId(profileId) || !isTitleId(titleId)) throw new Error("Invalid input");
    const user = await requireUser();
    await db
      .insert(myList)
      .select(
        db
          .select({ profileId: profile.id, titleId: sql<string>`${titleId}`.as("title_id"), addedAt: sql<Date>`now()`.as("added_at") })
          .from(profile)
          .where(
            and(
              eq(profile.id, profileId),
              eq(profile.userId, user.id),
              // Same cap as a whole-list save (setMyListAction): at most MAX_LIST titles per profile.
              // Table names spelled out: Drizzle can print columns here without their table.
              sql`(select count(*) from "my_list" ml where ml."profile_id" = ${profileId}) < ${MAX_LIST}`
            )
          )
      )
      .onConflictDoUpdate({ target: [myList.profileId, myList.titleId], set: { addedAt: sql`now()` } });
  });
}

export async function removeFromListAction(profileId: string, titleId: string) {
  return attempt(async () => {
    if (!isId(profileId) || !isTitleIdList([titleId])) throw new Error("Invalid input");
    const user = await requireUser();
    await db
      .delete(myList)
      .where(and(eq(myList.profileId, profileId), eq(myList.titleId, titleId), inArray(myList.profileId, ownProfiles(user.id))));
  });
}

/** Replace a whole list (newest first) — for "clear" and the one-time localStorage import. */
export async function setMyListAction(profileId: string, titleIds: string[]) {
  return attempt(async () => {
    if (!isId(profileId) || !isTitleIdList(titleIds)) throw new Error("Invalid list");
    const user = await requireUser();
    const [owned] = await db
      .select({ id: profile.id })
      .from(profile)
      .where(and(eq(profile.id, profileId), eq(profile.userId, user.id)))
      .limit(1);
    if (!owned) throw new UnauthorizedError();
    // Ids from the old mock catalog (one-time localStorage import) are dropped, not saved.
    const unique = titleIdsOnly(titleIds).slice(0, MAX_LIST);
    const now = Date.now();
    await db.transaction(async (tx) => {
      await tx.delete(myList).where(eq(myList.profileId, profileId));
      if (unique.length) {
        // Keep the order: the first id gets the newest timestamp.
        await tx.insert(myList).values(unique.map((titleId, i) => ({ profileId, titleId, addedAt: new Date(now - i) })));
      }
    });
  });
}

export async function clearHistoryAction(profileId: string) {
  return attempt(async () => {
    if (!isId(profileId)) throw new Error("Invalid input");
    const user = await requireUser();
    await db
      .delete(watchHistory)
      .where(and(eq(watchHistory.profileId, profileId), inArray(watchHistory.profileId, ownProfiles(user.id))));
  });
}

export async function updateProfileAction(profileId: string, patch: unknown) {
  return attempt(async () => {
    const clean = cleanProfilePatch(patch);
    if (!clean || !isId(profileId)) throw new Error("Nothing to update");
    const user = await requireUser();
    await db.update(profile).set(clean).where(and(eq(profile.id, profileId), eq(profile.userId, user.id)));
  });
}

export async function updatePlayerPrefsAction(profileId: string, prefs: PlayerPrefs) {
  return attempt(async () => {
    if (!isId(profileId)) throw new Error("Invalid input");
    const user = await requireUser();
    await db
      .update(profile)
      .set({ playerPrefs: cleanPlayerPrefs(prefs) })
      .where(and(eq(profile.id, profileId), eq(profile.userId, user.id)));
  });
}

export async function updateNotificationsAction(patch: Partial<Account["notifications"]>) {
  return attempt(async () => {
    const user = await requireUser();
    const set: Partial<Account["notifications"]> = {};
    for (const key of ["newEpisodes", "recommendations", "emailUpdates"] as const) {
      if (typeof patch?.[key] === "boolean") set[key] = patch[key];
    }
    if (!Object.keys(set).length) return;
    await db
      .insert(userSettings)
      .values({ userId: user.id, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set });
  });
}

/** Goes through Better Auth so the session's user data (and its cookie cache) stays in step. */
export async function updatePlanAction(plan: PlanId) {
  return attempt(async () => {
    if (!isPlanId(plan)) throw new Error("Invalid plan");
    await requireUser();
    await auth.api.updateUser({ headers: await headers(), body: { plan } as Record<string, unknown> });
  });
}
