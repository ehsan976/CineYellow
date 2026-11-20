// Server only (imported by lib/auth/server.ts, which the Better Auth CLI also loads in plain Node).
import { db } from "@/db";
import { profile, userSettings } from "@/db/schema";

/**
 * Starter profiles + settings for a user. Safe to call more than once: fixed ids and
 * ON CONFLICT DO NOTHING mean a retry (or two requests at once) never duplicates rows.
 * Called from Better Auth's user.create hook and, for accounts made before this existed, from /api/me.
 */
export async function createUserDefaults({ id, name }: { id: string; name: string }) {
  const firstName = (name.trim().split(/\s+/)[0] || "Me").slice(0, 24);
  await db
    .insert(profile)
    .values([
      { id: `${id}-main`, userId: id, name: firstName, color: "yellow", sortOrder: 0 },
      { id: `${id}-kids`, userId: id, name: "Kids", color: "emerald", kids: true, sortOrder: 1 },
    ])
    .onConflictDoNothing();
  await db.insert(userSettings).values({ userId: id }).onConflictDoNothing();
}
