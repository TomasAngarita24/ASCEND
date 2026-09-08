-- CreateTable
CREATE TABLE "user_follow" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follow_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateIndex
CREATE INDEX "user_follow_following_id_idx" ON "user_follow"("following_id");

-- AddForeignKey
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
