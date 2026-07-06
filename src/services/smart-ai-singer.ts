import type {
  ContentPlan,
  DigitalHuman,
  Persona,
  SmartAIPurpose,
  SongIdea,
  TargetPlatform
} from "@prisma/client";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSmartLLMProvider, type LLMProvider, type SmartAIUsage } from "@/services/smart-ai-provider";
import { buildSmartAIPrompt, smartAISystemPrompt } from "@/services/smart-ai-prompts";
import {
  lyricsSchema,
  musicPromptSchema,
  nextContentSchema,
  publishCopySchema,
  singerConceptSchema,
  songIdeaSchema,
  videoBriefSchema,
  type LyricsOutput,
  type MusicPromptOutput,
  type NextContentOutput,
  type PublishCopyOutput,
  type SingerConceptOutput,
  type SmartAIOutput,
  type SmartAISchema,
  type SongIdeaOutput,
  type VideoBriefOutput
} from "@/services/smart-ai-schemas";

type DigitalHumanContext = DigitalHuman & { persona: Persona | null };
type ContentPlanContext = ContentPlan & {
  digitalHuman: DigitalHuman & { persona: Persona | null };
  songIdea: SongIdea;
};

type StartGenerationInput = {
  purpose: SmartAIPurpose;
  provider: string;
  model: string;
  digitalHumanId?: string;
  contentPlanId?: string;
  inputSummary: string;
};

export interface SmartAISingerRepository {
  getDigitalHuman(id: string): Promise<DigitalHumanContext | null>;
  getContentPlan(id: string): Promise<ContentPlanContext | null>;
  summarizeHistory(digitalHumanId: string): Promise<string>;
  countGenerationsSince(start: Date): Promise<number>;
  startGeneration(input: StartGenerationInput): Promise<{ id: string }>;
  completeGeneration(id: string, input: {
    output: SmartAIOutput;
    provider: string;
    model: string;
    usage?: SmartAIUsage;
    estimatedCostUsd?: string;
  }): Promise<void>;
  failGeneration(id: string, errorMessage: string): Promise<void>;
  upsertSingerProfile(digitalHumanId: string, output: SingerConceptOutput, provider: string): Promise<void>;
}

export class PrismaSmartAISingerRepository implements SmartAISingerRepository {
  async getDigitalHuman(id: string) {
    return prisma.digitalHuman.findFirst({
      where: { id, deletedAt: null },
      include: { persona: true }
    });
  }

  async getContentPlan(id: string) {
    return prisma.contentPlan.findFirst({
      where: { id, deletedAt: null, digitalHuman: { deletedAt: null } },
      include: {
        digitalHuman: { include: { persona: true } },
        songIdea: true
      }
    });
  }

  async summarizeHistory(digitalHumanId: string) {
    const recentPlans = await prisma.contentPlan.findMany({
      where: { digitalHumanId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { title: true, targetPlatform: true, status: true }
    });

    if (recentPlans.length === 0) return "No prior content plans.";

    return recentPlans
      .map((plan) => `${plan.title} / ${plan.targetPlatform} / ${plan.status}`)
      .join("; ");
  }

  async countGenerationsSince(start: Date) {
    return prisma.smartAIGeneration.count({
      where: { createdAt: { gte: start }, deletedAt: null }
    });
  }

  async startGeneration(input: StartGenerationInput) {
    return prisma.smartAIGeneration.create({
      data: input,
      select: { id: true }
    });
  }

  async completeGeneration(
    id: string,
    input: {
      output: SmartAIOutput;
      provider: string;
      model: string;
      usage?: SmartAIUsage;
      estimatedCostUsd?: string;
    }
  ) {
    await prisma.smartAIGeneration.update({
      where: { id },
      data: {
        status: "completed",
        output: input.output,
        provider: input.provider,
        model: input.model,
        promptTokens: input.usage?.promptTokens,
        completionTokens: input.usage?.completionTokens,
        totalTokens: input.usage?.totalTokens,
        estimatedCostUsd: input.estimatedCostUsd,
        finishedAt: new Date()
      }
    });
  }

  async failGeneration(id: string, errorMessage: string) {
    await prisma.smartAIGeneration.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage,
        finishedAt: new Date()
      }
    });
  }

  async upsertSingerProfile(digitalHumanId: string, output: SingerConceptOutput, provider: string) {
    await prisma.smartSingerProfile.upsert({
      where: { digitalHumanId },
      create: {
        digitalHumanId,
        positioning: output.positioning,
        personaSummary: output.personaSummary,
        musicStyle: output.musicStyle,
        audience: output.audience,
        contentDirection: output.contentDirection,
        provider
      },
      update: {
        positioning: output.positioning,
        personaSummary: output.personaSummary,
        musicStyle: output.musicStyle,
        audience: output.audience,
        contentDirection: output.contentDirection,
        provider,
        deletedAt: null
      }
    });
  }
}

export class SmartAISingerService {
  constructor(
    private readonly repository: SmartAISingerRepository = new PrismaSmartAISingerRepository(),
    private readonly provider: LLMProvider = getSmartLLMProvider()
  ) {}

