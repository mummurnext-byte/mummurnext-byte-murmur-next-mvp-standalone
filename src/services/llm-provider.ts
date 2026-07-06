import type { TargetPlatform } from "@prisma/client";

import {
  musicPrompt,
  musicPromptJsonSchema,
  publishCopyJsonSchema,
  publishCopyPrompt,
  systemPrompt,
  videoBriefJsonSchema,
  videoBriefPrompt,
  weeklyPlanJsonSchema,
  weeklyPlanPrompt,
  type PromptContentPlan,
  type PromptDigitalHuman,
  type PromptMusicInput,
  type PromptVideoInput
} from "../lib/prompts/llm-prompts";

export type LLMProviderKey = "mock" | "openai";

export type WeeklyPlanItem = {
  theme: string;
  lyricsDirection: string;
  videoScript: string;
  musicPrompt: string;
  title: string;
  caption: string;
  hashtags: string[];
  targetPlatform: TargetPlatform;
};

export type MusicPromptOutput = {
  songTitle: string;
  songPrompt: string;
  lyrics: string;
  stylePrompt: string;
  genre: string;
  mood: string;
  duration: string;
};

export type VideoBriefOutput = {
  videoTitle: string;
  avatarInstructions: string;
  cameraStyle: string;
  lipSyncNotes: string;
  scenePrompt: string;
  subtitleText: string;
  coverTitle: string;
  tiktokCaption: string;
  youtubeShortsTitle: string;
  youtubeShortsDescription: string;
};

export type PublishCopyOutput = {
  title: string;
  description: string;
  tiktokCaption: string;
  youtubeShortsDescription: string;
  hashtags: string[];
};

export type LLMGeneration<T> = {
  value: T;
  providerKey: LLMProviderKey;
  providerName: string;
  usedFallback: boolean;
  error: string | null;
};

export interface LLMProvider {
  readonly providerKey: LLMProviderKey;
  readonly providerName: string;
  generateWeeklyPlan(input: PromptDigitalHuman): Promise<WeeklyPlanItem[]>;
  generateMusicPrompt(input: PromptMusicInput): Promise<MusicPromptOutput>;
  generateVideoBrief(input: PromptVideoInput): Promise<VideoBriefOutput>;
  generatePublishCopy(input: PromptContentPlan): Promise<PublishCopyOutput>;
}

const weeklyThemes = [
  "quiet confidence",
  "late night reset",
  "founder glow up",
  "summer revenge",
  "soft launch romance",
  "city lights",
  "future self"
];

const platforms: TargetPlatform[] = ["tiktok", "youtube_shorts", "youtube"];

export class MockLLMProvider implements LLMProvider {
  readonly providerKey = "mock" as const;
  readonly providerName = "Mock LLM";

  async generateWeeklyPlan(input: PromptDigitalHuman): Promise<WeeklyPlanItem[]> {
    return weeklyThemes.map((theme, index) => {
      const platform = platforms[index % platforms.length];
      const title = `${input.displayName} - ${titleCase(theme)}`;
      const tag = input.displayName.replace(/\s+/g, "");

      return {
        theme,
        lyricsDirection: `Write a concise hook about ${theme} for ${input.persona.audience}.`,
        videoScript: `Open with ${input.displayName} facing camera, cut to a hook moment, close with a reusable short-form loop.`,
        musicPrompt: `${input.persona.musicStyle} song about ${theme}.`,
        title,
        caption: `${title}. Original AI music concept for short-form video.`,
        hashtags: ["#MummurNext", `#${tag}`, "#AIMusic"],
        targetPlatform: platform
      };
    });
  }

  async generateMusicPrompt(input: PromptMusicInput): Promise<MusicPromptOutput> {
    const { contentPlan } = input;
    const style = contentPlan.digitalHuman.persona.musicStyle || "modern vocal pop";
    const genre = inferGenre(style);
    const mood = inferMood(contentPlan.songIdea.theme);

    return {
      songTitle: contentPlan.title,
      songPrompt: [
        `Create an original song for ${contentPlan.digitalHuman.displayName}.`,
        `Theme: ${contentPlan.songIdea.theme}.`,
        `Audience: ${contentPlan.digitalHuman.persona.audience}.`,
        "Use a strong first-line hook. Avoid artist names, soundalikes, and copyrighted melodies."
      ].join(" "),
      lyrics: [
        "[Verse]",
        `${titleCase(contentPlan.songIdea.theme)} in the city light`,
        `${contentPlan.digitalHuman.displayName} keeps the dream in sight`,
        contentPlan.songIdea.lyricsDirection,
        "",
        "[Chorus]",
        `${titleCase(contentPlan.songIdea.theme)}, play it one more time`,
        "Make the hook easy to remember"
      ].join("\n"),
      stylePrompt: [
        style,
        genre,
        mood,
        `${contentPlan.digitalHuman.persona.toneOfVoice} vocal delivery`,
        "clean mix, memorable hook, short-form friendly arrangement"
      ].join(", "),
      genre,
      mood,
      duration: contentPlan.targetPlatform === "youtube" ? "90 seconds" : "45 seconds"
    };
  }

