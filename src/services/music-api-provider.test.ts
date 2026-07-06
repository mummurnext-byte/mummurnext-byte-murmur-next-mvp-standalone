import { describe, expect, it } from "vitest";

import {
  getMusicApiProvider,
  isMusicApiProviderKey,
  isRetryableMusicApiStatus,
  musicApiProviders
} from "./music-api-provider";

describe("music API providers", () => {
  it("exposes only supported official/mock API providers", async () => {
    expect(musicApiProviders.map((provider) => provider.providerKey)).toEqual(["mock_music_api"]);
    expect(isMusicApiProviderKey("mock_music_api")).toBe(true);
    expect(isMusicApiProviderKey("suno_unofficial")).toBe(false);
  });

  it("creates a completed mock music API job with generatedAudioUrl and safe config", async () => {
    const provider = getMusicApiProvider("mock_music_api");
    const result = await provider.createJob({ contentPlan: contentPlanFixture() });

    expect(result.status).toBe("completed");
    expect(result.generatedAudioUrl).toBe("https://mock-music-api.local/generated/plan-1.mp3");
    expect(result.errorMessage).toBeNull();
    expect(result.providerConfig).toEqual({
      providerKey: "mock_music_api",
      providerName: "Mock Music API",
      mode: "mock",
      usesOfficialApi: false,
      storesCredentials: false
    });
    expect(result.requestPayload.songTitle).toBe("Mummur Test - Quiet Confidence");
    expect(result.requestPayload.lyrics).toContain("[Chorus]");
  });

  it("marks only failed music API jobs as retryable", () => {
    expect(isRetryableMusicApiStatus("failed")).toBe(true);
    expect(isRetryableMusicApiStatus("queued")).toBe(false);
    expect(isRetryableMusicApiStatus("processing")).toBe(false);
    expect(isRetryableMusicApiStatus("completed")).toBe(false);
  });
});

function contentPlanFixture() {
  return {
    id: "plan-1",
    digitalHumanId: "human-1",
    songIdeaId: "song-1",
    scheduledDate: new Date("2026-07-06T00:00:00.000Z"),
    title: "Mummur Test - Quiet Confidence",
    caption: "Caption",
    hashtags: ["#MummurNext"],
    targetPlatform: "tiktok" as const,
    status: "idea" as const,
    createdAt: new Date("2026-07-06T00:00:00.000Z"),
    updatedAt: new Date("2026-07-06T00:00:00.000Z"),
    deletedAt: null,
    digitalHuman: {
      id: "human-1",
      displayName: "Mummur Test",
      legalName: null,
      avatarUrl: null,
      voiceSampleUrl: null,
      notes: null,
      createdAt: new Date("2026-07-06T00:00:00.000Z"),
      updatedAt: new Date("2026-07-06T00:00:00.000Z"),
      deletedAt: null,
      persona: {
        id: "persona-1",
        digitalHumanId: "human-1",
        archetype: "founder artist",
        backstory: "Backstory",
        toneOfVoice: "direct and warm",
        audience: "short-video listeners",
        musicStyle: "electronic pop",
        visualStyle: "studio",
        createdAt: new Date("2026-07-06T00:00:00.000Z"),
        updatedAt: new Date("2026-07-06T00:00:00.000Z"),
        deletedAt: null
      }
    },
    songIdea: {
      id: "song-1",
      digitalHumanId: "human-1",
      theme: "quiet confidence",
      lyricsDirection: "Write a compact hook.",
      videoScript: "Open with a close-up.",
      musicPrompt: "Electronic pop song about quiet confidence.",
      createdAt: new Date("2026-07-06T00:00:00.000Z"),
      updatedAt: new Date("2026-07-06T00:00:00.000Z"),
      deletedAt: null
    }
  };
}
