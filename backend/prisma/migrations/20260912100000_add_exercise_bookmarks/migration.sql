-- CreateTable
CREATE TABLE "exercise_bookmark" (
    "user_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_bookmark_pkey" PRIMARY KEY ("user_id", "exercise_id")
);

-- CreateIndex
CREATE INDEX "exercise_bookmark_user_id_idx" ON "exercise_bookmark"("user_id");

-- AddForeignKey
ALTER TABLE "exercise_bookmark" ADD CONSTRAINT "exercise_bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_bookmark" ADD CONSTRAINT "exercise_bookmark_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;