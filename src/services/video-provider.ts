import type { ContentPlan, DigitalHuman, Persona, PublishAsset, SongIdea } from "@prisma/client";

import {
  getConfiguredLLMProvider,
  withLLMFallback,
  type LLMProviderKey
} from "./llm-provider";
import { toPromptContentPlan } from "./music-provider";

export type VideoProviderKey = "heygen_manual" | "akool_manual" | "did_manual";

export type VideoPromptPackage = {
  providerKey: VideoProviderKey;
  providerName: string;
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
  llmProviderName: string;
  llmUsedFallback: boolean;
  llmError: string | null;
};

export type VideoPromptInput = {
  contentPlan: ContentPlan & {
    digitalHuman: DigitalHuman & { persona: Persona | null };
    songIdea: SongIdea;
  };
  musicAsset: Pick<PublishAsset, "provider" | "metadata">;
  llmProviderKey?: LLMProviderKey | null;
};

export interface VideoProvider {
  readonly providerKey: VideoProviderKey;
  readonly providerName: string;
  buildPrompt(input: VideoPromptInput): Promise<VideoPromptPackage>;
}

export class HeyGenManualProvider implements VideoProvider {
  readonly providerKey = "heygen_manual" as const;
  readonly providerName = "HeyGen";

  async buildPrompt(input: VideoPromptInput): Promise<VideoPromptPackage> {
    return buildLLMVideoBrief(this.providerKey, this.providerName, input);
  }
}

export class AkoolManualProvider implements VideoProvider {
  readonly providerKey = "akool_manual" as const;
  readonly providerName = "Akool";

  async buildPrompt(input: VideoPromptInput): Promise<VideoPromptPackage> {
    return buildLLMVideoBrief(this.providerKey, this.providerName, input);
  }
}

export class DIDManualProvider implements VideoProvider {
  readonly providerKey = "did_manual" as const;
  readonly providerName = "D-ID";

  async buildPrompt(input: VideoPromptInput): Promise<VideoPromptPackage> {
    return buildLLMVideoBrief(this.providerKey, this.providerName, input);
  }
}

export const videoProviders = [
  new HeyGenManualProvider(),
  new AkoolManualProvider(),
  new DIDManualProvider()
] satisfies VideoProvider[];

export function getVideoProvider(providerKey?: string | null): VideoProvider {
  return videoProviders.find((provider) => provider.providerKey === providerKey) ?? videoProviders[0];
}

async function buildLLMVideoBrief(
  providerKey: VideoProviderKey,
  providerName: string,
  input: VideoPromptInput
): Promise<VideoPromptPackage> {
  const contentPlan = toPromptContentPlan(input.contentPlan);
  const generation = await withLLMFallback(
    getConfiguredLLMProvider(input.llmProviderKey),
    (mock) =>
      mock.generateVideoBrief({
        contentPlan,
        providerName,
        musicAssetName: musicAssetFileName(input.musicAsset.metadata)
      }),
    (provider) =>
      provider.generateVideoBrief({
        contentPlan,
        providerName,
        musicAssetName: musicAssetFileName(input.musicAsset.metadata)
      })
  );

  return {
    providerKey,
    providerName,
    ...generation.value,
    llmProviderName: generation.providerName,
    llmUsedFallback: generation.usedFallback,
    llmError: generation.error
  };
}

function musicAssetFileName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const { originalName } = metadata as { originalName?: unknown };
  return typeof originalName === "string" ? originalName : null;
}
