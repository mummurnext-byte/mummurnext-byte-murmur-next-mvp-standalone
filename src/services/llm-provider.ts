import type { DigitalHuman, Persona, TargetPlatform } from "@prisma/client";

import {
  buildWeeklyPlanSystemPrompt,
  buildWeeklyPlanUserPrompt,
  titleCase,
  weeklyPlanPlatforms,
  weeklyPlanThemes
} from "./prompt-templates";

export type LLMProviderKey = "mock" | "openai";

export type WeeklyPlanContext = {
  digitalHuman: DigitalHuman & { persona: Persona | null };
};

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

export interface LLMProvider {
  readonly providerKey: LLMProviderKey;
  readonly providerName: string;
  generateWeeklyPlan(context: WeeklyPlanContext): Promise<WeeklyPlanItem[]>;
}

export class MockLLMProvider implements LLMProvider {
  readonly providerKey = "mock" as const;
  readonly providerName = "Mock";

  async generateWeeklyPlan({ digitalHuman }: WeeklyPlanContext): Promise<WeeklyPlanItem[]> {
    return weeklyPlanThemes.map((theme, index) => {
      const platform = weeklyPlanPlatforms[index % weeklyPlanPlatforms.length];
      const title = `${digitalHuman.displayName} - ${titleCase(theme)}`;
      const tag = digitalHuman.displayName.replace(/\s+/g, "");

      return {
        theme,
        lyricsDirection: `Write a concise hook about ${theme} for ${digitalHuman.persona?.audience}.`,
        videoScript: `Open with ${digitalHuman.displayName} facing camera, cut to a hook moment, close with a reusable short-form loop.`,
        musicPrompt: `${digitalHuman.persona?.musicStyle ?? "modern pop"} song about ${theme}.`,
        title,
        caption: `${title}. Original AI music concept for short-form video.`,
        hashtags: ["#MummurNext", `#${tag}`, "#AIMusic"],
        targetPlatform: platform
      };
    });
  }
}

type FetchLike = typeof fetch;

export class OpenAIProvider implements LLMProvider {
  readonly providerKey = "openai" as const;
  readonly providerName = "OpenAI";

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch
  ) {}

  async generateWeeklyPlan(context: WeeklyPlanContext): Promise<WeeklyPlanItem[]> {
    const response = await this.fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: buildWeeklyPlanSystemPrompt() }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: buildWeeklyPlanUserPrompt(context) }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "weekly_content_plan",
            strict: true,
            schema: weeklyPlanSchema
          }
        },
        max_output_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI weekly plan generation failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as OpenAIResponsePayload;
    const parsed = JSON.parse(extractOutputText(payload)) as { items: WeeklyPlanItem[] };
    return validateWeeklyPlanItems(parsed.items);
  }
}

export const llmProviderOptions = [
  { providerKey: "mock", providerName: "Mock" },
  { providerKey: "openai", providerName: "OpenAI" }
] satisfies Array<Pick<LLMProvider, "providerKey" | "providerName">>;

export function getLLMProvider(providerKey?: string | null): LLMProvider {
  if (providerKey === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (apiKey) return new OpenAIProvider(apiKey);
  }

  return new MockLLMProvider();
}

export function isLLMProviderKey(value: string): value is LLMProviderKey {
  return llmProviderOptions.some((provider) => provider.providerKey === value);
}

const weeklyPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "theme",
          "lyricsDirection",
          "videoScript",
          "musicPrompt",
          "title",
          "caption",
          "hashtags",
          "targetPlatform"
        ],
        properties: {
          theme: { type: "string" },
          lyricsDirection: { type: "string" },
          videoScript: { type: "string" },
          musicPrompt: { type: "string" },
          title: { type: "string" },
          caption: { type: "string" },
          hashtags: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: { type: "string" }
          },
          targetPlatform: { type: "string", enum: weeklyPlanPlatforms }
        }
      }
    }
  }
} as const;

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractOutputText(payload: OpenAIResponsePayload) {
  if (payload.output_text) return payload.output_text;

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && typeof content.text === "string")?.text;

  if (!text) throw new Error("OpenAI response did not include output text.");
  return text;
}

function validateWeeklyPlanItems(items: WeeklyPlanItem[]) {
  if (!Array.isArray(items) || items.length !== 7) {
    throw new Error("Weekly plan provider must return exactly 7 items.");
  }

  return items.map((item) => {
    if (!weeklyPlanPlatforms.includes(item.targetPlatform)) {
      throw new Error("Weekly plan provider returned an unsupported target platform.");
    }

    return {
      ...item,
      hashtags: normalizeHashtags(item.hashtags)
    };
  });
}

function normalizeHashtags(hashtags: string[]) {
  return hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}
