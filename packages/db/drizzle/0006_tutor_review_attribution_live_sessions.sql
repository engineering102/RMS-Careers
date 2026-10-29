-- Tutor Portal plan WS-3 (docs/plans/tutor-portal-implementation-plan.md §6). Additive only: one nullable column, one new
-- table, no new enum, no backfill, so code deployed before this migration keeps working after it.
-- CHECK constraints are hand-written here: Drizzle 0.31 cannot declare them in schema.ts.
CREATE TABLE IF NOT EXISTS "batch_live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"meeting_url" text NOT NULL,
	"joining_instructions" text,
	"recurrence_days" smallint[] NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"time_zone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bls_duration_chk" CHECK ("duration_minutes" BETWEEN 15 AND 480),
	CONSTRAINT "bls_days_chk" CHECK (cardinality("recurrence_days") BETWEEN 1 AND 7 AND "recurrence_days" <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
	CONSTRAINT "bls_time_chk" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
	CONSTRAINT "bls_window_chk" CHECK ("ends_on" IS NULL OR "starts_on" IS NULL OR "ends_on" >= "starts_on")
);
--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_live_sessions" ADD CONSTRAINT "batch_live_sessions_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_live_sessions" ADD CONSTRAINT "batch_live_sessions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_live_sessions_batch_pub_idx" ON "batch_live_sessions" USING btree ("batch_id","is_published");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
