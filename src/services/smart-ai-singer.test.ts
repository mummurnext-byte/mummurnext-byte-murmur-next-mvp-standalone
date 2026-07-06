import type { SmartAIGeneration, SmartAIPurpose } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { resolveLanguageSettings } from "./global-language";
import { getUICopy } from "@/lib/ui-copy";
import { getSmartLLMProvider, type LLMProvider, type SmartAIProviderRequest } from "./smart-ai-provider";
import { SmartAISingerService, type SmartAISingerRepository } from "./smart-ai-singer";
import type { SmartAIOutput } from "./smart-ai-schemas";

describe("smart ai singer", () => {
  it("falls back to mock provider without a configured provider key", () => {
    expect(getSmartLLMProvider({}).provider).toBe("mock");
  });

  it("generates Smart Singer Profile", async () => {
    const repo = new MemorySmartAIRepository();
    const output = await new SmartAISingerService(repo).generateSingerConcept("human-1");

    expect(output.positioning).toContain("Mummur Test");
    expect(repo.profile?.positioning).toBe(output.positioning);
    expect(repo.generations[0].status).toBe("completed");
  });

  it("allows generation before the daily limit is reached", async () => {
    const repo = new MemorySmartAIRepository({ generationsSinceStartOfDay: 1 });

    await withSmartAILimit("2", async () => {
      await expect(new SmartAISingerService(repo).generateLyrics("plan-1")).resolves.toMatchObject({
        songTitle: "Mummur Test - Quiet Confidence"
      });
    });

    expect(repo.generations).toHaveLength(1);
    expect(repo.generations[0].status).toBe("completed");
  });

  it("rejects generation when the daily limit is reached", async () => {
    const repo = new MemorySmartAIRepository({ generationsSinceStartOfDay: 2 });

    await withSmartAILimit("2", async () => {
      await expect(new SmartAISingerService(repo).generateLyrics("plan-1")).rejects.toThrow(
        "Smart AI daily limit reached (2)."
      );
    });

    expect(repo.generations).toHaveLength(0);
  });

  it("generates lyrics, music prompt, video brief, publish copy, and next content", async () => {
    const service = new SmartAISingerService(new MemorySmartAIRepository());

    await expect(service.generateLyrics("plan-1")).resolves.toMatchObject({ songTitle: "Mummur Test - Quiet Confidence" });
    await expect(service.generateMusicPrompt("plan-1", "suno_manual")).resolves.toMatchObject({ genre: "electronic pop" });
    await expect(service.generateVideoBrief("plan-1", "heygen_manual")).resolves.toMatchObject({ videoTitle: "Mummur Test - Quiet Confidence" });
    await expect(service.generatePublishCopy("plan-1", "tiktok")).resolves.toMatchObject({ title: "Mummur Test - Quiet Confidence" });
    await expect(service.suggestNextContent("human-1")).resolves.toMatchObject({
      recommendations: expect.any(Array)
    });
  });

  it("routes every Smart AI Singer generation through the configured provider", async () => {
    const provider = new TrackingProvider();
    const service = new SmartAISingerService(new MemorySmartAIRepository(), provider);

    await service.generateSingerConcept("human-1");
    await service.generateSongIdea("plan-1");
    await service.generateLyrics("plan-1");
    await service.generateMusicPrompt("plan-1", "suno_manual");
    await service.generateVideoBrief("plan-1", "heygen_manual");
    await service.generatePublishCopy("plan-1", "tiktok");
    await service.suggestNextContent("human-1");

    expect(provider.schemaNames).toEqual([
      "singer_concept",
      "song_idea",
      "lyrics",
      "music_prompt",
      "video_brief",
      "publish_copy",
      "next_content"
    ]);
  });

  it("keeps UI language independent from content output language", () => {
    const ui = getUICopy("zh-CN");
    const contentLanguage = resolveLanguageSettings({ inputLanguage: "en", outputLanguage: "th", targetMarket: "thailand" });

    expect(ui.createDigitalHuman).toBe("新建数字人");
    expect(contentLanguage.outputLanguage).toBe("th");
    expect(contentLanguage.targetMarket).toBe("thailand");
  });

  it("supports Chinese input to English output", async () => {
    const output = await new SmartAISingerService(new MemorySmartAIRepository()).generateLyrics("plan-1", {
      inputLanguage: "zh-CN",
      outputLanguage: "en"
    });

    expect(output.lyrics).toContain("This is the hook");
  });

  it("supports Chinese input to Thai output", async () => {
    const output = await new SmartAISingerService(new MemorySmartAIRepository()).generateLyrics("plan-1", {
      inputLanguage: "zh-CN",
      outputLanguage: "th",
      targetMarket: "thailand"
    });

    expect(output.lyrics).toContain("ฮุก");
  });

  it("supports English input to Chinese output", async () => {
    const output = await new SmartAISingerService(new MemorySmartAIRepository()).generatePublishCopy("plan-1", "tiktok", {
      inputLanguage: "en",
      outputLanguage: "zh-CN"
    });

    expect(output.tiktokCaption).toContain("适合短视频");
  });

  it("supports Thai input to Chinese output", async () => {
    const output = await new SmartAISingerService(new MemorySmartAIRepository()).generateLyrics("plan-1", {
      inputLanguage: "th",
      outputLanguage: "zh-CN"
    });

    expect(output.lyrics).toContain("副歌");
  });

  it("supports Thai input to English output", async () => {
    const output = await new SmartAISingerService(new MemorySmartAIRepository()).generateLyrics("plan-1", {
      inputLanguage: "th",
      outputLanguage: "en"
    });

    expect(output.lyrics).toContain("This is the hook");
  });

  it("adds Thailand localization instructions to prompts", async () => {
    const provider = new TrackingProvider();
    await new SmartAISingerService(new MemorySmartAIRepository(), provider).generateLyrics("plan-1", {
      outputLanguage: "th",
      targetMarket: "thailand"
    });

    expect(provider.userPrompts[0]).toContain("Use Thailand localization");
    expect(provider.userPrompts[0]).toContain("Generate the final result entirely in Thai");
  });

  it("adds United States localization instructions to prompts", async () => {
    const provider = new TrackingProvider();
    await new SmartAISingerService(new MemorySmartAIRepository(), provider).generateLyrics("plan-1", {
      outputLanguage: "en",
      targetMarket: "us"
    });

    expect(provider.userPrompts[0]).toContain("Use United States localization");
  });

  it("gives output language priority over input language", async () => {
    const output = await new SmartAISingerService(new MemorySmartAIRepository()).generateLyrics("plan-1", {
      inputLanguage: "th",
      outputLanguage: "zh-CN"
    });

    expect(output.lyrics).toContain("副歌");
    expect(output.lyrics).not.toContain("This is the hook");
  });

  it("passes language settings to the configured provider", async () => {
    const provider = new TrackingProvider();
    await new SmartAISingerService(new MemorySmartAIRepository(), provider).generateMusicPrompt("plan-1", "suno_manual", {
      inputLanguage: "auto",
      outputLanguage: "th",
      targetMarket: "thailand"
    });

    expect(provider.languageSettings[0]).toMatchObject({
      inputLanguage: "auto",
      outputLanguage: "th",
      targetMarket: "thailand"
    });
  });

  it("records failed generations when structured output is invalid", async () => {
    const repo = new MemorySmartAIRepository();
    const service = new SmartAISingerService(repo, new InvalidOutputProvider());

    await expect(service.generateLyrics("plan-1")).rejects.toThrow("lyrics must be a non-empty string");
    expect(repo.generations[0].status).toBe("failed");
    expect(repo.generations[0].errorMessage).toContain("lyrics must be a non-empty string");
  });

  it("records failed generations when the provider fails", async () => {
    const repo = new MemorySmartAIRepository();
    const service = new SmartAISingerService(repo, new FailingProvider());

    await expect(service.generateMusicPrompt("plan-1", "suno_manual")).rejects.toThrow("provider unavailable");
    expect(repo.generations[0].status).toBe("failed");
    expect(repo.generations[0].errorMessage).toBe("provider unavailable");
  });
});

