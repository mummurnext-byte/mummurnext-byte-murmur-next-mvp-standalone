import OpenAI from "openai";

import { getEnv, type EnvSource } from "@/lib/env";
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
    model = getEnv().openaiModel
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

export function getSmartLLMProvider(source: EnvSource = process.env): LLMProvider {
  const env = getEnv(source);
  return env.openaiApiKey ? new OpenAIProvider(env.openaiApiKey, env.openaiModel) : new MockLLMProvider();
}
