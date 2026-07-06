CREATE TABLE "platform_metrics" (
  "id" UUID NOT NULL,
  "publish_record_id" UUID NOT NULL,
  "platform" "TargetPlatform" NOT NULL,
  "date" DATE NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "comments" INTEGER NOT NULL DEFAULT 0,
  "shares" INTEGER NOT NULL DEFAULT 0,
  "watch_time_seconds" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "platform_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_metrics_publish_record_id_date_key" ON "platform_metrics"("publish_record_id", "date");
CREATE INDEX "platform_metrics_publish_record_id_idx" ON "platform_metrics"("publish_record_id");
CREATE INDEX "platform_metrics_platform_idx" ON "platform_metrics"("platform");
CREATE INDEX "platform_metrics_date_idx" ON "platform_metrics"("date");

ALTER TABLE "platform_metrics"
  ADD CONSTRAINT "platform_metrics_publish_record_id_fkey"
  FOREIGN KEY ("publish_record_id") REFERENCES "platform_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
