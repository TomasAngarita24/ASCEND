-- DropForeignKey
ALTER TABLE "workout" DROP CONSTRAINT "workout_routine_id_fkey";

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
