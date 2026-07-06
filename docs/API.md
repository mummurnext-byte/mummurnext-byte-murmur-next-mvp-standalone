# API and Actions

Mummur Next MVP uses Server Actions for back-office mutations and one media route for playback.

## Server Actions

- `createDigitalHumanAction`
- `updateDigitalHumanAction`
- `addConsentRecordAction`
- `generateWeeklyPlanAction`
- `updateContentPlanCopyAction`
- `updateContentPlanStatusAction`
- `uploadMusicAssetAction`
- `uploadVideoAssetAction`
- `savePlatformPostAction`
- `markPlatformPostPublishedAction`

## Media Route

### `GET /api/assets/{id}`

Streams an uploaded `PublishAsset` file for local review.

Rules:

- The `PublishAsset` must not be deleted.
- Its parent `ContentPlan` and `DigitalHuman` must not be deleted.
- The linked `FileAsset` must belong to the same content plan.
- Local storage paths are not exposed to the browser.

## Upload Rules

Music:

- Extensions: `mp3`, `wav`, `m4a`
- MIME types: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/m4a`, `audio/x-m4a`

Video:

- Extensions: `mp4`, `mov`, `webm`
- MIME types: `video/mp4`, `video/quicktime`, `video/webm`

## Security Boundaries

- No real provider APIs are called.
- No cookies, session tokens, provider credentials, or API keys are stored.
- Browser automation is intentionally not used.
- TikTok and YouTube publishing is manual only in this MVP.
