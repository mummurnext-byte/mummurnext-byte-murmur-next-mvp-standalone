ALTER TABLE "personas"
  ADD COLUMN "input_language" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN "output_language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "target_market" TEXT NOT NULL DEFAULT 'global';

ALTER TABLE "song_ideas"
  ADD COLUMN "input_language" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN "output_language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "target_market" TEXT NOT NULL DEFAULT 'global';

ALTER TABLE "content_plans"
  ADD COLUMN "input_language" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN "output_language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "target_market" TEXT NOT NULL DEFAULT 'global';

ALTER TABLE "smart_ai_generations"
  ADD COLUMN "input_language" TEXT NOT NULL DEFAULT 'auto',
  ADD COLUMN "output_language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "target_market" TEXT NOT NULL DEFAULT 'global';
