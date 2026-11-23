// CineYellow's own tables. Everything hangs off Better Auth's `user` row and is removed with it
// (onDelete: cascade), so "Delete account" also clears profiles, lists and history.
import type { AvatarColor, PaymentProvider, PlanId, PlayerPrefs } from "@/lib/types";
import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/** Viewer profiles (like Netflix: one account, several people). */
export const profile = pgTable(
  "profile",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").$type<AvatarColor>().notNull().default("yellow"),
    kids: boolean("kids").notNull().default(false),
    language: text("language").notNull().default("English"),
    /** Volume, speed, subtitle language … remembered by the player for this profile. */
    playerPrefs: jsonb("player_prefs").$type<PlayerPrefs>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("profile_userId_idx").on(table.userId)],
);

/** "My List" — one row per saved title, per profile. */
export const myList = pgTable(
  "my_list",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    titleId: text("title_id").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.titleId] })],
);

/** Resume positions for Continue Watching. `key` is "title" or "title:s1e3". */
export const watchHistory = pgTable(
  "watch_history",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    titleId: text("title_id").notNull(),
    season: integer("season"),
    episode: integer("episode"),
    positionSec: integer("position_sec").notNull(),
    durationSec: integer("duration_sec").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.key] }),
    index("watch_history_profile_updated_idx").on(table.profileId, table.updatedAt),
  ],
);

/** Account-wide settings (one row per user). */
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  newEpisodes: boolean("new_episodes").notNull().default(true),
  recommendations: boolean("recommendations").notNull().default(true),
  emailUpdates: boolean("email_updates").notNull().default(false),
});

/**
 * One row per payment attempt. `id` is our order reference (sent to Safepay as metadata.order_id);
 * `providerTxnId` holds Safepay's tracker. A paid row gives access from periodStart to
 * periodEnd. Rows are kept when the user is deleted (user_id becomes null) for the accounts.
 */
export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    provider: text("provider").$type<PaymentProvider>().notNull(),
    /** "wallet" or "card". */
    method: text("method").notNull(),
    plan: text("plan").$type<PlanId>().notNull(),
    /** Whole rupees (PKR). */
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("PKR"),
    /** "pending" → "paid" or "failed". */
    status: text("status").notNull().default("pending"),
    /** The gateway's own transaction / retrieval reference. */
    providerTxnId: text("provider_txn_id"),
    responseCode: text("response_code"),
    responseMessage: text("response_message"),
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    paidAt: timestamp("paid_at"),
  },
  (table) => [
    index("payment_user_idx").on(table.userId, table.createdAt),
    index("payment_user_period_idx").on(table.userId, table.periodEnd),
    // Webhooks look payments up by the gateway's reference (Safepay tracker).
    index("payment_provider_txn_idx").on(table.providerTxnId),
  ],
);

export const profileRelations = relations(profile, ({ one, many }) => ({
  user: one(user, { fields: [profile.userId], references: [user.id] }),
  myList: many(myList),
  watchHistory: many(watchHistory),
}));

export const myListRelations = relations(myList, ({ one }) => ({
  profile: one(profile, { fields: [myList.profileId], references: [profile.id] }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  profile: one(profile, { fields: [watchHistory.profileId], references: [profile.id] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, { fields: [userSettings.userId], references: [user.id] }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, { fields: [payment.userId], references: [user.id] }),
}));