class InvalidOutputProvider implements LLMProvider {
  readonly provider = "openai";
  readonly model = "test-model";

  async generate<T extends SmartAIOutput>(request: SmartAIProviderRequest<T>) {
    return {
      output: request.schema.validate({ songTitle: "Invalid" }),
      provider: this.provider,
      model: this.model
    };
  }
}

class FailingProvider implements LLMProvider {
  readonly provider = "openai";
  readonly model = "test-model";

  async generate<T extends SmartAIOutput>(): Promise<{ output: T; provider: string; model: string }> {
    throw new Error("provider unavailable");
  }
}

class TrackingProvider implements LLMProvider {
  readonly provider = "tracking";
  readonly model = "tracking-model";
  readonly schemaNames: string[] = [];
  readonly userPrompts: string[] = [];
  readonly languageSettings: unknown[] = [];

  async generate<T extends SmartAIOutput>(request: SmartAIProviderRequest<T>) {
    this.schemaNames.push(request.schema.name);
    this.userPrompts.push(request.userPrompt);
    this.languageSettings.push(request.languageSettings);

    return {
      output: request.schema.validate(request.fallbackOutput),
      provider: this.provider,
      model: this.model
    };
  }
}

class MemorySmartAIRepository implements SmartAISingerRepository {
  generations: (Partial<SmartAIGeneration> & { id: string; status: "started" | "completed" | "failed" })[] = [];
  profile: { positioning: string } | null = null;
  private readonly generationsSinceStartOfDay: number;

