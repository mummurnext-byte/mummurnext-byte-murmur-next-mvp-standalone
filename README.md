# Mummur Next MVP

Standalone AI digital-human music content system.

This repository is intentionally separate from Mummur Back Office. It contains only the Mummur Next MVP workflow:

- Manage Digital Humans, Persona settings, and Consent Records.
- Generate mock 7-day Content Plans.
- Prepare manual Suno / MakeBestMusic music prompts.
- Upload generated music assets: `mp3`, `wav`, `m4a`.
- Prepare manual HeyGen / Akool / D-ID video prompts after music exists.
- Upload generated video assets: `mp4`, `mov`, `webm`.
- Play uploaded audio and video inside the local app.
- Track Content Plan workflow state from planning through publishing.

No real AI, music, video, TikTok, or YouTube APIs are called in this MVP.

## Requirements

- Node.js 22+
- npm
- PostgreSQL 16+

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
copy .env.example .env
```

3. Start PostgreSQL and create a database matching `DATABASE_URL`.

Example with Docker:

```bash
docker run --name mummur-next-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mummur_next_mvp -p 5432:5432 -d postgres:16
```

4. Generate Prisma Client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Developer Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Manual Music Workflow

1. Create a Digital Human with Persona and Consent.
2. Generate a 7-day Content Plan.
3. Open a Content Plan.
4. Choose Suno or MakeBestMusic.
5. Copy:
   - song title
   - song prompt
   - lyrics
   - style prompt
   - genre
   - mood
   - duration
6. Paste into the provider manually.
7. Download the generated `mp3`, `wav`, or `m4a`.
8. Upload the audio file back to Mummur Next MVP.

This workflow does not use unofficial APIs, browser automation, cookies, tokens, or saved provider accounts.

## Manual Video Workflow

1. Upload a music asset to a Content Plan.
2. Choose HeyGen, Akool, or D-ID.
3. Copy:
   - video title
   - avatar instructions
   - camera style
   - lip sync notes
   - scene prompt
   - subtitle text
   - cover title
   - TikTok caption
   - YouTube Shorts title
   - YouTube Shorts description
4. Paste into the provider manually.
5. Download the generated `mp4`, `mov`, or `webm`.
6. Upload the video file back to Mummur Next MVP.

This workflow does not call video provider APIs, automate login, or store cookies/tokens.

## Workflow Engine

Workflow Engine tracks the production pipeline for each Content Plan:

```text
Digital Human -> Weekly Plan -> Music -> Video -> Publish
```

Supported workflow states:

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

The Workflow Dashboard shows waiting, running, failed, and completed workflows. Each Content Plan has a Timeline with step timestamps, retry count, error messages, and an event log.

Workflow Engine does not call real external APIs. It coordinates existing mock/manual steps only.

## Future Integrations

Provider abstractions live under `src/services`:

- `MusicProvider`
- `VideoProvider`
- `WorkflowService`

Future official API integrations should add new provider implementations without changing the Content Plan ownership model.
