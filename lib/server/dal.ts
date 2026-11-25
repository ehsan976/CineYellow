// Data Access Layer: the only place server code reads the session and the user's rows.
// Every route handler and server action goes through requireUser()/requireProfile(), so a
// request can only ever touch the signed-in user's own data.
import type { AccessInfo, HistoryEntry, PendingPayment, PlanId } from "@/lib/types";
import type { UserData } from "@/lib/user-data";
import { headers } from "next/headers";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { myList, payment, profile, session as sessionTable, user as userTable, userSettings, watchHistory } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { billingEnabled } from "@/lib/payments/config";
import { isCheckoutPaused } from "@/lib/payments/service";
import { isPlanId } from "@/lib/user-data";
import { createUserDefaults } from "@/lib/server/user-defaults";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  createdAt: Date;
  /** Token of the current session (to confirm it still exists in the database). */
  sessionToken: string;
}

/** The signed-in user (verified by Better Auth), or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { plan?: string };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    plan: isPlanId(u.plan) ? u.plan : "standard",
    createdAt: new Date(u.createdAt),
    sessionToken: session.session.token,
  };
}

/**
 * The signed-in user, confirmed against the database. Better Auth's session comes from a cookie
 * cache that can be up to 5 minutes old, so a ban or "sign out everywhere" wouldn't stop writes
 * until it expired. One query checks that the session row still exists and the user isn't banned.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  const [row] = await db
    .select({ banned: userTable.banned })
    .from(sessionTable)
    .innerJoin(userTable, eq(userTable.id, sessionTable.userId))
    .where(and(eq(sessionTable.token, user.sessionToken), eq(sessionTable.userId, user.id), gt(sessionTable.expiresAt, sql`now()`)))
    .limit(1);
  if (!row || row.banned) throw new UnauthorizedError();
  return user;
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
  }
}

/**
 * The signed-in user, if they are an admin. The role and ban flag are read from the user row
 * (not the 5-minute session cookie cache), so a demoted or banned admin is stopped at once.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  const [row] = await db
    .select({ role: userTable.role, banned: userTable.banned })
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);
  const roles = (row?.role ?? "").split(",").map((r) => r.trim());
  if (!row || row.banned || !roles.includes("admin")) throw new ForbiddenError();
  return user;
}

/** One shape (this project builds without strict mode, so unions don't narrow). */
export interface WatchAccess {
  allowed: boolean;
  /** Why not, when `allowed` is false. */
  reason: "ok" | "signed-out" | "no-plan";
  /** A Safepay payment from the last day is still waiting for confirmation. */
  pendingPayment: boolean;
  /** Admins may preview titles that have no video yet (the demo stream), to test the player. */
  isAdmin: boolean;
}

const WATCH_OK: WatchAccess = { allowed: true, reason: "ok", pendingPayment: false, isAdmin: false };
const SIGNED_OUT: WatchAccess = { allowed: false, reason: "signed-out", pendingPayment: false, isAdmin: false };

/**
 * May the signed-in user play videos right now? Checked on the server before the watch page
 * reads a video link, so the stream / embed URL never reaches someone without access (the
 * player's own "Choose a plan" screen is only a convenience on top of this).
 * - Signed out, banned, or a revoked session: no.
 * - Admins: always (to check the videos they add).
 * - Payments off (no Safepay keys): yes, like the rest of demo mode.
 * - Payments on: only with paid time that hasn't ended.
 */
export async function getWatchAccess(): Promise<WatchAccess> {
  const user = await getCurrentUser();
  if (!user) return SIGNED_OUT;

  const [[row], [sessionRow], [paid], [pending]] = await Promise.all([
    db.select({ role: userTable.role, banned: userTable.banned }).from(userTable).where(eq(userTable.id, user.id)).limit(1),
    // The session comes from a 5-minute cookie cache; make sure it still exists.
    db.select({ id: sessionTable.id }).from(sessionTable).where(eq(sessionTable.token, user.sessionToken)).limit(1),
    billingEnabled
      ? db
          .select({ id: payment.id })
          .from(payment)
          .where(and(eq(payment.userId, user.id), eq(payment.status, "paid"), gt(payment.periodEnd, sql`now()`)))
          .limit(1)
      : Promise.resolve([]),
    billingEnabled
      ? db
          .select({ id: payment.id })
          .from(payment)
          .where(and(eq(payment.userId, user.id), eq(payment.status, "pending"), gt(payment.createdAt, sql`now() - interval '1 day'`)))
          .limit(1)
      : Promise.resolve([]),
  ]);
  if (!row || row.banned || !sessionRow) return SIGNED_OUT;

  const isAdmin = (row.role ?? "").split(",").map((r) => r.trim()).includes("admin");
  if (isAdmin) return { ...WATCH_OK, isAdmin: true };
  if (!billingEnabled || paid) return WATCH_OK;
  return { allowed: false, reason: "no-plan", pendingPayment: Boolean(pending), isAdmin: false };
}

