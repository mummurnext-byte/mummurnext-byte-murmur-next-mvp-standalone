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

## Environment Variables

Copy `.env.example` to `.env` for local development. Do not commit `.env`.

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/mummur_next_mvp?schema=public` | PostgreSQL connection string used by Prisma. |
| `OPENAI_API_KEY` | No | empty | Optional. Leave empty to use mock generation. |
| `APP_BASE_URL` | Yes | `http://localhost:3000` | Public base URL for the app. |
| `STORAGE_PROVIDER` | Yes | `local` | Current MVP supports `local`; `s3`, `r2`, and `vercel_blob` are reserved. |
| `NODE_ENV` | Yes | `development` | Use `production` on Vercel. |
| `MAX_UPLOAD_BYTES` | No | `104857600` | Upload size limit in bytes. |
| `LOCAL_FILE_STORAGE_DIR` | No | `./uploads` | Local development upload directory. Not durable on Vercel. |

## Vercel Deployment

Mummur Next MVP is a standard Next.js app and can be deployed to Vercel after a
production PostgreSQL database is available.

1. Create a production PostgreSQL database, such as Neon, Supabase, RDS, or
   another managed Postgres service.
2. Add environment variables in Vercel:
   - `DATABASE_URL`
   - `OPENAI_API_KEY` (optional; leave empty to use mock generation)
   - `STORAGE_PROVIDER` (`local` for this MVP, object storage for production uploads later)
   - `APP_BASE_URL`
   - `NODE_ENV`
   - `MAX_UPLOAD_BYTES`
3. Run production migrations before serving traffic:

```bash
npx prisma migrate deploy
```

4. Deploy from GitHub or with Vercel CLI.

The app runs `prisma generate` during `postinstall`, and `npm run build` also
runs `prisma generate && next build` so Prisma Client is available in Vercel
builds.

### File Uploads on Vercel

This MVP includes `LocalStorageProvider` for local development. Local filesystem
uploads are not durable in serverless deployments and can disappear between
deployments or function instances. Before using production uploads on Vercel,
replace local storage with an object storage implementation.

Reserved provider keys:

- `s3`
- `r2`
- `vercel_blob`

The storage abstraction is in `src/lib/storage-provider.ts`. The current upload
limit is controlled by `MAX_UPLOAD_BYTES`; default is `104857600` bytes.

### Deployment Checklist Page

After deployment, open:

```text
/admin/deployment-checklist
```

It checks database connectivity, storage provider configuration, LLM fallback,
build version, app base URL, and environment mode without displaying secrets.

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

## Future Integrations

Provider abstractions live under `src/services`:

- `MusicProvider`
- `VideoProvider`

Future official API integrations should add new provider implementations without changing the Content Plan ownership model.
