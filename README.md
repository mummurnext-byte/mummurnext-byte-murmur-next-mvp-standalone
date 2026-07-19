# Mummur Next MVP

Standalone AI digital-human music content system.

This repository is intentionally separate from Mummur Back Office. It contains only the Mummur Next MVP workflow:

- Manage Digital Humans, Persona settings, and Consent Records.
- Create a digital-human avatar from an authorized JPG, PNG, or WebP portrait using Local Preview or the official Gemini/OpenAI image APIs.
- Generate mock 7-day Content Plans.
- Prepare manual Suno / MakeBestMusic music prompts.
- Upload generated music assets: `mp3`, `wav`, `m4a`.
- Prepare manual HeyGen / Akool / D-ID video prompts after music exists.
- Upload generated video assets: `mp4`, `mov`, `webm`.
- Play uploaded audio and video inside the local app.
- Optionally call a configured LLM provider for Smart AI Singer text generation.
- Choose UI language, content output language, input language detection, and target market independently.
- Track Creative Evidence for each Content Plan from idea through final lyrics, Suno prompt, and publish time.

Music, video, TikTok, and YouTube providers remain manual in this MVP. Smart AI
Singer falls back to mock generation when no LLM provider key is configured.

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
| `LLM_PROVIDER` | No | `mock` | Smart AI Singer provider: `mock`, `openai`, `gemini`, `groq`, or `openrouter`. |
| `LLM_MODEL` | No | `gemini-2.5-flash` | Model name for the selected LLM provider. Leave empty to use the provider default. |
| `OPENAI_API_KEY` | No | empty | Required only when `LLM_PROVIDER=openai`. |
| `DIGITAL_HUMAN_IMAGE_PROVIDER` | No | `mock` | Digital-human image provider: `mock`, `gemini`, or `openai`. Missing matching credentials fall back to Local Preview. When unset, an explicitly configured Gemini LLM and key are reused. |
| `DIGITAL_HUMAN_IMAGE_MODEL` | No | provider default | Optional image model override. Defaults to `gemini-3.1-flash-image` for Gemini and `gpt-image-2` for OpenAI. |
| `DIGITAL_HUMAN_IMAGE_DAILY_LIMIT` | No | `5` | Maximum image generation attempts per UTC day. Failed provider calls count toward the limit. |
| `GEMINI_API_KEY` | No | empty | Required only when `LLM_PROVIDER=gemini`. |
| `GROQ_API_KEY` | No | empty | Required only when `LLM_PROVIDER=groq`. |
| `OPENROUTER_API_KEY` | No | empty | Required only when `LLM_PROVIDER=openrouter`. |
| `SMART_AI_DAILY_LIMIT` | No | `20` | Maximum Smart AI Singer generations per day. |
| `APP_BASE_URL` | Yes | `http://localhost:3000` | Public base URL for the app. |
| `STORAGE_PROVIDER` | Yes | `local` | Use `local` for development or `vercel_blob` for Vercel media uploads. |
| `BLOB_READ_WRITE_TOKEN` | Required for `vercel_blob` | empty | Vercel Blob read/write token. Configure in Vercel, never commit a real value. |
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
   - `LLM_PROVIDER`
   - `LLM_MODEL`
   - the matching provider key: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY`
   - `DIGITAL_HUMAN_IMAGE_PROVIDER` (`mock`, `gemini`, or `openai`)
   - `DIGITAL_HUMAN_IMAGE_MODEL`
   - `DIGITAL_HUMAN_IMAGE_DAILY_LIMIT`
   - `SMART_AI_DAILY_LIMIT`
   - `STORAGE_PROVIDER` (`vercel_blob` for production uploads)
   - `BLOB_READ_WRITE_TOKEN` (required when `STORAGE_PROVIDER=vercel_blob`)
   - `APP_BASE_URL`
   - `NODE_ENV`
   - `MAX_UPLOAD_BYTES`
3. Run production migrations before serving traffic if you are deploying manually:

```bash
npx prisma migrate deploy
```

4. Deploy from GitHub or with Vercel CLI.

Vercel uses `vercel.json` to run `npx prisma migrate deploy` only for Production
deployments, then builds the app. Preview deployments do not compete for the
production database migration lock.
The app also runs `prisma generate` during `postinstall`, and `npm run build`
runs `prisma generate && next build` so Prisma Client is available in builds.

### File Uploads on Vercel

This MVP includes `LocalStorageProvider` for local development and
`VercelBlobStorageProvider` for durable Vercel media uploads. Local filesystem
uploads are not durable in serverless deployments and can disappear between
deployments or function instances.

Provider keys:

- `local`
- `vercel_blob`

Reserved future provider keys:

- `s3`
- `r2`

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

## Digital Human Image Workflow

1. Create or open a Digital Human.
2. Add an active Consent Record for the real person whose portrait will be used.
3. In **Create Digital Human Image**, upload a JPG, PNG, or WebP portrait up to 10 MB.
4. Select Studio, Music Artist, Cinematic, or Futuristic style.
5. Confirm the explicit portrait authorization checkbox and generate.
6. Review the generated avatar and generation history. A successful result becomes the Digital Human avatar automatically.

Provider behavior:

- `DIGITAL_HUMAN_IMAGE_PROVIDER=mock` creates a deterministic Local Preview and does not send the portrait to an external service.
- `DIGITAL_HUMAN_IMAGE_PROVIDER=gemini` with `GEMINI_API_KEY` uses the official Gemini Interactions image editing API. If this setting is omitted while `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` are configured, the image workflow reuses Gemini automatically.
- `DIGITAL_HUMAN_IMAGE_PROVIDER=openai` with `OPENAI_API_KEY` uses the official OpenAI Image editing API. The authorized portrait is sent to OpenAI only for that image request.
- Selecting `gemini` or `openai` without its matching API key safely falls back to Local Preview.

Source portrait bytes are not retained after the generation request. The audit record stores only the original filename, MIME type, byte size, and SHA-256 checksum. Only completed output images are stored and viewable. The image workflow does not send portraits to Smart AI Singer or any text LLM, and it never stores cookies or account credentials.

External image generation can take longer than local preview and may incur provider charges. `DIGITAL_HUMAN_IMAGE_DAILY_LIMIT` limits attempts per UTC day; the default is `5`. Gemini-generated images include Google's SynthID watermark.

Gemini image generation requires a billing-enabled Gemini API project. Gemini
image models do not have a free API tier; a free-tier key returns HTTP `429`
with a quota limit of `0`. Text generation can continue using Gemini's supported
free-tier text models independently.

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

## Smart AI Singer Workflow

Smart AI Singer is the digital singer brain for Mummur Next MVP. It uses the
Digital Human persona, content plan context, selected provider, target platform,
and recent content history to generate structured creative outputs.

It can generate:

- Smart Singer Profile
- song idea
- lyrics
- Suno / MakeBestMusic music prompt
- HeyGen / Akool / D-ID video brief
- TikTok / YouTube publishing copy
- next content suggestions

Smart AI Singer uses a single `LLMProvider` interface. Select the provider with
`LLM_PROVIDER`:

- `mock`: local deterministic output, no API calls.
- `openai`: OpenAI SDK using `OPENAI_API_KEY`.
- `gemini`: Google Gemini REST API using `GEMINI_API_KEY`.
- `groq`: Groq OpenAI-compatible API using `GROQ_API_KEY`.
- `openrouter`: OpenRouter OpenAI-compatible API using `OPENROUTER_API_KEY`.

Recommended low-cost local configuration:

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
SMART_AI_DAILY_LIMIT=20
```

