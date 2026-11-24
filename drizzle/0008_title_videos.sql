CREATE TABLE "title_video" (
	"key" text PRIMARY KEY NOT NULL,
	"title_id" text NOT NULL,
	"title_name" text DEFAULT '' NOT NULL,
	"season" integer,
	"episode" integer,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"intro_start" integer,
	"intro_end" integer,
	"credits_at" integer,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "title_video" ADD CONSTRAINT "title_video_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "title_video_title_idx" ON "title_video" USING btree ("title_id");