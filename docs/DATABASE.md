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
- `PlatformPost`: planned platform publishing record.
- `WorkflowRun`: current workflow state for a content plan.
- `WorkflowStep`: per-step timing, duration, error, and retry metadata.
- `WorkflowEvent`: audit event log for workflow debugging.

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

## Workflow Engine

`WorkflowRun.currentState` uses:

- `draft`
- `planning`
- `music_pending`
- `music_ready`
- `video_pending`
- `video_ready`
- `publish_ready`
- `scheduled`
- `published`
- `failed`

`WorkflowStep.stepKey` uses:

- `planning`
- `music`
- `video`
- `publish`

Each step records:

- started time
- finished time
- duration in milliseconds
- error message
- retry count

`WorkflowEvent` records event type, actor, timestamp, and JSON payload for later debugging.
