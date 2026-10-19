-- External assessment link (e.g. QwikTest) as a first-class curriculum item. Additive only; the value is not
-- used in this migration, so it is safe inside the runner's per-migration transaction (PostgreSQL 12+).
ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'external_test';
