CREATE TYPE "SmartAIPurpose" AS ENUM ('singer_concept', 'song_idea', 'lyrics', 'music_prompt', 'video_brief', 'publish_copy', 'next_content');
CREATE TYPE "SmartAIStatus" AS ENUM ('started', 'completed', 'failed');

CREATE TABLE "smart_singer_profiles" (
  "id" UUID NOT NULL,
  "digital_human_id" UUID NOT NULL,
  "positioning" TEXT NOT NULL,
  "persona_summary" TEXT NOT NULL,
  "music_style" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "content_direction" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "smart_singer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "smart_ai_generations" (
  "id" UUID NOT NULL,
  "purpose" "SmartAIPurpose" NOT NULL,
  "status" "SmartAIStatus" NOT NULL DEFAULT 'started',
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "digital_human_id" UUID,
  "content_plan_id" UUID,
  "input_summary" TEXT NOT NULL,
  "output" JSONB,
  "error_message" TEXT,
  "prompt_tokens" INTEGER,
  "completion_tokens" INTEGER,
  "total_tokens" INTEGER,
  "estimated_cost_usd" DECIMAL(10,6),
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "smart_ai_generations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "smart_singer_profiles_digital_human_id_key" ON "smart_singer_profiles"("digital_human_id");
CREATE INDEX "smart_ai_generations_digital_human_id_idx" ON "smart_ai_generations"("digital_human_id");
CREATE INDEX "smart_ai_generations_content_plan_id_idx" ON "smart_ai_generations"("content_plan_id");
CREATE INDEX "smart_ai_generations_purpose_idx" ON "smart_ai_generations"("purpose");
CREATE INDEX "smart_ai_generations_status_idx" ON "smart_ai_generations"("status");
CREATE INDEX "smart_ai_generations_created_at_idx" ON "smart_ai_generations"("created_at");

ALTER TABLE "smart_singer_profiles" ADD CONSTRAINT "smart_singer_profiles_digital_human_id_fkey" FOREIGN KEY ("digital_human_id") REFERENCES "digital_humans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "smart_ai_generations" ADD CONSTRAINT "smart_ai_generations_digital_human_id_fkey" FOREIGN KEY ("digital_human_id") REFERENCES "digital_humans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "smart_ai_generations" ADD CONSTRAINT "smart_ai_generations_content_plan_id_fkey" FOREIGN KEY ("content_plan_id") REFERENCES "content_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
