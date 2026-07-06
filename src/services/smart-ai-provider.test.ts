import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createLLMProvider,
  GeminiProvider,
  GroqProvider,
  OpenAIProvider,
  OpenRouterProvider
} from "./smart-ai-provider";
import { lyricsSchema } from "./smart-ai-schemas";

describe("smart ai provider factory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses MockLLMProvider when LLM_PROVIDER is mock", () => {
    expect(createLLMProvider({ LLM_PROVIDER: "mock", OPENAI_API_KEY: "secret" }).provider).toBe("mock");
  });

  it("keeps legacy OpenAI behavior when only OPENAI_API_KEY is configured", () => {
    expect(createLLMProvider({ OPENAI_API_KEY: "secret" }).provider).toBe("openai");
  });

  it("falls back to mock when provider API keys are missing", () => {
    expect(createLLMProvider({ LLM_PROVIDER: "gemini" }).provider).toBe("mock");
    expect(createLLMProvider({ LLM_PROVIDER: "groq" }).provider).toBe("mock");
    expect(createLLMProvider({ LLM_PROVIDER: "openrouter" }).provider).toBe("mock");
    expect(createLLMProvider({ LLM_PROVIDER: "openai" }).provider).toBe("mock");
  });

  it("creates configured providers with LLM_MODEL", () => {
    expect(createLLMProvider({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "key", LLM_MODEL: "gpt-test" })).toBeInstanceOf(OpenAIProvider);
    expect(createLLMProvider({ LLM_PROVIDER: "gemini", GEMINI_API_KEY: "key", LLM_MODEL: "gemini-test" })).toBeInstanceOf(GeminiProvider);
    expect(createLLMProvider({ LLM_PROVIDER: "groq", GROQ_API_KEY: "key", LLM_MODEL: "groq-test" })).toBeInstanceOf(GroqProvider);
    expect(createLLMProvider({ LLM_PROVIDER: "openrouter", OPENROUTER_API_KEY: "key", LLM_MODEL: "router-test" })).toBeInstanceOf(OpenRouterProvider);
  });

  it("validates provider output against the requested schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ songTitle: "Missing fields" }) } }]
        })
      }))
    );

    const provider = new GroqProvider("key", "test-model");

    await expect(
      provider.generate({
        systemPrompt: "System",
        userPrompt: "User",
        schema: lyricsSchema,
        fallbackOutput: {
          songTitle: "Fallback",
          lyrics: "Fallback lyrics",
          hook: "Fallback hook",
          hashtags: ["#Fallback"]
        }
      })
    ).rejects.toThrow("lyrics must be a non-empty string");
  });
});
