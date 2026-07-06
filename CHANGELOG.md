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
