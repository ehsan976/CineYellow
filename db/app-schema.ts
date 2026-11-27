// CineYellow's own tables. Everything hangs off Better Auth's `user` row and is removed with it
// (onDelete: cascade), so "Delete account" also clears profiles, lists and history.
import type { AvatarColor, LanguageStatus, PaymentProvider, PlanId, PlayerPrefs, ServerHealthStatus, ServerLanguage, SubtitleTrack } from "@/lib/types";
import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
    check("watch_history_position_chk", sql`${table.positionSec} >= 0 and ${table.durationSec} > 0`),
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
    /** "pending" → "paid" or "failed"; a refunded/reversed "paid" becomes "refunded". */
    status: text("status").$type<"pending" | "paid" | "failed" | "refunded">().notNull().default("pending"),
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
    // Webhooks look payments up by the gateway's reference (Safepay tracker); one row per tracker.
    uniqueIndex("payment_provider_txn_uq").on(table.providerTxnId).where(sql`${table.providerTxnId} is not null`),
    check("payment_status_chk", sql`${table.status} in ('pending', 'paid', 'failed', 'refunded')`),
    check("payment_provider_chk", sql`${table.provider} in ('safepay')`),
    check("payment_plan_chk", sql`${table.plan} in ('basic', 'standard', 'premium')`),
    check("payment_amount_chk", sql`${table.amount} > 0`),
    check("payment_currency_chk", sql`${table.currency} = 'PKR'`),
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
  (table) => [
    index("title_language_status_idx").on(table.status, table.updatedAt),
    // "Titles with Hindi audio" style lookups.
    index("title_language_audio_gin").using("gin", table.audioLanguages),
    index("title_language_subtitle_gin").using("gin", table.subtitleLanguages),
    check("title_language_status_chk", sql`${table.status} in ('unverified', 'verified')`),
    check("title_language_source_chk", sql`${table.source} in ('api', 'admin')`),
    check("title_language_fetch_result_chk", sql`${table.fetchResult} in ('ok', 'not_found', 'manual')`),
  ],
);

/**
 * LEGACY (read-only since migration 0010): one video per title or episode. Its rows were copied
 * into video_source, which the site now reads and writes. Kept for one release as a backup;
 * dropping it needs a separate, approved migration.
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

/**
 * Titles the site itself manages (has videos, or admin overrides). TMDB stays the source of truth
 * for everything else; this only holds ids and corrections TMDB can't give. Created on demand
 * (lib/server/titles.ts ensureTitle), never a full copy of the catalog.
 */
