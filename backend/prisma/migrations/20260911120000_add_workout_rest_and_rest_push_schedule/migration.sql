-- AlterTable
ALTER TABLE "workout_exercise" ADD COLUMN     "rest_seconds" INTEGER;

-- CreateTable
CREATE TABLE "rest_push_schedule" (
    "user_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rest_push_schedule_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "rest_push_schedule" ADD CONSTRAINT "rest_push_schedule_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;