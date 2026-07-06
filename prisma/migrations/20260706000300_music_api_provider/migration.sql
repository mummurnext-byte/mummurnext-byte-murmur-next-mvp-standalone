CREATE TYPE "MusicApiJobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

CREATE TABLE "music_generation_jobs" (
  "id" UUID NOT NULL,
  "content_plan_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "MusicApiJobStatus" NOT NULL DEFAULT 'queued',
  "provider_config" JSONB,
  "request_payload" JSONB,
  "generated_audio_url" TEXT,
  "error_message" TEXT,
  "retry_of_job_id" UUID,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "music_generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "music_generation_jobs_content_plan_id_idx" ON "music_generation_jobs"("content_plan_id");
CREATE INDEX "music_generation_jobs_provider_idx" ON "music_generation_jobs"("provider");
CREATE INDEX "music_generation_jobs_status_idx" ON "music_generation_jobs"("status");
CREATE INDEX "music_generation_jobs_retry_of_job_id_idx" ON "music_generation_jobs"("retry_of_job_id");

ALTER TABLE "music_generation_jobs"
  ADD CONSTRAINT "music_generation_jobs_content_plan_id_fkey"
  FOREIGN KEY ("content_plan_id") REFERENCES "content_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
