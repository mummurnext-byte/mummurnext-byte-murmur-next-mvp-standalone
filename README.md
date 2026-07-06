# Mummur Next MVP

Standalone AI digital-human music content system.

This repository is intentionally separate from Mummur Back Office. It contains only the Mummur Next MVP workflow:

- Manage Digital Humans, Persona settings, and Consent Records.
- Generate 7-day Content Plans with Mock or OpenAI LLM providers.
- Prepare manual Suno / MakeBestMusic music prompts.
- Generate mock music API jobs for future official Music API integration.
- Upload generated music assets: `mp3`, `wav`, `m4a`.
- Prepare manual HeyGen / Akool / D-ID video prompts after music exists.
- Upload generated video assets: `mp4`, `mov`, `webm`.
- Play uploaded audio and video inside the local app.
- Prepare manual publishing records for TikTok, YouTube Shorts, and YouTube.

Video, TikTok, and YouTube APIs are not called in this MVP. Weekly planning can use OpenAI only when `OPENAI_API_KEY` is configured; otherwise it automatically uses the Mock provider. Music API generation is currently mock-only and does not call unofficial APIs.

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

Optional OpenAI configuration:

```env
OPENAI_API_KEY=""
```

Leave `OPENAI_API_KEY` empty for local Mock generation. When it is set, choose `OpenAI` in the weekly plan form to generate copy through OpenAI. The app does not log the API key.

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
2. Generate a 7-day Content Plan with Mock or OpenAI.
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

## Music API Workflow

1. Open a Content Plan.
2. Use the Music API Provider panel.
3. Choose `Mock Music API`.
4. Generate a music API job.
5. Review job status:
   - `queued`
   - `processing`
   - `completed`
   - `failed`
6. Completed jobs store `generatedAudioUrl` and create an audio `PublishAsset`.
7. Failed jobs can be retried with the Retry button.

Only official API providers or mock API providers should be added here. Do not use unofficial Suno/MakeBestMusic APIs, browser automation, cookies, or account tokens.

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

## Manual Publish Workflow

1. Upload a video asset to a Content Plan.
2. Open the Content Plan.
3. Choose a platform:
   - TikTok
   - YouTube Shorts
   - YouTube
4. Enter publish title, description, hashtags, optional scheduled time, and optional failure note.
5. Save the platform post as `draft`, `ready`, `scheduled`, or `failed`.
6. After manually publishing on the platform, paste the published URL and mark the post as `published`.
7. Review publish history entries on the Content Plan.

This workflow does not call TikTok or YouTube APIs, automate posting, or store platform accounts.

## Future Integrations

Provider abstractions live under `src/services`:

- `LLMProvider`
- `MusicProvider`
- `MusicApiProvider`
- `VideoProvider`

Future official API integrations should add new provider implementations without changing the Content Plan ownership model.