  async generateSingerConcept(digitalHumanId: string) {
    const digitalHuman = await this.requireDigitalHuman(digitalHumanId);
    const output = await this.runGeneration({
      purpose: "singer_concept",
      digitalHumanId,
      schema: singerConceptSchema,
      prompt: await this.promptForHuman("singer_concept", digitalHuman),
      fallbackOutput: mockSingerConcept(digitalHuman)
    });

    await this.repository.upsertSingerProfile(digitalHumanId, output, this.provider.provider);
    return output;
  }

  async generateSongIdea(contentPlanId: string) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    return this.runGeneration({
      purpose: "song_idea",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      schema: songIdeaSchema,
      prompt: await this.promptForPlan("song_idea", contentPlan),
      fallbackOutput: mockSongIdea(contentPlan)
    });
  }

  async generateLyrics(contentPlanId: string) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    return this.runGeneration({
      purpose: "lyrics",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      schema: lyricsSchema,
      prompt: await this.promptForPlan("lyrics", contentPlan),
      fallbackOutput: mockLyrics(contentPlan)
    });
  }

  async generateMusicPrompt(contentPlanId: string, provider: string) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    return this.runGeneration({
      purpose: "music_prompt",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      schema: musicPromptSchema,
      prompt: await this.promptForPlan("music_prompt", contentPlan, { provider }),
      fallbackOutput: mockMusicPrompt(contentPlan, provider)
    });
  }

  async generateVideoBrief(contentPlanId: string, videoProvider: string) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    return this.runGeneration({
      purpose: "video_brief",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      schema: videoBriefSchema,
      prompt: await this.promptForPlan("video_brief", contentPlan, { provider: videoProvider }),
      fallbackOutput: mockVideoBrief(contentPlan, videoProvider)
    });
  }

  async generatePublishCopy(contentPlanId: string, platform: TargetPlatform) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    return this.runGeneration({
      purpose: "publish_copy",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      schema: publishCopySchema,
      prompt: await this.promptForPlan("publish_copy", contentPlan, { platform }),
      fallbackOutput: mockPublishCopy(contentPlan, platform)
    });
  }

  async suggestNextContent(digitalHumanId: string) {
    const digitalHuman = await this.requireDigitalHuman(digitalHumanId);
    return this.runGeneration({
      purpose: "next_content",
      digitalHumanId,
      schema: nextContentSchema,
      prompt: await this.promptForHuman("next_content", digitalHuman),
      fallbackOutput: mockNextContent()
    });
  }

  private async runGeneration<T extends SmartAIOutput>(input: {
    purpose: SmartAIPurpose;
    digitalHumanId?: string;
    contentPlanId?: string;
    schema: SmartAISchema<T>;
    prompt: string;
    fallbackOutput: T;
  }) {
    await this.enforceDailyLimit();
    const generation = await this.repository.startGeneration({
      purpose: input.purpose,
      provider: this.provider.provider,
      model: this.provider.model,
      digitalHumanId: input.digitalHumanId,
      contentPlanId: input.contentPlanId,
      inputSummary: summarizePrompt(input.prompt)
    });

    try {
      const result = await this.provider.generate({
        systemPrompt: smartAISystemPrompt,
        userPrompt: input.prompt,
        schema: input.schema,
        fallbackOutput: input.fallbackOutput
      });
      const estimatedCostUsd = estimateCostUsd(result.usage);

      await this.repository.completeGeneration(generation.id, {
        output: result.output,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        estimatedCostUsd
      });
      return result.output;
    } catch (error) {
      await this.repository.failGeneration(generation.id, errorMessage(error));
      throw error;
    }
  }

  private async enforceDailyLimit() {
    const limit = getEnv().smartAIDailyLimit;
    const count = await this.repository.countGenerationsSince(startOfDay(new Date()));

    if (count >= limit) {
      throw new Error(`Smart AI daily limit reached (${limit}).`);
    }
  }

  private async requireDigitalHuman(id: string) {
    const digitalHuman = await this.repository.getDigitalHuman(id);
    if (!digitalHuman || !digitalHuman.persona || digitalHuman.persona.deletedAt) {
      throw new Error("Digital human and active persona are required.");
    }
    return digitalHuman;
  }

  private async requireContentPlan(id: string) {
    const contentPlan = await this.repository.getContentPlan(id);
    if (!contentPlan || !contentPlan.digitalHuman.persona || contentPlan.digitalHuman.persona.deletedAt) {
      throw new Error("Content plan with active digital human persona is required.");
    }
    return contentPlan;
  }

  private async promptForHuman(purpose: SmartAIPurpose, digitalHuman: DigitalHumanContext) {
    return buildSmartAIPrompt({
      purpose,
      digitalHuman,
      historySummary: await this.repository.summarizeHistory(digitalHuman.id)
    });
  }

  private async promptForPlan(
    purpose: SmartAIPurpose,
    contentPlan: ContentPlanContext,
    options: { provider?: string; platform?: string } = {}
  ) {
    return buildSmartAIPrompt({
      purpose,
      digitalHuman: contentPlan.digitalHuman,
      contentPlan,
      provider: options.provider,
      platform: options.platform,
      historySummary: await this.repository.summarizeHistory(contentPlan.digitalHumanId)
    });
  }
}

