import { describe, expect, it } from "vitest";

import {
  getVideoApiProvider,
  isRetryableVideoApiStatus,
  isVideoApiProviderKey,
  videoApiProviders
} from "./video-api-provider";

describe("video API providers", () => {
  it("exposes only supported official/mock API providers", async () => {
    expect(videoApiProviders.map((provider) => provider.providerKey)).toEqual(["mock_video_api"]);
    expect(isVideoApiProviderKey("mock_video_api")).toBe(true);
    expect(isVideoApiProviderKey("heygen_unofficial")).toBe(false);
  });

  it("creates a completed mock video API job with generatedVideoUrl and safe config", async () => {
    const provider = getVideoApiProvider("mock_video_api");
    const result = await provider.createJob({
      contentPlan: contentPlanFixture(),
      musicAsset: musicAssetFixture()
    });

    expect(result.status).toBe("completed");
    expect(result.generatedVideoUrl).toBe("https://mock-video-api.local/generated/plan-1.mp4");
    expect(result.errorMessage).toBeNull();
    expect(result.providerConfig).toEqual({
      providerKey: "mock_video_api",
      providerName: "Mock Video API",
      mode: "mock",
      usesOfficialApi: false,
      storesCredentials: false
    });
    expect(result.requestPayload.videoTitle).toBe("Mummur Test - Quiet Confidence");
    expect(result.requestPayload.sourceMusicAssetId).toBe("music-1");
    expect(result.requestPayload.lipSyncNotes).toContain("song.mp3");
  });

  it("marks only failed video API jobs as retryable", () => {
    expect(isRetryableVideoApiStatus("failed")).toBe(true);
    expect(isRetryableVideoApiStatus("queued")).toBe(false);
    expect(isRetryableVideoApiStatus("processing")).toBe(false);
    expect(isRetryableVideoApiStatus("completed")).toBe(false);
  });
});

function musicAssetFixture() {
  return {
    id: "music-1",
    provider: "mock_music_api",
    metadata: { originalName: "song.mp3" }
  };
}

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
    status: "music_generated" as const,
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
