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
- `DigitalHumanImageGeneration`: consent-linked portrait generation audit record with source metadata, output file, Provider, model, status, and errors.
- `SongIdea`: generated song concept with the language/market context used when it was created.
- `ContentPlan`: scheduled content item, production status, and per-plan language/market overrides.
- `CreativeEvidence`: one Content Plan creative audit trail from idea to final lyrics, Suno prompt, and publish time.
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

Digital-human image generations store:

- the Digital Human and Consent Record used for authorization
- source filename, MIME type, byte size, and SHA-256 checksum; source bytes are not retained
- completed output `FileAsset`
- Provider, model, style, and identity-preserving prompt
- processing/completed/failed status, timestamps, and error message

The successful output is written to `DigitalHuman.avatarUrl`. Foreign keys use `RESTRICT` so consent and output evidence cannot be removed while a generation record depends on them.

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

## Creative Evidence Records

`CreativeEvidence` is a one-to-one record linked by
`creative_evidence.content_plan_id`.

Tracked fields:

- `idea`
- `song_outline`
- `story`
- `mood`
- `character`
- `prompt`
- `gemini_revision_log`
- `final_lyrics`
- `suno_prompt`
- `publish_at`

The record is manually edited from the Content Plan detail page and is intended
for review, audit, and repeatability. It does not trigger external API calls.

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
