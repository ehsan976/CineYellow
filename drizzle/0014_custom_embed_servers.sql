ALTER TABLE "embed_server_state" ADD COLUMN "is_custom" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "embed_server_state" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "embed_server_state" ADD COLUMN "badge" text;--> statement-breakpoint
ALTER TABLE "embed_server_state" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "embed_server_state" ADD COLUMN "movie_url_template" text;--> statement-breakpoint
ALTER TABLE "embed_server_state" ADD COLUMN "tv_url_template" text;--> statement-breakpoint
ALTER TABLE "embed_server_state" ADD COLUMN "mirrors" text[];--> statement-breakpoint
ALTER TABLE "embed_server_state" ADD CONSTRAINT "embed_server_language_chk" CHECK ("embed_server_state"."language" is null or "embed_server_state"."language" in ('english', 'hindi'));