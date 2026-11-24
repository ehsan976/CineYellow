// CineYellow's own tables. Everything hangs off Better Auth's `user` row and is removed with it
// (onDelete: cascade), so "Delete account" also clears profiles, lists and history.
import type { AvatarColor, LanguageStatus, PaymentProvider, PlanId, PlayerPrefs, SubtitleTrack } from "@/lib/types";
import { relations, sql } from "drizzle-orm";
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

/**
 * A profile's link to its Trakt account (trakt.tv): finished titles are added to its Trakt
 * history, and its Trakt watchlist can be imported into My List. Tokens are AES-GCM encrypted
 * (lib/trakt/crypto.ts), never sent to the browser.
 */
export const traktConnection = pgTable("trakt_connection", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profile.id, { onDelete: "cascade" }),
  username: text("username").notNull().default(""),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

/**
 * Audio and subtitle languages of one TMDB title (ISO 639-2 codes, e.g. "hin", "eng").
 * The first visit to a title page fills it from Movie of the Night ("unverified"); an admin can
 * then edit the lists and mark them "verified". Not tied to a user, so it is kept when users go.
 */
export const titleLanguage = pgTable(
  "title_language",
  {
    /** "movie-550" | "tv-1399" (lib/titles.ts). */
    titleId: text("title_id").primaryKey(),
    /** For the admin list and search. */
    titleName: text("title_name").notNull().default(""),
    imdbId: text("imdb_id"),
    audioLanguages: text("audio_languages").array().notNull().default(sql`'{}'::text[]`),
    subtitleLanguages: text("subtitle_languages").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").$type<LanguageStatus>().notNull().default("unverified"),
    /** Who wrote the lists last: the API ("api") or an admin ("admin"). */
    source: text("source").$type<"api" | "admin">().notNull().default("api"),
    /** "not_found": Movie of the Night had no entry for the title. "manual": added by an admin. */
    fetchResult: text("fetch_result").$type<"ok" | "not_found" | "manual">().notNull().default("ok"),
    /** Country whose streaming options the languages came from. */
    country: text("country").notNull().default("in"),
    fetchedAt: timestamp("fetched_at"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: text("verified_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("title_language_status_idx").on(table.status, table.updatedAt)],
);

/**
 * Video for a title or one episode, added by an admin (/admin/videos). `key` is "movie-550",
 * "tv-1399" (whole show) or "tv-1399:s1e3". Titles without a row play the demo stream.
 */
export const titleVideo = pgTable(
  "title_video",
  {
    key: text("key").primaryKey(),
    titleId: text("title_id").notNull(),
    titleName: text("title_name").notNull().default(""),
    season: integer("season"),
    episode: integer("episode"),
    /** "hls" (site player) | "embed" (host's player in an iframe). */
    kind: text("kind").$type<"hls" | "embed">().notNull(),
    url: text("url").notNull(),
    introStart: integer("intro_start"),
    introEnd: integer("intro_end"),
    creditsAt: integer("credits_at"),
    /** WebVTT files for the site player (HLS only): [{ lang, label, url }]. */
    subtitles: jsonb("subtitles").$type<SubtitleTrack[]>().notNull().default([]),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("title_video_title_idx").on(table.titleId)],
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

export const titleLanguageRelations = relations(titleLanguage, ({ one }) => ({
  verifier: one(user, { fields: [titleLanguage.verifiedBy], references: [user.id] }),
}));
