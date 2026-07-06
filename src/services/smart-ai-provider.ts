import OpenAI from "openai";

import { getEnv, type EnvSource } from "@/lib/env";
import type { LanguageSettings } from "@/services/global-language";
import type { SmartAIOutput, SmartAISchema } from "@/services/smart-ai-schemas";

export type SmartAIUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type SmartAIProviderResult<T extends SmartAIOutput> = {
  output: T;
  provider: string;
  model: string;
  usage?: SmartAIUsage;
};

export type SmartAIProviderRequest<T extends SmartAIOutput> = {
  systemPrompt: string;
  userPrompt: string;
  schema: SmartAISchema<T>;
  fallbackOutput: T;
  languageSettings?: LanguageSettings;
};

export interface LLMProvider {
  readonly provider: string;
  readonly model: string;
  generate<T extends SmartAIOutput>(request: SmartAIProviderRequest<T>): Promise<SmartAIProviderResult<T>>;
}

export class MockLLMProvider implements LLMProvider {
  readonly provider = "mock";
  readonly model = "mock-smart-ai-singer";

  async generate<T extends SmartAIOutput>(
    request: SmartAIProviderRequest<T>
  ): Promise<SmartAIProviderResult<T>> {
    return {
      output: request.schema.validate(request.fallbackOutput),
      provider: this.provider,
      model: this.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    };
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly provider = "openai";
  readonly model: string;

  constructor(
    private readonly apiKey: string,
    model = getEnv().llmModel || getEnv().openaiModel
  ) {
    this.model = model;
  }

  async generate<T extends SmartAIOutput>(
    request: SmartAIProviderRequest<T>
  ): Promise<SmartAIProviderResult<T>> {
    const client = new OpenAI({ apiKey: this.apiKey });
    const completion = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: request.schema.name,
          strict: true,
          schema: request.schema.jsonSchema
        }
      }
    });
    const content = completion.choices[0]?.message.content;

    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }

    return {
      output: request.schema.validate(JSON.parse(content)),
      provider: this.provider,
      model: this.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      }
    };
  }
}

export class GeminiProvider implements LLMProvider {
  readonly provider = "gemini";

  constructor(
    private readonly apiKey: string,
    readonly model: string
  ) {}

  async generate<T extends SmartAIOutput>(
    request: SmartAIProviderRequest<T>
  ): Promise<SmartAIProviderResult<T>> {
    const geminiSchema = toGeminiSchema(request.schema.jsonSchema) as Record<string, unknown>;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: providerPrompt(request, geminiSchema) }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: geminiSchema
          }
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const detail = errorBody ? ` ${errorBody.slice(0, 500)}` : "";
      throw new Error(`Gemini request failed with status ${response.status}.${detail}`);
    }

    const body = await response.json();
    const content = readGeminiContent(body);

    return {
      output: request.schema.validate(parseJsonContent(content)),
      provider: this.provider,
      model: this.model,
      usage: readGeminiUsage(body)
    };
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    readonly provider: string,
    private readonly apiKey: string,
    readonly model: string,
    private readonly endpoint: string,
    private readonly extraHeaders: Record<string, string> = {}
  ) {}

  async generate<T extends SmartAIOutput>(
    request: SmartAIProviderRequest<T>
  ): Promise<SmartAIProviderResult<T>> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...this.extraHeaders
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: providerPrompt(request) }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`${this.provider} request failed with status ${response.status}.`);
    }

    const body = await response.json();
    const content = readChatCompletionContent(body);

    return {
      output: request.schema.validate(parseJsonContent(content)),
      provider: this.provider,
      model: this.model,
      usage: readChatCompletionUsage(body)
    };
  }
}

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string) {
    super("groq", apiKey, model, "https://api.groq.com/openai/v1/chat/completions");
  }
}

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string) {
    super("openrouter", apiKey, model, "https://openrouter.ai/api/v1/chat/completions", {
      "HTTP-Referer": getEnv().appBaseUrl,
      "X-Title": "Mummur Next MVP"
    });
  }
}

export function createLLMProvider(source: EnvSource = process.env): LLMProvider {
  const env = getEnv(source);

  if (env.llmProvider === "openai" && env.openaiApiKey) {
    return new OpenAIProvider(env.openaiApiKey, modelOrDefault(env.llmModel, "gpt-5.5"));
  }

  if (env.llmProvider === "gemini" && env.geminiApiKey) {
    return new GeminiProvider(env.geminiApiKey, modelOrDefault(env.llmModel, "gemini-2.5-flash"));
  }

  if (env.llmProvider === "groq" && env.groqApiKey) {
    return new GroqProvider(env.groqApiKey, modelOrDefault(env.llmModel, "llama-3.1-8b-instant"));
  }

  if (env.llmProvider === "openrouter" && env.openrouterApiKey) {
    return new OpenRouterProvider(env.openrouterApiKey, modelOrDefault(env.llmModel, "openai/gpt-4o-mini"));
  }

  return new MockLLMProvider();
}

export function getSmartLLMProvider(source: EnvSource = process.env): LLMProvider {
  return createLLMProvider(source);
}

function providerPrompt<T extends SmartAIOutput>(request: SmartAIProviderRequest<T>, jsonSchema: unknown = request.schema.jsonSchema) {
  return [
    request.userPrompt,
    "",
    `Return only a JSON object that matches this schema named ${request.schema.name}:`,
    JSON.stringify(jsonSchema)
  ].join("\n");
}

function parseJsonContent(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("LLM returned invalid JSON.");
  }
}

function readChatCompletionContent(body: unknown) {
  const record = expectRecord(body, "LLM response");
  const choices = record.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("LLM returned no choices.");
  }

  const choice = expectRecord(choices[0], "LLM choice");
  const message = expectRecord(choice.message, "LLM message");
  const content = message.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("LLM returned an empty response.");
  }

  return content;
}

function readChatCompletionUsage(body: unknown): SmartAIUsage | undefined {
  const record = expectRecord(body, "LLM response");
  const usage = record.usage;

  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return undefined;
  const usageRecord = usage as Record<string, unknown>;

  return {
    promptTokens: readNumber(usageRecord.prompt_tokens),
    completionTokens: readNumber(usageRecord.completion_tokens),
    totalTokens: readNumber(usageRecord.total_tokens)
  };
}

function readGeminiContent(body: unknown) {
  const record = expectRecord(body, "Gemini response");
  const candidates = record.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Gemini returned no candidates.");
  }

  const candidate = expectRecord(candidates[0], "Gemini candidate");
  const content = expectRecord(candidate.content, "Gemini content");
  const parts = content.parts;

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Gemini returned no content parts.");
  }

  const part = expectRecord(parts[0], "Gemini part");
  const text = part.text;

  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

function readGeminiUsage(body: unknown): SmartAIUsage | undefined {
  const record = expectRecord(body, "Gemini response");
  const usage = record.usageMetadata;

  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return undefined;
  const usageRecord = usage as Record<string, unknown>;

  return {
    promptTokens: readNumber(usageRecord.promptTokenCount),
    completionTokens: readNumber(usageRecord.candidatesTokenCount),
    totalTokens: readNumber(usageRecord.totalTokenCount)
  };
}

function expectRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function modelOrDefault(model: string, fallback: string) {
  return model.trim() || fallback;
}

function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(toGeminiSchema);
  }

  if (!schema || typeof schema !== "object") {
    return schema;
  }

  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => key !== "additionalProperties" && key !== "$schema")
      .map(([key, value]) => [key, toGeminiSchema(value)])
  );
}
