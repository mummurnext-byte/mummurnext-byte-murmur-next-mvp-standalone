CREATE TYPE "DigitalHumanImageStatus" AS ENUM ('processing', 'completed', 'failed');

CREATE TABLE "digital_human_image_generations" (
    "id" UUID NOT NULL,
    "digital_human_id" UUID NOT NULL,
    "consent_record_id" UUID NOT NULL,
    "source_file_asset_id" UUID NOT NULL,
    "output_file_asset_id" UUID,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "style" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "DigitalHumanImageStatus" NOT NULL DEFAULT 'processing',
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "digital_human_image_generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "digital_human_image_generations_digital_human_id_created_at_idx"
ON "digital_human_image_generations"("digital_human_id", "created_at");

CREATE INDEX "digital_human_image_generations_status_idx"
ON "digital_human_image_generations"("status");

ALTER TABLE "digital_human_image_generations"
ADD CONSTRAINT "digital_human_image_generations_digital_human_id_fkey"
FOREIGN KEY ("digital_human_id") REFERENCES "digital_humans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_human_image_generations"
ADD CONSTRAINT "digital_human_image_generations_consent_record_id_fkey"
FOREIGN KEY ("consent_record_id") REFERENCES "consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_human_image_generations"
ADD CONSTRAINT "digital_human_image_generations_source_file_asset_id_fkey"
FOREIGN KEY ("source_file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_human_image_generations"
ADD CONSTRAINT "digital_human_image_generations_output_file_asset_id_fkey"
FOREIGN KEY ("output_file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
