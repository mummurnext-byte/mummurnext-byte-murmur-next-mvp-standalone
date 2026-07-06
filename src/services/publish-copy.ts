import type { MusicPromptInput } from "./music-provider";
import { toPromptContentPlan } from "./music-provider";
import {
  getConfiguredLLMProvider,
  withLLMFallback,
  type LLMProviderKey,
  type PublishCopyOutput
} from "./llm-provider";

export type PublishCopyPackage = PublishCopyOutput & {
  llmProviderName: string;
  llmUsedFallback: boolean;
  llmError: string | null;
};

export async function buildPublishCopyPackage(
  contentPlan: MusicPromptInput["contentPlan"],
  llmProviderKey?: LLMProviderKey | null
): Promise<PublishCopyPackage> {
  const promptContentPlan = toPromptContentPlan(contentPlan);
  const generation = await withLLMFallback(
    getConfiguredLLMProvider(llmProviderKey),
    (mock) => mock.generatePublishCopy(promptContentPlan),
    (provider) => provider.generatePublishCopy(promptContentPlan)
  );

  return {
    ...generation.value,
    llmProviderName: generation.providerName,
    llmUsedFallback: generation.usedFallback,
    llmError: generation.error
  };
}
