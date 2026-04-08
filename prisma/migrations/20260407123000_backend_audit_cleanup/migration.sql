-- Remove stale schema-only fields that are not part of the supported runtime model.
ALTER TABLE "Club" DROP COLUMN IF EXISTS "joinPolicy";
ALTER TABLE "Club" DROP COLUMN IF EXISTS "accessPolicy";
ALTER TABLE "User" DROP COLUMN IF EXISTS "accountType";

DROP TYPE IF EXISTS "ClubJoinPolicy";
DROP TYPE IF EXISTS "AccountType";

UPDATE "ClubRole"
SET "permissions" = '{
  "view_events": true,
  "view_competitions": true,
  "view_hours": true,
  "view_forms": true,
  "view_club_events": true,
  "view_practice": true,
  "create_hours": true,
  "create_practice": true
}'::jsonb
WHERE "name" = 'Member';

-- Database-backed rate limiting for multi-instance deployments.
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
