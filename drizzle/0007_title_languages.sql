CREATE TABLE "title_language" (
	"title_id" text PRIMARY KEY NOT NULL,
	"title_name" text DEFAULT '' NOT NULL,
	"imdb_id" text,
	"audio_languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"subtitle_languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"source" text DEFAULT 'api' NOT NULL,
	"fetch_result" text DEFAULT 'ok' NOT NULL,
	"country" text DEFAULT 'in' NOT NULL,
	"fetched_at" timestamp,
	"verified_at" timestamp,
	"verified_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "title_language" ADD CONSTRAINT "title_language_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "title_language_status_idx" ON "title_language" USING btree ("status","updated_at");