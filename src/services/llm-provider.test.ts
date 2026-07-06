import { describe, expect, it } from "vitest";

import {
  getConfiguredLLMProvider,
  MockLLMProvider,
  validateMusicPromptOutput,
  validateWeeklyPlanResponse,
  withLLMFallback,
  type LLMProvider
} from "./llm-provider";

describe("LLM providers", () => {
  it("falls back to Mock LLM when OpenAI has no API key", () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(getConfiguredLLMProvider("openai").providerKey).toBe("mock");

    if (previous === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previous;
    }
  });

  it("validates structured LLM output schemas", () => {
    expect(() =>
      validateMusicPromptOutput({
        songTitle: "Title",
        songPrompt: "Prompt",
        lyrics: "Lyrics",
        stylePrompt: "Style",
        genre: "pop",
        mood: "bright",
        duration: "45 seconds"
      })
    ).not.toThrow();

    expect(() => validateMusicPromptOutput({ songTitle: "Title" })).toThrow("songPrompt");
    expect(() => validateWeeklyPlanResponse({ items: [] })).toThrow("exactly 7");
  });

  it("returns fallback output when an LLM provider fails", async () => {
    const failingProvider: LLMProvider = {
      providerKey: "openai",
      providerName: "OpenAI",
      async generateWeeklyPlan() {
        throw new Error("network failed");
      },
      async generateMusicPrompt() {
        throw new Error("network failed");
      },
      async generateVideoBrief() {
        throw new Error("network failed");
      },
      async generatePublishCopy() {
        throw new Error("network failed");
      }
    };

    const result = await withLLMFallback(
      failingProvider,
      (mock) => mock.generateWeeklyPlan(promptHuman()),
      (provider) => provider.generateWeeklyPlan(promptHuman())
    );

    expect(result.usedFallback).toBe(true);
    expect(result.providerKey).toBe("mock");
    expect(result.error).toBe("network failed");
    expect(result.value).toHaveLength(7);
  });

  it("generates seven weekly plan items with Mock LLM", async () => {
    const items = await new MockLLMProvider().generateWeeklyPlan(promptHuman());

    expect(items).toHaveLength(7);
    expect(items.every((item) => item.title.includes("Mummur Test"))).toBe(true);
  });
});

function promptHuman() {
  return {
    displayName: "Mummur Test",
    persona: {
      archetype: "founder artist",
      backstory: "A digital human built for original AI music.",
      toneOfVoice: "direct and warm",
      audience: "short-video listeners",
      musicStyle: "electronic pop",
      visualStyle: "studio"
    }
  };
}