  async generateVideoBrief(input: PromptVideoInput): Promise<VideoBriefOutput> {
    const { contentPlan } = input;
    const hashtags = contentPlan.hashtags.join(" ");

    return {
      videoTitle: contentPlan.title,
      avatarInstructions: `Create a digital-human music video for ${contentPlan.digitalHuman.displayName}. Persona: ${contentPlan.digitalHuman.persona.archetype}.`,
      cameraStyle: "Vertical 9:16 portrait, close-up hook, steady camera, short-form pacing.",
      lipSyncNotes: `Use the uploaded music asset${input.musicAssetName ? ` (${input.musicAssetName})` : ""}. Sync vocal mouth movement to the final audio.`,
      scenePrompt: `${contentPlan.songIdea.videoScript} Mood: ${contentPlan.songIdea.theme}. Avoid brand logos or copyrighted visuals.`,
      subtitleText: [contentPlan.title, contentPlan.songIdea.lyricsDirection, contentPlan.caption].join("\n"),
      coverTitle: contentPlan.title,
      tiktokCaption: `${contentPlan.caption} ${hashtags}`.trim(),
      youtubeShortsTitle: contentPlan.title,
      youtubeShortsDescription: `${contentPlan.caption}\n\n${hashtags}`.trim()
    };
  }

  async generatePublishCopy(input: PromptContentPlan): Promise<PublishCopyOutput> {
    return {
      title: input.title,
      description: input.caption,
      tiktokCaption: `${input.caption} ${input.hashtags.join(" ")}`.trim(),
      youtubeShortsDescription: `${input.caption}\n\n${input.hashtags.join(" ")}`.trim(),
      hashtags: input.hashtags
    };
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly providerKey = "openai" as const;
  readonly providerName = "OpenAI";

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL || "gpt-5.5"
  ) {}

  async generateWeeklyPlan(input: PromptDigitalHuman): Promise<WeeklyPlanItem[]> {
    const response = await this.createStructuredResponse({
      name: "weekly_plan",
      prompt: weeklyPlanPrompt(input),
      schema: weeklyPlanJsonSchema
    });
    return validateWeeklyPlanResponse(response).items;
  }

  async generateMusicPrompt(input: PromptMusicInput): Promise<MusicPromptOutput> {
    return validateMusicPromptOutput(
      await this.createStructuredResponse({
        name: "music_prompt",
        prompt: musicPrompt(input),
        schema: musicPromptJsonSchema
      })
    );
  }

  async generateVideoBrief(input: PromptVideoInput): Promise<VideoBriefOutput> {
    return validateVideoBriefOutput(
      await this.createStructuredResponse({
        name: "video_brief",
        prompt: videoBriefPrompt(input),
        schema: videoBriefJsonSchema
      })
    );
  }

  async generatePublishCopy(input: PromptContentPlan): Promise<PublishCopyOutput> {
    return validatePublishCopyOutput(
      await this.createStructuredResponse({
        name: "publish_copy",
        prompt: publishCopyPrompt(input),
        schema: publishCopyJsonSchema
      })
    );
  }

