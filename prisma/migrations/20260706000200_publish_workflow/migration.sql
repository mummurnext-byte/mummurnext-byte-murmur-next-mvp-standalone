ALTER TYPE "PublishStatus" ADD VALUE IF NOT EXISTS 'ready' AFTER 'draft';

ALTER TABLE "platform_posts"
  ADD COLUMN "publish_title" TEXT,
  ADD COLUMN "publish_description" TEXT,
  ADD COLUMN "hashtags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "scheduled_at" TIMESTAMPTZ(6),
  ADD COLUMN "published_url" TEXT;

CREATE UNIQUE INDEX "platform_posts_content_plan_id_platform_key"
  ON "platform_posts"("content_plan_id", "platform");

CREATE TABLE "platform_post_histories" (
  "id" UUID NOT NULL,
  "platform_post_id" UUID NOT NULL,
  "status" "PublishStatus" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_post_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_post_histories_platform_post_id_idx"
  ON "platform_post_histories"("platform_post_id");

CREATE INDEX "platform_post_histories_status_idx"
  ON "platform_post_histories"("status");

ALTER TABLE "platform_post_histories"
  ADD CONSTRAINT "platform_post_histories_platform_post_id_fkey"
  FOREIGN KEY ("platform_post_id") REFERENCES "platform_posts"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
