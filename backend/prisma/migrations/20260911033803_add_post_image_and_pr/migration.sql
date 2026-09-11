-- AlterTable
ALTER TABLE "post" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "pr_achieved" BOOLEAN NOT NULL DEFAULT false;
