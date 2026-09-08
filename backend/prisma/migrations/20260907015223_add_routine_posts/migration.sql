-- AlterTable
ALTER TABLE "post" ADD COLUMN     "routine_id" UUID;

-- CreateIndex
CREATE INDEX "post_routine_id_idx" ON "post"("routine_id");

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
