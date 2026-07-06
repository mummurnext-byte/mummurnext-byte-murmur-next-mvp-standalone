CREATE TYPE "ContentStatus" AS ENUM ('idea', 'lyrics', 'music_generated', 'video_ready', 'published');
CREATE TYPE "TargetPlatform" AS ENUM ('tiktok', 'youtube_shorts', 'youtube');
CREATE TYPE "AssetType" AS ENUM ('audio', 'video', 'thumbnail', 'caption_package');
CREATE TYPE "PublishStatus" AS ENUM ('draft', 'scheduled', 'published', 'failed');

CREATE TABLE "digital_humans" (
  "id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "legal_name" TEXT,
  "avatar_url" TEXT,
  "voice_sample_url" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "digital_humans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "personas" (
  "id" UUID NOT NULL,
  "digital_human_id" UUID NOT NULL,
  "archetype" TEXT NOT NULL,
  "backstory" TEXT NOT NULL,
  "tone_of_voice" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "music_style" TEXT NOT NULL,
  "visual_style" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consent_records" (
  "id" UUID NOT NULL,
  "digital_human_id" UUID NOT NULL,
  "consented_name" TEXT NOT NULL,
  "document_url" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "signed_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "song_ideas" (
  "id" UUID NOT NULL,
  "digital_human_id" UUID NOT NULL,
  "theme" TEXT NOT NULL,
  "lyrics_direction" TEXT NOT NULL,
  "video_script" TEXT NOT NULL,
  "music_prompt" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "song_ideas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_plans" (
  "id" UUID NOT NULL,
  "digital_human_id" UUID NOT NULL,
  "song_idea_id" UUID NOT NULL,
  "scheduled_date" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "hashtags" TEXT[],
  "target_platform" "TargetPlatform" NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'idea',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "content_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "file_assets" (
  "id" UUID NOT NULL,
  "original_name" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "checksum_sha256" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publish_assets" (
  "id" UUID NOT NULL,
  "content_plan_id" UUID NOT NULL,
  "asset_type" "AssetType" NOT NULL,
  "asset_url" TEXT NOT NULL,
  "provider" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "publish_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_posts" (
  "id" UUID NOT NULL,
  "content_plan_id" UUID NOT NULL,
  "platform" "TargetPlatform" NOT NULL,
  "status" "PublishStatus" NOT NULL DEFAULT 'draft',
  "platform_post_id" TEXT,
  "post_url" TEXT,
  "published_at" TIMESTAMPTZ(6),
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "platform_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "personas_digital_human_id_key" ON "personas"("digital_human_id");
CREATE UNIQUE INDEX "file_assets_storage_key_key" ON "file_assets"("storage_key");
CREATE INDEX "consent_records_digital_human_id_idx" ON "consent_records"("digital_human_id");
CREATE INDEX "song_ideas_digital_human_id_idx" ON "song_ideas"("digital_human_id");
CREATE INDEX "content_plans_digital_human_id_idx" ON "content_plans"("digital_human_id");
CREATE INDEX "content_plans_song_idea_id_idx" ON "content_plans"("song_idea_id");
CREATE INDEX "content_plans_scheduled_date_idx" ON "content_plans"("scheduled_date");
CREATE INDEX "content_plans_status_idx" ON "content_plans"("status");
CREATE INDEX "file_assets_entity_type_entity_id_idx" ON "file_assets"("entity_type", "entity_id");
CREATE INDEX "publish_assets_content_plan_id_idx" ON "publish_assets"("content_plan_id");
CREATE INDEX "publish_assets_asset_type_idx" ON "publish_assets"("asset_type");
CREATE INDEX "platform_posts_content_plan_id_idx" ON "platform_posts"("content_plan_id");
CREATE INDEX "platform_posts_platform_idx" ON "platform_posts"("platform");
CREATE INDEX "platform_posts_status_idx" ON "platform_posts"("status");

ALTER TABLE "personas" ADD CONSTRAINT "personas_digital_human_id_fkey" FOREIGN KEY ("digital_human_id") REFERENCES "digital_humans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_digital_human_id_fkey" FOREIGN KEY ("digital_human_id") REFERENCES "digital_humans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "song_ideas" ADD CONSTRAINT "song_ideas_digital_human_id_fkey" FOREIGN KEY ("digital_human_id") REFERENCES "digital_humans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_digital_human_id_fkey" FOREIGN KEY ("digital_human_id") REFERENCES "digital_humans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_song_idea_id_fkey" FOREIGN KEY ("song_idea_id") REFERENCES "song_ideas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publish_assets" ADD CONSTRAINT "publish_assets_content_plan_id_fkey" FOREIGN KEY ("content_plan_id") REFERENCES "content_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_posts" ADD CONSTRAINT "platform_posts_content_plan_id_fkey" FOREIGN KEY ("content_plan_id") REFERENCES "content_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
