-- CreateTable
CREATE TABLE "routine_template" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "level" VARCHAR(50) NOT NULL,
    "goal" VARCHAR(50) NOT NULL,
    "equipment" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_template_exercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "exercise_name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL,
    "target_sets" SMALLINT,
    "target_repetitions_min" SMALLINT,
    "target_repetitions_max" SMALLINT,
    "rest_seconds" INTEGER,

    CONSTRAINT "routine_template_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "routine_template_slug_key" ON "routine_template"("slug");

-- CreateIndex
CREATE INDEX "routine_template_level_idx" ON "routine_template"("level");

-- CreateIndex
CREATE INDEX "routine_template_goal_idx" ON "routine_template"("goal");

-- CreateIndex
CREATE INDEX "routine_template_equipment_idx" ON "routine_template"("equipment");

-- CreateIndex
CREATE INDEX "routine_template_exercise_template_id_idx" ON "routine_template_exercise"("template_id");

-- CreateIndex
CREATE INDEX "routine_template_exercise_exercise_id_idx" ON "routine_template_exercise"("exercise_id");

-- AddForeignKey
ALTER TABLE "routine_template_exercise" ADD CONSTRAINT "routine_template_exercise_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "routine_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_template_exercise" ADD CONSTRAINT "routine_template_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
