-- AlterTable users
ALTER TABLE "users" ADD COLUMN "full_name" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;

-- CreateTable routine_folder
CREATE TABLE "routine_folder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_folder_pkey" PRIMARY KEY ("id")
);

-- AlterTable routine
ALTER TABLE "routine" ADD COLUMN "folder_id" UUID;

-- CreateTable body_measurement
CREATE TABLE "body_measurement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weight" DECIMAL(5,2),
    "neck" DECIMAL(5,2),
    "shoulders" DECIMAL(5,2),
    "chest" DECIMAL(5,2),
    "waist" DECIMAL(5,2),
    "hips" DECIMAL(5,2),
    "bicep" DECIMAL(5,2),
    "thigh" DECIMAL(5,2),
    "calf" DECIMAL(5,2),
    "body_fat" DECIMAL(4,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_measurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routine_folder_user_id_idx" ON "routine_folder"("user_id");

-- CreateIndex
CREATE INDEX "routine_folder_id_idx" ON "routine"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "body_measurement_user_id_date_key" ON "body_measurement"("user_id", "date");

-- CreateIndex
CREATE INDEX "body_measurement_user_id_date_idx" ON "body_measurement"("user_id", "date");

-- AddForeignKey
ALTER TABLE "routine_folder" ADD CONSTRAINT "routine_folder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine" ADD CONSTRAINT "routine_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "routine_folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurement" ADD CONSTRAINT "body_measurement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
