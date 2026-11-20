CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"provider" text NOT NULL,
	"method" text NOT NULL,
	"plan" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'PKR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_txn_id" text,
	"response_code" text,
	"response_message" text,
	"period_start" timestamp,
	"period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_user_idx" ON "payment" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_user_period_idx" ON "payment" USING btree ("user_id","period_end");