  private async createStructuredResponse(input: {
    name: string;
    prompt: string;
    schema: unknown;
  }): Promise<unknown> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        store: false,
        input: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: input.prompt }
        ],
        text: {
          format: {
            type: "json_schema",
            name: input.name,
            schema: input.schema,
            strict: true
          }
        }
      })
    });

    if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}.`);

    const payload = await response.json();
    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error("OpenAI response did not include output text.");

    try {
      return JSON.parse(outputText) as unknown;
    } catch {
      throw new Error("OpenAI response was not valid JSON.");
    }
  }
}

export function getConfiguredLLMProvider(providerKey?: string | null): LLMProvider {
  if (providerKey === "mock") return new MockLLMProvider();
  if (providerKey === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider(process.env.OPENAI_API_KEY);
  }
  if (!providerKey && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider(process.env.OPENAI_API_KEY);
  }
  return new MockLLMProvider();
}

export async function withLLMFallback<T>(
  provider: LLMProvider,
  mockGenerate: (mock: MockLLMProvider) => Promise<T>,
  generate: (provider: LLMProvider) => Promise<T>
): Promise<LLMGeneration<T>> {
  if (provider.providerKey === "mock") {
    const mock = provider instanceof MockLLMProvider ? provider : new MockLLMProvider();
    return {
      value: await mockGenerate(mock),
      providerKey: mock.providerKey,
      providerName: mock.providerName,
      usedFallback: false,
      error: null
    };
  }

  try {
    return {
      value: await generate(provider),
      providerKey: provider.providerKey,
      providerName: provider.providerName,
      usedFallback: false,
      error: null
    };
  } catch (error) {
    const mock = new MockLLMProvider();
    return {
      value: await mockGenerate(mock),
      providerKey: mock.providerKey,
      providerName: mock.providerName,
      usedFallback: true,
      error: error instanceof Error ? error.message : "LLM generation failed."
    };
  }
}

export function validateWeeklyPlanResponse(value: unknown): { items: WeeklyPlanItem[] } {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length !== 7) {
    throw new Error("Weekly plan LLM output must include exactly 7 items.");
  }

  return {
    items: value.items.map(validateWeeklyPlanItem)
  };
}

export function validateMusicPromptOutput(value: unknown): MusicPromptOutput {
  const output = requireRecord(value, "Music prompt LLM output must be an object.");
  return {
    songTitle: requireString(output.songTitle, "songTitle"),
    songPrompt: requireString(output.songPrompt, "songPrompt"),
    lyrics: requireString(output.lyrics, "lyrics"),
    stylePrompt: requireString(output.stylePrompt, "stylePrompt"),
    genre: requireString(output.genre, "genre"),
    mood: requireString(output.mood, "mood"),
    duration: requireString(output.duration, "duration")
  };
}

export function validateVideoBriefOutput(value: unknown): VideoBriefOutput {
  const output = requireRecord(value, "Video brief LLM output must be an object.");
  return {
    videoTitle: requireString(output.videoTitle, "videoTitle"),
    avatarInstructions: requireString(output.avatarInstructions, "avatarInstructions"),
    cameraStyle: requireString(output.cameraStyle, "cameraStyle"),
    lipSyncNotes: requireString(output.lipSyncNotes, "lipSyncNotes"),
    scenePrompt: requireString(output.scenePrompt, "scenePrompt"),
    subtitleText: requireString(output.subtitleText, "subtitleText"),
    coverTitle: requireString(output.coverTitle, "coverTitle"),
    tiktokCaption: requireString(output.tiktokCaption, "tiktokCaption"),
    youtubeShortsTitle: requireString(output.youtubeShortsTitle, "youtubeShortsTitle"),
    youtubeShortsDescription: requireString(output.youtubeShortsDescription, "youtubeShortsDescription")
  };
}

export function validatePublishCopyOutput(value: unknown): PublishCopyOutput {
  const output = requireRecord(value, "Publish copy LLM output must be an object.");
  if (!Array.isArray(output.hashtags)) throw new Error("hashtags must be an array.");

  return {
    title: requireString(output.title, "title"),
    description: requireString(output.description, "description"),
    tiktokCaption: requireString(output.tiktokCaption, "tiktokCaption"),
    youtubeShortsDescription: requireString(output.youtubeShortsDescription, "youtubeShortsDescription"),
    hashtags: output.hashtags.map((tag) => requireString(tag, "hashtag"))
  };
}

function validateWeeklyPlanItem(value: unknown): WeeklyPlanItem {
  const item = requireRecord(value, "Weekly plan item must be an object.");
  if (!Array.isArray(item.hashtags)) throw new Error("Weekly plan hashtags must be an array.");
  const targetPlatform = requireString(item.targetPlatform, "targetPlatform");
  if (!isTargetPlatform(targetPlatform)) throw new Error("targetPlatform is invalid.");

  return {
    theme: requireString(item.theme, "theme"),
    lyricsDirection: requireString(item.lyricsDirection, "lyricsDirection"),
    videoScript: requireString(item.videoScript, "videoScript"),
    musicPrompt: requireString(item.musicPrompt, "musicPrompt"),
    title: requireString(item.title, "title"),
    caption: requireString(item.caption, "caption"),
    hashtags: item.hashtags.map((tag) => requireString(tag, "hashtag")),
    targetPlatform
  };
}

function extractOutputText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.output_text === "string") return payload.output_text;
  if (!Array.isArray(payload.output)) return null;

  const parts: string[] = [];
  for (const outputItem of payload.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) continue;
    for (const content of outputItem.content) {
      if (!isRecord(content)) continue;
      if (typeof content.text === "string") parts.push(content.text);
      if (typeof content.output_text === "string") parts.push(content.output_text);
    }
  }

  return parts.length > 0 ? parts.join("") : null;
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(message);
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isTargetPlatform(value: string): value is TargetPlatform {
  return platforms.includes(value as TargetPlatform);
}

function inferGenre(style: string) {
  const normalized = style.toLowerCase();
  if (normalized.includes("hip hop") || normalized.includes("rap")) return "hip hop";
  if (normalized.includes("r&b") || normalized.includes("rnb")) return "R&B";
  if (normalized.includes("edm") || normalized.includes("electronic")) return "electronic pop";
  if (normalized.includes("rock")) return "pop rock";
  if (normalized.includes("lofi") || normalized.includes("lo-fi")) return "lo-fi pop";
  return "pop";
}

function inferMood(theme: string) {
  const normalized = theme.toLowerCase();
  if (normalized.includes("romance")) return "romantic";
  if (normalized.includes("revenge") || normalized.includes("glow")) return "confident";
  if (normalized.includes("late") || normalized.includes("quiet")) return "moody";
  if (normalized.includes("summer")) return "bright";
  return "uplifting";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
