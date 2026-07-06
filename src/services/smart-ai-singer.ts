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
import {
  defaultLanguageSettings,
  languageSettingsFromRecord,
  localizedText,
  resolveLanguageSettings,
  type LanguageSettings
} from "@/services/global-language";
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
  languageSettings: LanguageSettings;
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
      data: {
        purpose: input.purpose,
        provider: input.provider,
        model: input.model,
        digitalHumanId: input.digitalHumanId,
        contentPlanId: input.contentPlanId,
        inputLanguage: input.languageSettings.inputLanguage,
        outputLanguage: input.languageSettings.outputLanguage,
        targetMarket: input.languageSettings.targetMarket,
        inputSummary: input.inputSummary
      },
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

  async generateSingerConcept(digitalHumanId: string, languageOverrides: Partial<LanguageSettings> = {}) {
    const digitalHuman = await this.requireDigitalHuman(digitalHumanId);
    const languageSettings = this.languageSettingsForHuman(digitalHuman, languageOverrides);
    const output = await this.runGeneration({
      purpose: "singer_concept",
      digitalHumanId,
      languageSettings,
      schema: singerConceptSchema,
      prompt: await this.promptForHuman("singer_concept", digitalHuman, languageSettings),
      fallbackOutput: mockSingerConcept(digitalHuman, languageSettings)
    });

    await this.repository.upsertSingerProfile(digitalHumanId, output, this.provider.provider);
    return output;
  }

  async generateSongIdea(contentPlanId: string, languageOverrides: Partial<LanguageSettings> = {}) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    const languageSettings = this.languageSettingsForPlan(contentPlan, languageOverrides);
    return this.runGeneration({
      purpose: "song_idea",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      languageSettings,
      schema: songIdeaSchema,
      prompt: await this.promptForPlan("song_idea", contentPlan, languageSettings),
      fallbackOutput: mockSongIdea(contentPlan, languageSettings)
    });
  }

  async generateLyrics(contentPlanId: string, languageOverrides: Partial<LanguageSettings> = {}) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    const languageSettings = this.languageSettingsForPlan(contentPlan, languageOverrides);
    return this.runGeneration({
      purpose: "lyrics",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      languageSettings,
      schema: lyricsSchema,
      prompt: await this.promptForPlan("lyrics", contentPlan, languageSettings),
      fallbackOutput: mockLyrics(contentPlan, languageSettings)
    });
  }

  async generateMusicPrompt(contentPlanId: string, provider: string, languageOverrides: Partial<LanguageSettings> = {}) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    const languageSettings = this.languageSettingsForPlan(contentPlan, languageOverrides);
    return this.runGeneration({
      purpose: "music_prompt",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      languageSettings,
      schema: musicPromptSchema,
      prompt: await this.promptForPlan("music_prompt", contentPlan, languageSettings, { provider }),
      fallbackOutput: mockMusicPrompt(contentPlan, provider, languageSettings)
    });
  }

  async generateVideoBrief(contentPlanId: string, videoProvider: string, languageOverrides: Partial<LanguageSettings> = {}) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    const languageSettings = this.languageSettingsForPlan(contentPlan, languageOverrides);
    return this.runGeneration({
      purpose: "video_brief",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      languageSettings,
      schema: videoBriefSchema,
      prompt: await this.promptForPlan("video_brief", contentPlan, languageSettings, { provider: videoProvider }),
      fallbackOutput: mockVideoBrief(contentPlan, videoProvider, languageSettings)
    });
  }

  async generatePublishCopy(contentPlanId: string, platform: TargetPlatform, languageOverrides: Partial<LanguageSettings> = {}) {
    const contentPlan = await this.requireContentPlan(contentPlanId);
    const languageSettings = this.languageSettingsForPlan(contentPlan, languageOverrides);
    return this.runGeneration({
      purpose: "publish_copy",
      digitalHumanId: contentPlan.digitalHumanId,
      contentPlanId,
      languageSettings,
      schema: publishCopySchema,
      prompt: await this.promptForPlan("publish_copy", contentPlan, languageSettings, { platform }),
      fallbackOutput: mockPublishCopy(contentPlan, platform, languageSettings)
    });
  }

  async suggestNextContent(digitalHumanId: string, languageOverrides: Partial<LanguageSettings> = {}) {
    const digitalHuman = await this.requireDigitalHuman(digitalHumanId);
    const languageSettings = this.languageSettingsForHuman(digitalHuman, languageOverrides);
    return this.runGeneration({
      purpose: "next_content",
      digitalHumanId,
      languageSettings,
      schema: nextContentSchema,
      prompt: await this.promptForHuman("next_content", digitalHuman, languageSettings),
      fallbackOutput: mockNextContent(languageSettings)
    });
  }

  private async runGeneration<T extends SmartAIOutput>(input: {
    purpose: SmartAIPurpose;
    digitalHumanId?: string;
    contentPlanId?: string;
    languageSettings: LanguageSettings;
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
      languageSettings: input.languageSettings,
      inputSummary: summarizePrompt(input.prompt)
    });

    try {
      const result = await this.provider.generate({
        systemPrompt: smartAISystemPrompt,
        userPrompt: input.prompt,
        schema: input.schema,
        fallbackOutput: input.fallbackOutput,
        languageSettings: input.languageSettings
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

  private async promptForHuman(
    purpose: SmartAIPurpose,
    digitalHuman: DigitalHumanContext,
    languageSettings: LanguageSettings
  ) {
    return buildSmartAIPrompt({
      purpose,
      languageSettings,
      digitalHuman,
      historySummary: await this.repository.summarizeHistory(digitalHuman.id)
    });
  }

  private async promptForPlan(
    purpose: SmartAIPurpose,
    contentPlan: ContentPlanContext,
    languageSettings: LanguageSettings,
    options: { provider?: string; platform?: string } = {}
  ) {
    return buildSmartAIPrompt({
      purpose,
      languageSettings,
      digitalHuman: contentPlan.digitalHuman,
      contentPlan,
      provider: options.provider,
      platform: options.platform,
      historySummary: await this.repository.summarizeHistory(contentPlan.digitalHumanId)
    });
  }

  private languageSettingsForHuman(
    digitalHuman: DigitalHumanContext,
    overrides: Partial<LanguageSettings>
  ): LanguageSettings {
    return resolveLanguageSettings(overrides, languageSettingsFromRecord(digitalHuman.persona));
  }

  private languageSettingsForPlan(
    contentPlan: ContentPlanContext,
    overrides: Partial<LanguageSettings>
  ): LanguageSettings {
    return resolveLanguageSettings(
      overrides,
      resolveLanguageSettings(languageSettingsFromRecord(contentPlan), languageSettingsFromRecord(contentPlan.digitalHuman.persona))
    );
  }
}

function mockSingerConcept(digitalHuman: DigitalHumanContext, languageSettings: LanguageSettings): SingerConceptOutput {
  const persona = digitalHuman.persona;
  return {
    positioning: localizedText(
      languageSettings,
      `${digitalHuman.displayName} is a short-form AI singer built around ${persona?.archetype ?? "a focused creator persona"}.`,
      `${digitalHuman.displayName} 是围绕 ${persona?.archetype ?? "清晰创作者人设"} 打造的短视频 AI 歌手。`,
      `${digitalHuman.displayName} คือ AI singer สำหรับวิดีโอสั้นที่สร้างจากคาแรกเตอร์ ${persona?.archetype ?? "ครีเอเตอร์ที่ชัดเจน"}`
    ),
    personaSummary: persona?.backstory ?? "Original AI music persona.",
    musicStyle: persona?.musicStyle ?? "electronic pop",
    audience: persona?.audience ?? "short-video music listeners",
    contentDirection: localizedText(
      languageSettings,
      "Release hook-first songs with clean digital-human visuals and repeatable weekly themes.",
      "发布以副歌钩子为核心的歌曲，搭配清晰数字人视觉和可复用周主题。",
      "ปล่อยเพลงที่มีฮุกชัด พร้อมภาพดิจิทัลฮิวแมนสะอาดตาและธีมรายสัปดาห์ที่นำกลับมาใช้ได้"
    ),
    contentPillars: localizedList(languageSettings, [
      ["hook-first singles", "以钩子为核心的单曲", "เพลงสั้นที่ฮุกมาก่อน"],
      ["digital-human performance", "数字人表演", "การแสดงของดิจิทัลฮิวแมน"],
      ["platform-native captions", "平台原生文案", "แคปชันที่เข้ากับแพลตฟอร์ม"]
    ])
  };
}

function mockSongIdea(contentPlan: ContentPlanContext, languageSettings: LanguageSettings = defaultLanguageSettings): SongIdeaOutput {
  return {
    songTitle: contentPlan.title,
    theme: contentPlan.songIdea.theme,
    lyricsDirection: localizedText(
      languageSettings,
      contentPlan.songIdea.lyricsDirection,
      `围绕 ${contentPlan.songIdea.theme} 写一句适合短视频循环的中文副歌钩子。`,
      `เขียนฮุกภาษาไทยเกี่ยวกับ ${contentPlan.songIdea.theme} ให้จำง่ายและเหมาะกับวิดีโอสั้น`
    ),
    hook: localizedText(
      languageSettings,
      `Turn ${contentPlan.songIdea.theme} into a repeatable chorus line.`,
      `把 ${contentPlan.songIdea.theme} 变成一句能循环传播的副歌。`,
      `เปลี่ยน ${contentPlan.songIdea.theme} ให้เป็นท่อนฮุกที่วนซ้ำแล้วติดหู`
    ),
    videoScript: localizedText(
      languageSettings,
      contentPlan.songIdea.videoScript,
      "开场直视镜头，切到副歌高光，结尾做成可循环短视频。",
      "เปิดด้วยการมองกล้อง ตัดเข้าช่วงฮุก แล้วจบแบบวนลูปได้"
    ),
    targetPlatform: contentPlan.targetPlatform
  };
}

function mockLyrics(contentPlan: ContentPlanContext, languageSettings: LanguageSettings = defaultLanguageSettings): LyricsOutput {
  const lyrics = localizedText(
    languageSettings,
    [
      "[Verse]",
      `${titleCase(contentPlan.songIdea.theme)} in the neon light`,
      "I keep the signal burning bright",
      "",
      "[Chorus]",
      `This is the hook for ${contentPlan.title}`,
      "Say it once and let it loop all night"
    ].join("\n"),
    [
      "[主歌]",
      `${contentPlan.songIdea.theme} 在霓虹里发光`,
      "我把信号稳稳点亮",
      "",
      "[副歌]",
      `${contentPlan.title} 的钩子响起`,
      "唱一次就让它整夜循环"
    ].join("\n"),
    [
      "[Verse]",
      `${contentPlan.songIdea.theme} ใต้แสงนีออน`,
      "ฉันส่งสัญญาณให้ชัดเจน",
      "",
      "[Chorus]",
      `นี่คือฮุกของ ${contentPlan.title}`,
      "ร้องครั้งเดียวแล้วให้มันวนทั้งคืน"
    ].join("\n")
  );
  return {
    songTitle: contentPlan.title,
    lyrics,
    hook: localizedText(
      languageSettings,
      `This is the hook for ${contentPlan.title}`,
      `${contentPlan.title} 的记忆点副歌`,
      `ฮุกจำง่ายของ ${contentPlan.title}`
    ),
    hashtags: contentPlan.hashtags
  };
}

function mockMusicPrompt(
  contentPlan: ContentPlanContext,
  provider: string,
  languageSettings: LanguageSettings = defaultLanguageSettings
): MusicPromptOutput {
  return {
    songTitle: contentPlan.title,
    lyrics: mockLyrics(contentPlan, languageSettings).lyrics,
    genre: contentPlan.digitalHuman.persona?.musicStyle ?? "pop",
    mood: localizedText(languageSettings, "confident", "自信", "มั่นใจ"),
    stylePrompt: localizedText(
      languageSettings,
      `${provider} prompt: clean short-form ${contentPlan.digitalHuman.persona?.musicStyle ?? "pop"}, strong hook, original melody.`,
      `${provider} 提示词：干净短视频 ${contentPlan.digitalHuman.persona?.musicStyle ?? "pop"}，强钩子，原创旋律。`,
      `${provider} prompt: เพลงสั้นสไตล์ ${contentPlan.digitalHuman.persona?.musicStyle ?? "pop"} ฮุกชัด เมโลดี้ต้นฉบับ`
    ),
    hook: localizedText(
      languageSettings,
      `A memorable hook about ${contentPlan.songIdea.theme}.`,
      `关于 ${contentPlan.songIdea.theme} 的高记忆点副歌。`,
      `ฮุกจำง่ายเกี่ยวกับ ${contentPlan.songIdea.theme}`
    ),
    duration: contentPlan.targetPlatform === "youtube" ? "90 seconds" : "45 seconds",
    songPrompt: localizedText(
      languageSettings,
      `Create an original song for ${contentPlan.digitalHuman.displayName}: ${contentPlan.songIdea.musicPrompt}`,
      `为 ${contentPlan.digitalHuman.displayName} 创作一首原创歌曲：${contentPlan.songIdea.musicPrompt}`,
      `สร้างเพลงต้นฉบับให้ ${contentPlan.digitalHuman.displayName}: ${contentPlan.songIdea.musicPrompt}`
    ),
    hashtags: contentPlan.hashtags
  };
}

function mockVideoBrief(
  contentPlan: ContentPlanContext,
  videoProvider: string,
  languageSettings: LanguageSettings = defaultLanguageSettings
): VideoBriefOutput {
  return {
    videoBrief: localizedText(
      languageSettings,
      `${videoProvider} digital-human performance for ${contentPlan.title}.`,
      `${videoProvider} 数字人表演方案：${contentPlan.title}。`,
      `บรีฟวิดีโอดิจิทัลฮิวแมนสำหรับ ${contentPlan.title} บน ${videoProvider}`
    ),
    videoTitle: contentPlan.title,
    avatarInstructions: localizedText(
      languageSettings,
      `${contentPlan.digitalHuman.displayName} performs directly to camera with ${contentPlan.digitalHuman.persona?.visualStyle ?? "clean studio"} styling.`,
      `${contentPlan.digitalHuman.displayName} 以 ${contentPlan.digitalHuman.persona?.visualStyle ?? "干净棚拍"} 风格直视镜头演唱。`,
      `${contentPlan.digitalHuman.displayName} แสดงหน้ากล้องในสไตล์ ${contentPlan.digitalHuman.persona?.visualStyle ?? "สตูดิโอสะอาดตา"}`
    ),
    cameraStyle: localizedText(languageSettings, "Vertical 9:16, close-up hook, gentle push-in.", "竖屏 9:16，副歌近景，轻微推进。", "แนวตั้ง 9:16 โคลสอัปช่วงฮุก กล้องค่อยๆ ดันเข้า"),
    lipSyncNotes: localizedText(languageSettings, "Match mouth movement to the chorus and keep expressions natural.", "口型对齐副歌，表情保持自然。", "ลิปซิงก์ให้ตรงท่อนฮุกและรักษาสีหน้าให้เป็นธรรมชาติ"),
    scenePrompt: contentPlan.songIdea.videoScript,
    subtitleText: `${contentPlan.title}\n${contentPlan.songIdea.lyricsDirection}`,
    coverTitle: contentPlan.title
  };
}

function mockPublishCopy(
  contentPlan: ContentPlanContext,
  platform: TargetPlatform,
  languageSettings: LanguageSettings = defaultLanguageSettings
): PublishCopyOutput {
  const hashtags = contentPlan.hashtags;
  const description = localizedText(
    languageSettings,
    `${contentPlan.caption}\n\n${hashtags.join(" ")}`,
    `${contentPlan.caption}\n\n${hashtags.join(" ")}`,
    `${contentPlan.caption}\n\n${hashtags.join(" ")}`
  );
  return {
    title: contentPlan.title,
    description,
    tiktokCaption: localizedText(
      languageSettings,
      `${contentPlan.caption} ${hashtags.join(" ")}`,
      `${contentPlan.title}。适合短视频循环的原创 AI 音乐。${hashtags.join(" ")}`,
      `${contentPlan.title} เพลง AI ต้นฉบับสำหรับคลิปสั้น ${hashtags.join(" ")}`
    ),
    youtubeShortsTitle: contentPlan.title,
    youtubeShortsDescription: description,
    hashtags: platform === "youtube" ? [...hashtags, "#OriginalMusic"] : hashtags
  };
}

function mockNextContent(languageSettings: LanguageSettings = defaultLanguageSettings): NextContentOutput {
  return {
    recommendations: [
      {
        theme: localizedText(languageSettings, "late night reset", "深夜重启", "รีเซ็ตตอนดึก"),
        rationale: localizedText(languageSettings, "Strong emotional hook for repeat listening.", "情绪钩子强，适合重复播放。", "ฮุกทางอารมณ์ชัด เหมาะกับการฟังซ้ำ"),
        targetPlatform: "tiktok"
      },
      {
        theme: localizedText(languageSettings, "future self", "未来的自己", "ตัวเองในอนาคต"),
        rationale: localizedText(languageSettings, "Works as aspirational short-form storytelling.", "适合做有愿景感的短视频叙事。", "เหมาะกับสตอรี่สั้นเชิงแรงบันดาลใจ"),
        targetPlatform: "youtube_shorts"
      },
      {
        theme: localizedText(languageSettings, "quiet confidence", "安静的自信", "ความมั่นใจแบบเงียบๆ"),
        rationale: localizedText(languageSettings, "Fits digital-human performance branding.", "契合数字人表演品牌。", "เข้ากับแบรนด์การแสดงของดิจิทัลฮิวแมน"),
        targetPlatform: "youtube"
      }
    ]
  };
}

function localizedList(settings: LanguageSettings, rows: [string, string, string][]) {
  return rows.map(([english, chinese, thai]) => localizedText(settings, english, chinese, thai));
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