/** The user plus one of *their* profiles. Throws if the id belongs to someone else. */
export async function requireProfile(profileId: unknown) {
  const user = await requireUser();
  if (typeof profileId !== "string") throw new UnauthorizedError();
  const [row] = await db
    .select({ id: profile.id })
    .from(profile)
    .where(and(eq(profile.id, profileId), eq(profile.userId, user.id)))
    .limit(1);
  if (!row) throw new UnauthorizedError();
  return { user, profileId: row.id };
}

/** Everything the browser stores need. All queries run in parallel: one round trip to the database. */
export async function getUserData(user: CurrentUser): Promise<UserData> {
  // Rows belonging to this user's profiles, without first waiting for the profile ids.
  const ownProfileIds = db.select({ id: profile.id }).from(profile).where(eq(profile.userId, user.id));
  const load = () =>
    Promise.all([
      db.select().from(profile).where(eq(profile.userId, user.id)).orderBy(asc(profile.sortOrder), asc(profile.createdAt)),
      db.select().from(userSettings).where(eq(userSettings.userId, user.id)).limit(1),
      // The session comes from a 5-minute cookie cache, so read the plan and ban flag from the user
      // row itself, and check the session row still exists (an admin ban or "sign out everywhere"
      // deletes it, but the cookie cache would keep it looking valid for up to 5 minutes).
      db.select({ plan: userTable.plan, banned: userTable.banned }).from(userTable).where(eq(userTable.id, user.id)).limit(1),
      db.select({ id: sessionTable.id }).from(sessionTable).where(eq(sessionTable.token, user.sessionToken)).limit(1),
      db.select().from(myList).where(inArray(myList.profileId, ownProfileIds)).orderBy(desc(myList.addedAt)),
      db.select().from(watchHistory).where(inArray(watchHistory.profileId, ownProfileIds)),
      // Safepay: paid time that hasn't ended, and the latest unconfirmed payment from the last
      // day (so the account page can show it and offer "Check status").
      billingEnabled
        ? db
            .select()
            .from(payment)
            .where(and(eq(payment.userId, user.id), eq(payment.status, "paid"), gt(payment.periodEnd, sql`now()`)))
            .orderBy(desc(payment.periodEnd))
            .limit(1)
        : Promise.resolve([]),
      billingEnabled
        ? db
            .select()
            .from(payment)
            .where(and(eq(payment.userId, user.id), eq(payment.status, "pending"), gt(payment.createdAt, sql`now() - interval '1 day'`)))
            .orderBy(desc(payment.createdAt))
            .limit(1)
        : Promise.resolve([]),
    ]);

  let [profiles, [settings], [userRow], [sessionRow], listRows, historyRows, [paid], [pending]] = await load();
  if (!userRow || userRow.banned || !sessionRow) throw new UnauthorizedError();
  if (!profiles.length || !settings) {
    // Accounts created before profiles moved to the database (happens once per account).
    await createUserDefaults(user);
    [profiles, [settings], [userRow], [sessionRow], listRows, historyRows, [paid], [pending]] = await load();
  }

  const ids = profiles.map((p) => p.id);
  const lists: UserData["lists"] = Object.fromEntries(ids.map((id) => [id, []]));
  for (const row of listRows) (lists[row.profileId] ??= []).push(row.titleId);

  const history: UserData["history"] = Object.fromEntries(ids.map((id) => [id, {}]));
  for (const row of historyRows) {
    const entry: HistoryEntry = {
      key: row.key,
      titleId: row.titleId,
      season: row.season,
      episode: row.episode,
      time: row.positionSec,
      duration: row.durationSec,
      updatedAt: row.updatedAt.getTime(),
    };
    (history[row.profileId] ??= {})[row.key] = entry;
  }

  const access: AccessInfo | null =
    paid?.periodEnd && isPlanId(paid.plan) ? { plan: paid.plan, until: paid.periodEnd.toISOString(), method: paid.method } : null;
  // A checkout started before the payment that gave the current access was left unfinished on
  // Safepay; showing it as "waiting for confirmation" would only confuse.
  const supersededByPaid = Boolean(pending && paid && pending.createdAt < paid.createdAt);
  const pendingPayment: PendingPayment | null =
    pending && !supersededByPaid && isPlanId(pending.plan)
      ? { id: pending.id, plan: pending.plan, createdAt: pending.createdAt.toISOString() }
      : null;
  const demoPlan = isPlanId(userRow?.plan) ? userRow.plan : user.plan;
  const checkoutPaused = billingEnabled && (await isCheckoutPaused());

  return {
    account: {
      email: user.email,
      // With a gateway on, only paid time that hasn't ended counts; demo mode uses the user's field.
      plan: billingEnabled ? (access?.plan ?? null) : demoPlan,
      billing: billingEnabled,
      checkoutPaused,
      access,
      pendingPayment,
      memberSince: user.createdAt.toISOString().slice(0, 10),
      notifications: {
        newEpisodes: settings?.newEpisodes ?? true,
        recommendations: settings?.recommendations ?? true,
        emailUpdates: settings?.emailUpdates ?? false,
      },
    },
    profiles: profiles.map((p) => ({ id: p.id, name: p.name, color: p.color, kids: p.kids, language: p.language })),
    lists,
    history,
    prefs: Object.fromEntries(profiles.map((p) => [p.id, p.playerPrefs ?? {}])),
  };
}
