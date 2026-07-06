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
- `Persona`: role, backstory, tone, audience, music style, visual style, and default language/market preferences.
- `ConsentRecord`: real-person authorization record.
- `SongIdea`: generated song concept with the language/market context used when it was created.
- `ContentPlan`: scheduled content item, production status, and per-plan language/market overrides.
- `FileAsset`: uploaded file metadata.
- `PublishAsset`: uploaded audio/video metadata linked to a content plan.
- `PlatformPost`: planned platform publishing record.
- `SmartSingerProfile`: structured AI singer positioning for a digital human.
- `SmartAIGeneration`: Smart AI Singer call log with purpose, language/market context, status, output, usage, cost estimate, and errors.

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
- input language
- output language
- target market
- digital human or content plan link
- structured output
- error message
- prompt / completion / total tokens
- estimated cost

## Global Language Fields

The global language system stores string keys instead of database enums so new
languages and markets can be added without an enum migration.

Default supported keys:

- `input_language`: `auto`, `en`, `zh-CN`, `th`
- `output_language`: `en`, `zh-CN`, `th`
- `target_market`: `global`, `us`, `china`, `thailand`, `japan`, `korea`, `spain`, `france`, `germany`

Fields exist on:

- `personas`: default preferences for a Digital Human.
- `song_ideas`: language/market context used for the idea.
- `content_plans`: plan-level override used by Smart AI Singer.
- `smart_ai_generations`: audit log of the exact settings used for each LLM request.
