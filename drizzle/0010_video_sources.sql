CREATE TABLE "title" (
	"id" text PRIMARY KEY NOT NULL,
	"media" text NOT NULL,
	"tmdb_id" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"imdb_id" text,
	"anilist_id" integer,
	"mal_id" integer,
	"type_override" text,
	"origin_country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "title_media_chk" CHECK ("title"."media" in ('movie', 'tv')),
	CONSTRAINT "title_id_chk" CHECK ("title"."id" = "title"."media" || '-' || "title"."tmdb_id"),
	CONSTRAINT "title_type_override_chk" CHECK ("title"."type_override" is null or "title"."type_override" in ('movie', 'series', 'anime'))
);
--> statement-breakpoint
CREATE TABLE "video_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"hosts" text[] DEFAULT '{}'::text[] NOT NULL,
	"health_method" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_provider_kind_chk" CHECK ("video_provider"."kind" in ('hls', 'embed')),
	CONSTRAINT "video_provider_health_chk" CHECK ("video_provider"."health_method" in ('manifest', 'oembed', 'none')),
	CONSTRAINT "video_provider_priority_chk" CHECK ("video_provider"."priority" between 0 and 1000)
);
--> statement-breakpoint
CREATE TABLE "video_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" text NOT NULL,
	"season" integer,
	"episode" integer,
	"provider_id" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"origin" text DEFAULT 'manual' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"audio_languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"subtitles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_height" integer,
	"intro_start" integer,
	"intro_end" integer,
	"credits_at" integer,
	"last_checked_at" timestamp,
	"last_ok_at" timestamp,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_source_url_uq" UNIQUE NULLS NOT DISTINCT("title_id","season","episode","url"),
	CONSTRAINT "video_source_episode_chk" CHECK (("video_source"."season" is null and "video_source"."episode" is null) or ("video_source"."season" >= 1 and "video_source"."episode" >= 1)),
	CONSTRAINT "video_source_intro_chk" CHECK (("video_source"."intro_start" is null and "video_source"."intro_end" is null) or ("video_source"."intro_start" >= 0 and "video_source"."intro_end" > "video_source"."intro_start")),
	CONSTRAINT "video_source_kind_chk" CHECK ("video_source"."kind" in ('hls', 'embed')),
	CONSTRAINT "video_source_origin_chk" CHECK ("video_source"."origin" in ('manual', 'auto')),
	CONSTRAINT "video_source_status_chk" CHECK ("video_source"."status" in ('active', 'disabled', 'broken')),
	CONSTRAINT "video_source_priority_chk" CHECK ("video_source"."priority" between 0 and 1000)
);
--> statement-breakpoint
DROP INDEX "payment_provider_txn_idx";--> statement-breakpoint
ALTER TABLE "video_source" ADD CONSTRAINT "video_source_title_id_title_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."title"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_source" ADD CONSTRAINT "video_source_provider_id_video_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."video_provider"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_source" ADD CONSTRAINT "video_source_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "title_media_tmdb_uq" ON "title" USING btree ("media","tmdb_id");--> statement-breakpoint
CREATE INDEX "video_source_lookup_idx" ON "video_source" USING btree ("title_id","season","episode");--> statement-breakpoint
CREATE INDEX "video_source_health_idx" ON "video_source" USING btree ("status","last_checked_at");--> statement-breakpoint
CREATE INDEX "video_source_updated_idx" ON "video_source" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_txn_uq" ON "payment" USING btree ("provider_txn_id") WHERE "payment"."provider_txn_id" is not null;--> statement-breakpoint
CREATE INDEX "title_language_audio_gin" ON "title_language" USING gin ("audio_languages");--> statement-breakpoint
CREATE INDEX "title_language_subtitle_gin" ON "title_language" USING gin ("subtitle_languages");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_status_chk" CHECK ("payment"."status" in ('pending', 'paid', 'failed', 'refunded'));--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_provider_chk" CHECK ("payment"."provider" in ('safepay'));--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_plan_chk" CHECK ("payment"."plan" in ('basic', 'standard', 'premium'));--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_amount_chk" CHECK ("payment"."amount" > 0);--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_currency_chk" CHECK ("payment"."currency" = 'PKR');--> statement-breakpoint
ALTER TABLE "title_language" ADD CONSTRAINT "title_language_status_chk" CHECK ("title_language"."status" in ('unverified', 'verified'));--> statement-breakpoint
ALTER TABLE "title_language" ADD CONSTRAINT "title_language_source_chk" CHECK ("title_language"."source" in ('api', 'admin'));--> statement-breakpoint
ALTER TABLE "title_language" ADD CONSTRAINT "title_language_fetch_result_chk" CHECK ("title_language"."fetch_result" in ('ok', 'not_found', 'manual'));--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_position_chk" CHECK ("watch_history"."position_sec" >= 0 and "watch_history"."duration_sec" > 0);