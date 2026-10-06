ALTER TYPE "public"."enrollment_status" ADD VALUE IF NOT EXISTS 'revoked';
--> statement-breakpoint
ALTER TYPE "public"."enrollment_status" ADD VALUE IF NOT EXISTS 'suspended';
--> statement-breakpoint
DROP INDEX IF EXISTS "unique_active_enrollment_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_batch_enrollment_idx" ON "enrollments" USING btree ("student_id","batch_id") WHERE status IN ('active', 'confirmed');
--> statement-breakpoint
ALTER TABLE "content_items" ALTER COLUMN "program_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "content_items" DROP CONSTRAINT IF EXISTS "content_items_program_id_programs_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_items" ADD CONSTRAINT "content_items_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "status" varchar(32) DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "batch_curriculum" ADD COLUMN IF NOT EXISTS "is_required" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_batch_xp_idx" ON "activities" USING btree ("batch_id","student_id","activity_date_ist");
