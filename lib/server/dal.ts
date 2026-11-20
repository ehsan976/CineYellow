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

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
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
      // ZurvaPay: paid time that hasn't ended, and the latest unconfirmed payment from the last
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
  // ZurvaPay; showing it as "waiting for confirmation" would only confuse.
  const supersededByPaid = Boolean(pending && paid && pending.createdAt < paid.createdAt);
  const pendingPayment: PendingPayment | null =
    pending && !supersededByPaid && isPlanId(pending.plan)
      ? { id: pending.id, plan: pending.plan, createdAt: pending.createdAt.toISOString() }
      : null;
  const demoPlan = isPlanId(userRow?.plan) ? userRow.plan : user.plan;

  return {
    account: {
      email: user.email,
      // With a gateway on, only paid time that hasn't ended counts; demo mode uses the user's field.
      plan: billingEnabled ? (access?.plan ?? null) : demoPlan,
      billing: billingEnabled,
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
