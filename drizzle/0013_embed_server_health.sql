CREATE TABLE "embed_server_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"status" text NOT NULL,
	"latency_ms" integer,
	"http_status" integer,
	"error" text,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embed_server_check_status_chk" CHECK ("embed_server_check"."status" in ('online', 'slow', 'down'))
);
--> statement-breakpoint
CREATE TABLE "embed_server_report" (
	"server_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embed_server_report_server_id_user_id_pk" PRIMARY KEY("server_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "embed_server_state" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"status" text DEFAULT 'online' NOT NULL,
	"latency_ms" integer,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_checked_at" timestamp,
	"last_ok_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embed_server_status_chk" CHECK ("embed_server_state"."status" in ('online', 'slow', 'down')),
	CONSTRAINT "embed_server_priority_chk" CHECK ("embed_server_state"."priority" between 0 and 1000),
	CONSTRAINT "embed_server_fail_chk" CHECK ("embed_server_state"."fail_count" >= 0),
	CONSTRAINT "embed_server_report_chk" CHECK ("embed_server_state"."report_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "embed_server_report" ADD CONSTRAINT "embed_server_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embed_server_check_server_time_idx" ON "embed_server_check" USING btree ("server_id","checked_at");