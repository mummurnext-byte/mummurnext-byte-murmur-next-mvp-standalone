CREATE TABLE "creative_evidence" (
  "id" UUID NOT NULL,
  "content_plan_id" UUID NOT NULL,
  "idea" TEXT,
  "song_outline" TEXT,
  "story" TEXT,
  "mood" TEXT,
  "character" TEXT,
  "prompt" TEXT,
  "gemini_revision_log" TEXT,
  "final_lyrics" TEXT,
  "suno_prompt" TEXT,
  "publish_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "creative_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creative_evidence_content_plan_id_key" ON "creative_evidence"("content_plan_id");
CREATE INDEX "creative_evidence_publish_at_idx" ON "creative_evidence"("publish_at");

ALTER TABLE "creative_evidence"
  ADD CONSTRAINT "creative_evidence_content_plan_id_fkey"
  FOREIGN KEY ("content_plan_id") REFERENCES "content_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
