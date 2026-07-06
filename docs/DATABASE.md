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
- `PlatformPost`: manual platform publishing record.
- `PlatformPostHistory`: status history for platform publishing.

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

`PlatformPost.status`:

- `draft`
- `ready`
- `scheduled`
- `published`
- `failed`

Platform posts store manual publishing data:

- platform: `tiktok`, `youtube_shorts`, or `youtube`
- publish title
- publish description
- hashtags
- scheduled publish time
- published URL
- failure message

Every publish status save creates a `PlatformPostHistory` entry. Marking a post as published also advances the parent `ContentPlan.status` to `published`.