If the selected provider key is missing, Smart AI Singer automatically falls
back to `MockLLMProvider`, so local development works without paid API calls.

All model outputs are validated against local schemas before being saved. Failed
generations are recorded with an error status instead of crashing the page.

Cost control:

- `SMART_AI_DAILY_LIMIT` limits daily generations.
- Each generation records purpose, provider, model, status, token usage when the
  SDK returns it, and estimated cost.
- Uploaded audio/video files are not sent to any LLM provider.
- API keys are read from environment variables and are never displayed in the
  deployment checklist or written to logs.

## Creative Evidence

Each Content Plan can store one Creative Evidence record. This is an audit trail
for the creative chain:

```text
Idea
↓
Song Outline
↓
Story
↓
Mood
↓
Character
↓
Prompt
↓
Gemini Revision Log
↓
Final Lyrics
↓
Suno Prompt
↓
Publish Time
```

Creative Evidence is edited on the Content Plan detail page. It does not call an
external API and does not send uploaded media to an LLM. The record is linked to
the Content Plan with a one-to-one `creative_evidence.content_plan_id` relation.

## Global Language System

Mummur Next MVP separates three concepts:

- UI Language: the back-office interface language. Supported values are English, 简体中文, and ไทย. The app chooses a default from the browser language, then stores the user's switcher choice in `localStorage` and the `mummur_ui_language` cookie.
- Content Output Language: the language Smart AI Singer must use for generated lyrics, titles, prompts, video briefs, and publish copy. Supported values are English, 简体中文, and ไทย.
- Target Market: localization strategy for audience taste, cultural tone, hooks, hashtags, and TikTok / YouTube copy. Supported values are Global, United States, China, Thailand, Japan, Korea, Spain, France, and Germany.

Input Language is only used to understand source material. It does not decide the final output language. Supported values are Auto Detect, English, 简体中文, and ไทย.

Examples:

- Chinese input -> Thai lyrics: set Input Language to `简体中文`, Content Output Language to `ไทย`, Target Market to `Thailand`.
- English input -> Chinese TikTok copy: set Input Language to `English`, Content Output Language to `简体中文`, Target Market to `China` or `Global`.
- Thai input -> English YouTube copy: set Input Language to `ไทย`, Content Output Language to `English`, Target Market to `United States` or `Global`.

Persona stores default language and market preferences. Content Plan can override those defaults. Each Smart AI Singer generation log stores the exact `inputLanguage`, `outputLanguage`, and `targetMarket` used for auditability.

Prompt rules are centralized in `src/services/smart-ai-prompts.ts` and language / market definitions live in `src/services/global-language.ts`. To add a new language, add it to `inputLanguageOptions` and/or `outputLanguageOptions`, extend `localizedText` usage where mock output needs deterministic text, and add tests. To add a new market, add it to `targetMarketOptions`, define its `marketInstruction`, and add prompt tests.

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
