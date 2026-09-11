-- AlterTable
ALTER TABLE "routine" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sort_position" INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve current display order (most recently updated first) within each scope
UPDATE "routine" r
SET "sort_position" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, folder_id
    ORDER BY updated_at DESC, id ASC
  ) AS rn
  FROM "routine"
) sub
WHERE r.id = sub.id;

-- CreateIndex
CREATE INDEX "routine_user_id_is_public_idx" ON "routine"("user_id", "is_public");