export const catalogTitle = pgTable(
  "title",
  {
    /** "movie-550" | "tv-1399" (lib/titles.ts). */
    id: text("id").primaryKey(),
    media: text("media").$type<"movie" | "tv">().notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    /** Display name when last saved (admin lists, search); TMDB has the current one. */
    name: text("name").notNull().default(""),
    imdbId: text("imdb_id"),
    /** Manual AniList / MyAnimeList match, used instead of the automatic one when set. */
    anilistId: integer("anilist_id"),
    malId: integer("mal_id"),
    /** Manual type, e.g. a Korean or Chinese animated show as "anime". */
    typeOverride: text("type_override").$type<"movie" | "series" | "anime">(),
    /** ISO 3166-1 country, e.g. "JP", "KR", "CN". */
    originCountry: text("origin_country"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("title_media_tmdb_uq").on(table.media, table.tmdbId),
    check("title_media_chk", sql`${table.media} in ('movie', 'tv')`),
    check("title_id_chk", sql`${table.id} = ${table.media} || '-' || ${table.tmdbId}`),
    check("title_type_override_chk", sql`${table.typeOverride} is null or ${table.typeOverride} in ('movie', 'series', 'anime')`),
  ],
);

/**
 * Video hosts the site may play from: only services whose videos the site has the rights to show
 * (its own HLS/CDN, and official players of licensed hosts). Admins can turn one off or reorder
 * them; health checks live in lib/video-providers. Seeded by migration 0010.
 */
export const videoProvider = pgTable(
  "video_provider",
  {
    /** Slug, e.g. "own-hls", "youtube". */
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** "hls": the site's own player. "embed": the host's player in an iframe. */
    kind: text("kind").$type<"hls" | "embed">().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    /** Lower plays first when a title has several sources. */
    priority: integer("priority").notNull().default(100),
    /** Hostnames this provider serves from ("youtube.com" also matches subdomains). Empty = any https host. */
    hosts: text("hosts").array().notNull().default(sql`'{}'::text[]`),
    /** How the health check tests a source: fetch the HLS manifest, ask oEmbed, or not at all. */
    healthMethod: text("health_method").$type<"manifest" | "oembed" | "none">().notNull().default("none"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("video_provider_kind_chk", sql`${table.kind} in ('hls', 'embed')`),
    check("video_provider_health_chk", sql`${table.healthMethod} in ('manifest', 'oembed', 'none')`),
    check("video_provider_priority_chk", sql`${table.priority} between 0 and 1000`),
  ],
);

/**
 * Every playable video: many per movie, whole show (season/episode null) or episode. Replaces
 * title_video. `origin` + `locked` keep manual work safe: automatic updates never change a locked
 * source. Health fields are filled by the checker (P4); a "broken" source is skipped until a
 * check passes again.
 */
export const videoSource = pgTable(
  "video_source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titleId: text("title_id")
      .notNull()
      .references(() => catalogTitle.id, { onDelete: "cascade" }),
    season: integer("season"),
    episode: integer("episode"),
    providerId: text("provider_id")
      .notNull()
      .references(() => videoProvider.id, { onDelete: "restrict" }),
    kind: text("kind").$type<"hls" | "embed">().notNull(),
    url: text("url").notNull(),
    /** Optional name shown when choosing a source, e.g. "Hindi dub" or "1080p". */
    label: text("label").notNull().default(""),
    origin: text("origin").$type<"manual" | "auto">().notNull().default("manual"),
    /** Manual edits win: automatic updates leave a locked source alone. */
    locked: boolean("locked").notNull().default(false),
    status: text("status").$type<"active" | "disabled" | "broken">().notNull().default("active"),
    /** Lower plays first among a title's sources. */
    priority: integer("priority").notNull().default(100),
    /** ISO 639-2 audio languages of this video (manual, or detected from the HLS manifest). */
    audioLanguages: text("audio_languages").array().notNull().default(sql`'{}'::text[]`),
    /** WebVTT files for the site player (HLS only): [{ lang, label, url }]. */
    subtitles: jsonb("subtitles").$type<SubtitleTrack[]>().notNull().default([]),
    /** Tallest rendition (e.g. 1080), when known. */
    maxHeight: integer("max_height"),
    introStart: integer("intro_start"),
    introEnd: integer("intro_end"),
    creditsAt: integer("credits_at"),
    lastCheckedAt: timestamp("last_checked_at"),
    lastOkAt: timestamp("last_ok_at"),
    failCount: integer("fail_count").notNull().default(0),
    lastError: text("last_error"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("video_source_lookup_idx").on(table.titleId, table.season, table.episode),
    index("video_source_health_idx").on(table.status, table.lastCheckedAt),
    index("video_source_updated_idx").on(table.updatedAt),
    // The same link twice for the same title/episode is a mistake, not a second source.
    unique("video_source_url_uq").on(table.titleId, table.season, table.episode, table.url).nullsNotDistinct(),
    // "is not null" spelled out: in SQL, `1 >= 1 and null` is NULL, and a CHECK lets NULL through.
    check(
      "video_source_episode_chk",
      sql`(${table.season} is null and ${table.episode} is null) or (${table.season} is not null and ${table.episode} is not null and ${table.season} >= 1 and ${table.episode} >= 1)`
    ),
    check(
      "video_source_intro_chk",
      sql`(${table.introStart} is null and ${table.introEnd} is null) or (${table.introStart} is not null and ${table.introEnd} is not null and ${table.introStart} >= 0 and ${table.introEnd} > ${table.introStart})`
    ),
    check("video_source_kind_chk", sql`${table.kind} in ('hls', 'embed')`),
    check("video_source_origin_chk", sql`${table.origin} in ('manual', 'auto')`),
    check("video_source_status_chk", sql`${table.status} in ('active', 'disabled', 'broken')`),
    check("video_source_priority_chk", sql`${table.priority} between 0 and 1000`),
  ],
);

/**
 * Runtime state, admin overrides, and latest health for each built-in embed provider
 * (lib/player/embed-providers.ts). Seeded/upserted automatically when admins or cron touch them.
 */
export const embedServerState = pgTable(
  "embed_server_state",
  {
    id: text("id").primaryKey(),
    /** True when added from the admin UI rather than built into lib/player/embed-providers.ts. */
    isCustom: boolean("is_custom").notNull().default(false),
    /** Optional admin-set name/badge/language/URLs (custom servers or overrides for built-in ones). */
    name: text("name"),
    badge: text("badge"),
    language: text("language").$type<ServerLanguage>(),
    movieUrlTemplate: text("movie_url_template"),
    tvUrlTemplate: text("tv_url_template"),
    mirrors: text("mirrors").array(),
    enabled: boolean("enabled").notNull().default(true),
    /** Lower plays first (0..1000). */
    priority: integer("priority").notNull().default(100),
    status: text("status").$type<ServerHealthStatus>().notNull().default("online"),
    latencyMs: integer("latency_ms"),
    /** Consecutive health-check failures (>= 3 triggers auto-skip until a check passes). */
    failCount: integer("fail_count").notNull().default(0),
    /** Distinct user broken reports since last reset (>= 3 demotes the server). */
    reportCount: integer("report_count").notNull().default(0),
    lastError: text("last_error"),
    lastCheckedAt: timestamp("last_checked_at"),
    lastOkAt: timestamp("last_ok_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("embed_server_status_chk", sql`${table.status} in ('online', 'slow', 'down')`),
    check("embed_server_language_chk", sql`${table.language} is null or ${table.language} in ('english', 'hindi')`),
    check("embed_server_priority_chk", sql`${table.priority} between 0 and 1000`),
    check("embed_server_fail_chk", sql`${table.failCount} >= 0`),
    check("embed_server_report_chk", sql`${table.reportCount} >= 0`),
  ],
);

/**
 * Historical check samples per embed provider for 24h / 7d uptime percentages.
 */
export const embedServerCheck = pgTable(
  "embed_server_check",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: text("server_id").notNull(),
    status: text("status").$type<ServerHealthStatus>().notNull(),
    latencyMs: integer("latency_ms"),
    httpStatus: integer("http_status"),
    error: text("error"),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => [
    index("embed_server_check_server_time_idx").on(table.serverId, table.checkedAt),
    check("embed_server_check_status_chk", sql`${table.status} in ('online', 'slow', 'down')`),
  ],
);

/**
 * One "Report broken" vote per signed-in user per embed server (prevents duplicate spam).
 * Cleared when an admin resets reports for that server.
 */
export const embedServerReport = pgTable(
  "embed_server_report",
  {
    serverId: text("server_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    titleId: text("title_id").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.serverId, table.userId] })],
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
