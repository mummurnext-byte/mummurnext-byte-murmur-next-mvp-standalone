import { describe, expect, it } from "vitest";

import { getMusicProvider, musicProviders } from "./music-provider";
import { getVideoProvider, videoProviders } from "./video-provider";

describe("manual providers", () => {
  it("selects music providers and builds prompts", () => {
    const prompt = getMusicProvider("suno_manual").buildPrompt({
      contentPlan: contentPlanFixture()
    });

    expect(musicProviders.map((provider) => provider.providerKey)).toEqual([
      "suno_manual",
      "makebestmusic_manual"
    ]);
    expect(getMusicProvider("missing").providerName).toBe("Suno");
    expect(prompt.songTitle).toBe("Mummur Test - Quiet Confidence");
    expect(prompt.songPrompt).toContain("Avoid artist names");
    expect(prompt.lyrics).toContain("[Chorus]");
  });

  it("selects video providers and builds prompts", () => {
    const prompt = getVideoProvider("akool_manual").buildPrompt({
      contentPlan: contentPlanFixture(),
      musicAsset: { provider: "suno_manual", metadata: { originalName: "song.m4a" } }
    });

    expect(videoProviders.map((provider) => provider.providerKey)).toEqual([
      "heygen_manual",
      "akool_manual",
      "did_manual"
    ]);
    expect(getVideoProvider("missing").providerName).toBe("HeyGen");
    expect(prompt.providerName).toBe("Akool");
    expect(prompt.lipSyncNotes).toContain("song.m4a");
    expect(prompt.youtubeShortsDescription).toContain("#MummurNext");
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
