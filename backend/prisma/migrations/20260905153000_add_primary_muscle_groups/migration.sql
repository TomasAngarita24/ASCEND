-- Add primary_muscle_groups column to exercise table
ALTER TABLE "exercise" ADD COLUMN "primary_muscle_groups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: populate primary_muscle_groups from the first element of target_muscle_groups
-- For exercises that have at least one target muscle group
UPDATE "exercise"
SET "primary_muscle_groups" = ARRAY["target_muscle_groups"[1]]
WHERE array_length("target_muscle_groups", 1) > 0;
