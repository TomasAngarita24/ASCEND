CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_muscle_groups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "equipment" VARCHAR(255),
    "instructions" TEXT,
    "media_url" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "routine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "routine_exercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "routine_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "target_sets" SMALLINT,
    "target_repetitions_min" SMALLINT,
    "target_repetitions_max" SMALLINT,
    "target_weight" DECIMAL(8,2),
    "rest_seconds" INTEGER,
    "notes" TEXT,

    CONSTRAINT "routine_exercise_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "routine_exercise_values_check" CHECK (
        ("target_sets" IS NULL OR "target_sets" >= 0)
        AND ("target_repetitions_min" IS NULL OR "target_repetitions_min" >= 0)
        AND ("target_repetitions_max" IS NULL OR "target_repetitions_max" >= 0)
        AND ("target_repetitions_min" IS NULL OR "target_repetitions_max" IS NULL OR "target_repetitions_min" <= "target_repetitions_max")
        AND ("target_weight" IS NULL OR "target_weight" >= 0)
        AND ("rest_seconds" IS NULL OR "rest_seconds" >= 0)
    )
);

CREATE TABLE "workout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "routine_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workout_status_check" CHECK ("status" IN ('active', 'paused', 'completed', 'cancelled')),
    CONSTRAINT "workout_completed_at_check" CHECK ("completed_at" IS NULL OR "completed_at" >= "started_at")
);

CREATE TABLE "workout_exercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workout_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_exercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "set" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workout_exercise_id" UUID NOT NULL,
    "set_number" SMALLINT NOT NULL,
    "weight" DECIMAL(8,2),
    "repetitions" SMALLINT,
    "rpe" DECIMAL(3,1),
    "set_type" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "set_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "set_values_check" CHECK (
        "set_number" > 0
        AND ("weight" IS NULL OR "weight" >= 0)
        AND ("repetitions" IS NULL OR "repetitions" >= 0)
        AND "set_type" IN ('normal', 'warm_up', 'drop_set', 'failure')
    )
);

CREATE TABLE "session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "exercise_name_lower_idx" ON "exercise"(LOWER("name"));
CREATE INDEX "exercise_equipment_idx" ON "exercise"("equipment");
CREATE INDEX "exercise_target_muscle_groups_gin_idx" ON "exercise" USING GIN ("target_muscle_groups");
CREATE INDEX "exercise_created_by_user_id_idx" ON "exercise"("created_by_user_id");
CREATE INDEX "routine_user_id_idx" ON "routine"("user_id");
CREATE UNIQUE INDEX "routine_exercise_routine_id_position_key" ON "routine_exercise"("routine_id", "position");
CREATE INDEX "routine_exercise_exercise_id_idx" ON "routine_exercise"("exercise_id");
CREATE INDEX "workout_user_id_started_at_idx" ON "workout"("user_id", "started_at" DESC);
CREATE INDEX "workout_user_id_status_idx" ON "workout"("user_id", "status");
CREATE INDEX "workout_routine_id_idx" ON "workout"("routine_id");
CREATE UNIQUE INDEX "workout_exercise_workout_id_position_key" ON "workout_exercise"("workout_id", "position");
CREATE INDEX "workout_exercise_exercise_id_idx" ON "workout_exercise"("exercise_id");
CREATE UNIQUE INDEX "set_workout_exercise_id_set_number_key" ON "set"("workout_exercise_id", "set_number");
CREATE UNIQUE INDEX "session_refresh_token_hash_key" ON "session"("refresh_token_hash");
CREATE INDEX "session_user_id_idx" ON "session"("user_id");
CREATE INDEX "session_expires_at_idx" ON "session"("expires_at");

ALTER TABLE "exercise" ADD CONSTRAINT "exercise_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine" ADD CONSTRAINT "routine_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_exercise" ADD CONSTRAINT "routine_exercise_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_exercise" ADD CONSTRAINT "routine_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout" ADD CONSTRAINT "workout_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout" ADD CONSTRAINT "workout_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "set" ADD CONSTRAINT "set_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER exercise_set_updated_at BEFORE UPDATE ON "exercise" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER routine_set_updated_at BEFORE UPDATE ON "routine" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER workout_set_updated_at BEFORE UPDATE ON "workout" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER workout_exercise_set_updated_at BEFORE UPDATE ON "workout_exercise" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_set_updated_at BEFORE UPDATE ON "set" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER session_set_updated_at BEFORE UPDATE ON "session" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
