ALTER TABLE "digital_human_image_generations"
ADD COLUMN "source_original_name" TEXT,
ADD COLUMN "source_mime_type" TEXT,
ADD COLUMN "source_byte_size" INTEGER,
ADD COLUMN "source_checksum_sha256" TEXT;

UPDATE "digital_human_image_generations" AS "generation"
SET
  "source_original_name" = "asset"."original_name",
  "source_mime_type" = "asset"."mime_type",
  "source_byte_size" = "asset"."byte_size",
  "source_checksum_sha256" = "asset"."checksum_sha256"
FROM "file_assets" AS "asset"
WHERE "asset"."id" = "generation"."source_file_asset_id";

ALTER TABLE "digital_human_image_generations"
ALTER COLUMN "source_original_name" SET NOT NULL,
ALTER COLUMN "source_mime_type" SET NOT NULL,
ALTER COLUMN "source_byte_size" SET NOT NULL,
ALTER COLUMN "source_checksum_sha256" SET NOT NULL;

ALTER TABLE "digital_human_image_generations"
DROP CONSTRAINT "digital_human_image_generations_source_file_asset_id_fkey";

ALTER TABLE "digital_human_image_generations"
DROP COLUMN "source_file_asset_id";
