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
- `MusicGenerationJob`: music API generation job linked to a content plan.
- `VideoGenerationJob`: video API generation job linked to a content plan and source music asset.
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

Music API generated audio assets are also stored as:

- `asset_type = audio`
- `provider = mock_music_api` or a future official API provider key
- `asset_url = generatedAudioUrl`
- `metadata.workflow = music_api_generation`

Video assets are stored as:

- `asset_type = video`
- `provider = heygen_manual`, `akool_manual`, or `did_manual`

Video API generated assets are also stored as:

- `asset_type = video`
- `provider = mock_video_api` or a future official API provider key
- `asset_url = generatedVideoUrl`
- `metadata.workflow = video_api_generation`
- `metadata.sourceMusicAssetId = source music asset ID`

Both store file metadata in `PublishAsset.metadata`, including `fileAssetId`, original filename, MIME type, size, checksum, storage key, and workflow.

## Music API Jobs

`MusicGenerationJob.status`:

- `queued`
- `processing`
- `completed`
- `failed`

Music API jobs store:

- provider key
- provider config without credentials
- request payload
- generated audio URL
- error message
- retry source job ID

Only failed jobs are retryable. A retry creates a new `MusicGenerationJob` with `retryOfJobId` pointing to the failed job.

## Video API Jobs

`VideoGenerationJob.status`:

- `queued`
- `processing`
- `completed`
- `failed`

Video API jobs store:

- provider key
- provider config without credentials
- request payload
- generated video URL
- error message
- source music asset ID
- retry source job ID

Only failed jobs are retryable. A retry creates a new `VideoGenerationJob` with `retryOfJobId` pointing to the failed job.

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