  constructor(options: { generationsSinceStartOfDay?: number } = {}) {
    this.generationsSinceStartOfDay = options.generationsSinceStartOfDay ?? 0;
  }

  async getDigitalHuman() {
    return digitalHumanFixture();
  }

  async getContentPlan() {
    return contentPlanFixture();
  }

  async summarizeHistory() {
    return "No prior content plans.";
  }

  async countGenerationsSince() {
    return this.generationsSinceStartOfDay;
  }

  async startGeneration(input: { purpose: SmartAIPurpose; languageSettings?: unknown }) {
    const generation = {
      id: `generation-${this.generations.length + 1}`,
      purpose: input.purpose,
      status: "started" as const,
      languageSettings: input.languageSettings
    };
    this.generations.push(generation);
    return { id: generation.id };
  }

  async completeGeneration(id: string, input: { output: SmartAIOutput }) {
    const generation = this.generations.find((item) => item.id === id);
    if (generation) {
      generation.status = "completed";
      generation.output = input.output;
    }
  }

  async failGeneration(id: string, errorMessage: string) {
    const generation = this.generations.find((item) => item.id === id);
    if (generation) {
      generation.status = "failed";
      generation.errorMessage = errorMessage;
    }
  }

  async upsertSingerProfile(_digitalHumanId: string, output: { positioning: string }) {
    this.profile = { positioning: output.positioning };
  }
}

async function withSmartAILimit(limit: string, callback: () => Promise<void>) {
  const previousLimit = process.env.SMART_AI_DAILY_LIMIT;
  process.env.SMART_AI_DAILY_LIMIT = limit;

  try {
    await callback();
  } finally {
    if (previousLimit === undefined) {
      delete process.env.SMART_AI_DAILY_LIMIT;
    } else {
      process.env.SMART_AI_DAILY_LIMIT = previousLimit;
    }
  }
}

function digitalHumanFixture() {
  return {
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
      toneOfVoice: "clear and warm",
      audience: "short video music fans",
      musicStyle: "electronic pop",
      visualStyle: "clean studio performance",
      inputLanguage: "auto",
      outputLanguage: "en",
      targetMarket: "global",
      createdAt: new Date("2026-07-06T00:00:00.000Z"),
      updatedAt: new Date("2026-07-06T00:00:00.000Z"),
      deletedAt: null
    }
  };
}

function contentPlanFixture() {
  return {
    id: "plan-1",
    digitalHumanId: "human-1",
    songIdeaId: "song-1",
    scheduledDate: new Date("2026-07-06T00:00:00.000Z"),
    title: "Mummur Test - Quiet Confidence",
    caption: "Original AI music concept.",
    hashtags: ["#MummurNext", "#AIMusic"],
    targetPlatform: "tiktok" as const,
    inputLanguage: "auto",
    outputLanguage: "en",
    targetMarket: "global",
    status: "idea" as const,
    createdAt: new Date("2026-07-06T00:00:00.000Z"),
    updatedAt: new Date("2026-07-06T00:00:00.000Z"),
    deletedAt: null,
    digitalHuman: digitalHumanFixture(),
    songIdea: {
      id: "song-1",
      digitalHumanId: "human-1",
      theme: "quiet confidence",
      lyricsDirection: "Write a compact hook.",
      videoScript: "Open with a close-up.",
      musicPrompt: "Electronic pop song about quiet confidence.",
      inputLanguage: "auto",
      outputLanguage: "en",
      targetMarket: "global",
      createdAt: new Date("2026-07-06T00:00:00.000Z"),
      updatedAt: new Date("2026-07-06T00:00:00.000Z"),
      deletedAt: null
    }
  };
}
