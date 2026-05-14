-- Audit trail for hour-entry rejections. Mirrors the approvedAt/approvedById
-- shape so reviewers (and downstream activity logs) can attribute a rejection
-- to a specific user + timestamp.
ALTER TABLE "HourEntry" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "HourEntry" ADD COLUMN IF NOT EXISTS "rejectedById" TEXT;

CREATE INDEX IF NOT EXISTS "HourEntry_rejectedById_idx" ON "HourEntry"("rejectedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HourEntry_rejectedById_fkey'
  ) THEN
    ALTER TABLE "HourEntry"
      ADD CONSTRAINT "HourEntry_rejectedById_fkey"
      FOREIGN KEY ("rejectedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
