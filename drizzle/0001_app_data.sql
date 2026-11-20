CREATE TABLE "my_list" (
	"profile_id" text NOT NULL,
	"title_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "my_list_profile_id_title_id_pk" PRIMARY KEY("profile_id","title_id")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'yellow' NOT NULL,
	"kids" boolean DEFAULT false NOT NULL,
	"language" text DEFAULT 'English' NOT NULL,
	"player_prefs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"new_episodes" boolean DEFAULT true NOT NULL,
	"recommendations" boolean DEFAULT true NOT NULL,
	"email_updates" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_history" (
	"profile_id" text NOT NULL,
	"key" text NOT NULL,
	"title_id" text NOT NULL,
	"season" integer,
	"episode" integer,
	"position_sec" integer NOT NULL,
	"duration_sec" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watch_history_profile_id_key_pk" PRIMARY KEY("profile_id","key")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "my_list" ADD CONSTRAINT "my_list_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_userId_idx" ON "profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watch_history_profile_updated_idx" ON "watch_history" USING btree ("profile_id","updated_at");