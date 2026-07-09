# API and Actions

Mummur Next MVP uses Server Actions for back-office mutations and one media route for playback.

## Server Actions

- `createDigitalHumanAction`
- `updateDigitalHumanAction`
- `addConsentRecordAction`
- `generateWeeklyPlanAction`
- `updateContentPlanCopyAction`
- `updateContentPlanLanguageAction`
- `updateContentPlanStatusAction`
- `updateCreativeEvidenceAction`
- `uploadMusicAssetAction`
- `uploadVideoAssetAction`
- `generateSmartSingerProfileAction`
- `askSmartSingerAction`

Language-aware actions accept:

- `inputLanguage`: `auto`, `en`, `zh-CN`, or `th`
- `outputLanguage`: `en`, `zh-CN`, or `th`
- `targetMarket`: `global`, `us`, `china`, `thailand`, `japan`, `korea`, `spain`, `france`, or `germany`

`inputLanguage` is only used for interpreting source material. Smart AI Singer
must generate final text in `outputLanguage` and localize style, hashtags, and
platform copy for `targetMarket`.

`updateCreativeEvidenceAction` stores the Content Plan creative audit trail:
Idea, Song Outline, Story, Mood, Character, Prompt, Gemini Revision Log, Final
Lyrics, Suno Prompt, and Publish Time. It only edits local database state and
does not call Gemini, Suno, TikTok, YouTube, or any external API.

## Media Route

### `GET /api/assets/{id}`

Streams an uploaded `PublishAsset` file for local review.

Rules:

- The `PublishAsset` must not be deleted.
- Its parent `ContentPlan` and `DigitalHuman` must not be deleted.
- The linked `FileAsset` must belong to the same content plan.
- Local storage paths are not exposed to the browser.

## Admin Deployment Checklist

### `GET /admin/deployment-checklist`

Renders a read-only deployment readiness page.

Shows:

- Database connected
- Storage provider configured
- LLM provider configured
- Build version
- App base URL
- Environment mode

The page does not render `DATABASE_URL`, LLM API keys, tokens, cookies, or other secrets.

## Upload Rules

Music:

- Extensions: `mp3`, `wav`, `m4a`
- MIME types: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/m4a`, `audio/x-m4a`

Video:

- Extensions: `mp4`, `mov`, `webm`
- MIME types: `video/mp4`, `video/quicktime`, `video/webm`

## Security Boundaries

- Manual music/video providers do not call real provider APIs.
- No cookies, session tokens, provider credentials, or API keys are stored.
- Browser automation is intentionally not used.
- Smart AI Singer sends only text context to the selected LLM provider; uploaded audio/video files are not sent.
- LLM API keys are read from environment variables and are not logged.
- UI language, content output language, and target market are independent settings.
