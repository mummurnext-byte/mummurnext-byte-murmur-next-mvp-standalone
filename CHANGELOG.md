# Changelog

## Unreleased

### Added

- Created standalone Mummur Next MVP project separated from Mummur Back Office.
- Added Prisma schema and migration for Digital Humans, Personas, Consent Records, Song Ideas, Content Plans, Publish Assets, Platform Posts, and File Assets.
- Added mock weekly plan generation.
- Added manual Suno and MakeBestMusic music provider workflow.
- Added manual HeyGen, Akool, and D-ID video provider workflow.
- Added music and video upload with local file metadata and playback.
- Added tests for provider selection, prompt generation, upload validation, and metadata.
- Added Vercel deployment readiness docs, environment example, storage provider abstraction, and admin deployment checklist page.
- Added Vercel Blob storage provider for durable production media uploads.
- Added Smart AI Singer service with OpenAI SDK support, mock fallback, structured output validation, usage logging, and back-office controls.
- Added multi-provider Smart AI Singer LLM selection for Mock, OpenAI, Gemini, Groq, and OpenRouter with mock fallback when keys are missing.
- Added global language and target market controls for UI language, Smart AI output language, input language detection, localized prompts, and generation audit logs.
- Added Creative Evidence records for Content Plans to track idea, outline, story, mood, character, prompts, Gemini revisions, final lyrics, Suno prompt, and publish time.
- Added consent-gated digital-human image creation with Local Preview and official OpenAI Image providers, strict portrait validation, non-retained source bytes, output playback, audit history, and a UTC daily limit.
- Added the official Gemini image editing provider with safe Local Preview fallback and reuse of an explicitly configured Gemini LLM key.
