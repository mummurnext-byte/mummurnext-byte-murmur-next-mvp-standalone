import { afterEach, describe, expect, it, vi } from "vitest";

import { getLLMProvider, OpenAIProvider, type WeeklyPlanContext } from "./llm-provider";

describe("LLM providers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates a 7-day weekly plan with the mock provider", async () => {
    const items = await getLLMProvider("mock").generateWeeklyPlan(contextFixture());

    expect(items).toHaveLength(7);
    expect(items[0]).toMatchObject({
      theme: "quiet confidence",
      title: "Mummur Test - Quiet Confidence",
      targetPlatform: "tiktok"
    });
    expect(items[0].hashtags).toContain("#MummurNext");
  });

  it("falls back to mock when OpenAI is selected without an API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const provider = getLLMProvider("openai");
    const items = await provider.generateWeeklyPlan(contextFixture());

    expect(provider.providerKey).toBe("mock");
    expect(items).toHaveLength(7);
  });

  it("calls OpenAI Responses API and parses structured weekly plan output", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));

      expect(body.model).toBe("gpt-5.5");
      expect(body.text.format.name).toBe("weekly_content_plan");
      expect(body.input[1].content[0].text).toContain("Mummur Test");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");

      return new Response(JSON.stringify({ output_text: JSON.stringify({ items: openAIItemsFixture() }) }), {
        status: 200
      });
    });

    const provider = new OpenAIProvider("test-key", fetchMock as typeof fetch);
    const items = await provider.generateWeeklyPlan(contextFixture());

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(items).toHaveLength(7);
    expect(items[0].hashtags).toEqual(["#MummurNext", "#AIMusic"]);
  });
});

function contextFixture(): WeeklyPlanContext {
  return {
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
        backstory: "A digital human built for original AI music.",
        toneOfVoice: "direct and warm",
        audience: "short-video listeners",
        musicStyle: "electronic pop",
        visualStyle: "clean studio portrait",
        createdAt: new Date("2026-07-06T00:00:00.000Z"),
        updatedAt: new Date("2026-07-06T00:00:00.000Z"),
        deletedAt: null
      }
    }
  };
}

function openAIItemsFixture() {
  return Array.from({ length: 7 }, (_, index) => ({
    theme: `theme ${index + 1}`,
    lyricsDirection: `lyrics ${index + 1}`,
    videoScript: `video ${index + 1}`,
    musicPrompt: `music ${index + 1}`,
    title: `title ${index + 1}`,
    caption: `caption ${index + 1}`,
    hashtags: ["MummurNext", "#AIMusic"],
    targetPlatform: index % 3 === 0 ? "tiktok" : index % 3 === 1 ? "youtube_shorts" : "youtube"
  }));
}
