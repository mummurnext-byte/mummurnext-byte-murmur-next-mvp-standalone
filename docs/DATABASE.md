# Database Schema

The database is PostgreSQL through Prisma.

## Production Migration

Use Prisma migrations for production databases:

```bash
npx prisma migrate deploy
```

Vercel builds generate Prisma Client through `postinstall`. Do not run
`prisma migrate dev` against production.

## Core Models

- `DigitalHuman`: digital-human profile.
- `Persona`: role, backstory, tone, audience, music style, visual style.
- `ConsentRecord`: real-person authorization record.
- `SongIdea`: generated song concept.
- `ContentPlan`: scheduled content item and production status.
- `FileAsset`: uploaded file metadata.
- `PublishAsset`: uploaded audio/video metadata linked to a content plan.
- `PlatformPost`: planned platform publishing record.
- `SmartSingerProfile`: structured AI singer positioning for a digital human.
- `SmartAIGeneration`: Smart AI Singer call log with purpose, status, output, usage, cost estimate, and errors.

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

## Smart AI Singer Records

`SmartAIGeneration` stores one row per Smart AI Singer request. Rows are created
before provider execution with `status = started`, then updated to `completed`
or `failed`.

Tracked fields include:

- purpose
- provider
- model
- digital human or content plan link
- structured output
- error message
- prompt / completion / total tokens
- estimated cost
