# Database Schema

The database is PostgreSQL through Prisma.

## Core Models

- `DigitalHuman`: digital-human profile.
- `Persona`: role, backstory, tone, audience, music style, visual style.
- `ConsentRecord`: real-person authorization record.
- `SongIdea`: generated song concept.
- `ContentPlan`: scheduled content item and production status.
- `FileAsset`: uploaded file metadata.
- `PublishAsset`: uploaded audio/video metadata linked to a content plan.
- `PublishRecord`: manual platform publishing record.
- `PublishRecordHistory`: status history for platform publishing.
- `PlatformMetric`: manual daily performance metrics for a publish record.

## Status Flow

`ContentPlan.status`:

- `idea`
- `lyrics`
- `music_generated`
- `video_ready`
- `published`

Uploading music advances `idea` or `lyrics` to `music_generated`.

Uploading video advances `idea`, `lyrics`, or `music_generated` to `video_ready`.

## Asset Metadata

Music assets are stored as:

- `asset_type = audio`
- `provider = suno_manual` or `makebestmusic_manual`

Video assets are stored as:

- `asset_type = video`
- `provider = heygen_manual`, `akool_manual`, or `did_manual`

Both store file metadata in `PublishAsset.metadata`, including `fileAssetId`, original filename, MIME type, size, checksum, storage key, and workflow.

## Publish Workflow

`PublishRecord.status`:

- `draft`
- `ready`
- `scheduled`
- `published`
- `failed`

Publish records store manual publishing data:

- platform: `tiktok`, `youtube_shorts`, or `youtube`
- title
- description
- hashtags
- scheduled publish time
- published URL
- failure reason

Every publish status save creates a `PublishRecordHistory` entry. Marking a record as published also advances the parent `ContentPlan.status` to `published`.

## Analytics

`PlatformMetric` stores one manual metric row per Publish Record and date.

Fields:

- publish record
- platform
- date
- views
- likes
- comments
- shares
- watch time seconds
- revenue
- currency

The unique key is `publishRecordId + date`, so saving the same date again updates the daily metrics instead of creating a duplicate row.
