CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_enrollment_idx" ON "enrollments" USING btree ("student_id","program_id") WHERE status IN ('active', 'confirmed');