function mockSingerConcept(digitalHuman: DigitalHumanContext): SingerConceptOutput {
  const persona = digitalHuman.persona;
  return {
    positioning: `${digitalHuman.displayName} is a short-form AI singer built around ${persona?.archetype ?? "a focused creator persona"}.`,
    personaSummary: persona?.backstory ?? "Original AI music persona.",
    musicStyle: persona?.musicStyle ?? "electronic pop",
    audience: persona?.audience ?? "short-video music listeners",
    contentDirection: "Release hook-first songs with clean digital-human visuals and repeatable weekly themes.",
    contentPillars: ["hook-first singles", "digital-human performance", "platform-native captions"]
  };
}

function mockSongIdea(contentPlan: ContentPlanContext): SongIdeaOutput {
  return {
    songTitle: contentPlan.title,
    theme: contentPlan.songIdea.theme,
    lyricsDirection: contentPlan.songIdea.lyricsDirection,
    hook: `Turn ${contentPlan.songIdea.theme} into a repeatable chorus line.`,
    videoScript: contentPlan.songIdea.videoScript,
    targetPlatform: contentPlan.targetPlatform
  };
}

function mockLyrics(contentPlan: ContentPlanContext): LyricsOutput {
  return {
    songTitle: contentPlan.title,
    lyrics: [
      "[Verse]",
      `${titleCase(contentPlan.songIdea.theme)} in the neon light`,
      "I keep the signal burning bright",
      "",
      "[Chorus]",
      `This is the hook for ${contentPlan.title}`,
      "Say it once and let it loop all night"
    ].join("\n"),
    hook: `This is the hook for ${contentPlan.title}`,
    hashtags: contentPlan.hashtags
  };
}

function mockMusicPrompt(contentPlan: ContentPlanContext, provider: string): MusicPromptOutput {
  return {
    songTitle: contentPlan.title,
    lyrics: mockLyrics(contentPlan).lyrics,
    genre: contentPlan.digitalHuman.persona?.musicStyle ?? "pop",
    mood: "confident",
    stylePrompt: `${provider} prompt: clean short-form ${contentPlan.digitalHuman.persona?.musicStyle ?? "pop"}, strong hook, original melody.`,
    hook: `A memorable hook about ${contentPlan.songIdea.theme}.`,
    duration: contentPlan.targetPlatform === "youtube" ? "90 seconds" : "45 seconds",
    songPrompt: `Create an original song for ${contentPlan.digitalHuman.displayName}: ${contentPlan.songIdea.musicPrompt}`,
    hashtags: contentPlan.hashtags
  };
}

function mockVideoBrief(contentPlan: ContentPlanContext, videoProvider: string): VideoBriefOutput {
  return {
    videoBrief: `${videoProvider} digital-human performance for ${contentPlan.title}.`,
    videoTitle: contentPlan.title,
    avatarInstructions: `${contentPlan.digitalHuman.displayName} performs directly to camera with ${contentPlan.digitalHuman.persona?.visualStyle ?? "clean studio"} styling.`,
    cameraStyle: "Vertical 9:16, close-up hook, gentle push-in.",
    lipSyncNotes: "Match mouth movement to the chorus and keep expressions natural.",
    scenePrompt: contentPlan.songIdea.videoScript,
    subtitleText: `${contentPlan.title}\n${contentPlan.songIdea.lyricsDirection}`,
    coverTitle: contentPlan.title
  };
}

function mockPublishCopy(contentPlan: ContentPlanContext, platform: TargetPlatform): PublishCopyOutput {
  const hashtags = contentPlan.hashtags;
  return {
    title: contentPlan.title,
    description: `${contentPlan.caption}\n\n${hashtags.join(" ")}`,
    tiktokCaption: `${contentPlan.caption} ${hashtags.join(" ")}`,
    youtubeShortsTitle: contentPlan.title,
    youtubeShortsDescription: `${contentPlan.caption}\n\n${hashtags.join(" ")}`,
    hashtags: platform === "youtube" ? [...hashtags, "#OriginalMusic"] : hashtags
  };
}

function mockNextContent(): NextContentOutput {
  return {
    recommendations: [
      { theme: "late night reset", rationale: "Strong emotional hook for repeat listening.", targetPlatform: "tiktok" },
      { theme: "future self", rationale: "Works as aspirational short-form storytelling.", targetPlatform: "youtube_shorts" },
      { theme: "quiet confidence", rationale: "Fits digital-human performance branding.", targetPlatform: "youtube" }
    ]
  };
}

function estimateCostUsd(usage?: SmartAIUsage) {
  if (!usage?.totalTokens) return undefined;
  return (usage.totalTokens * 0.000001).toFixed(6);
}

function summarizePrompt(prompt: string) {
  return prompt.slice(0, 1000);
}

function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Smart AI generation failed.";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
