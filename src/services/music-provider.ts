import type { ContentPlan, DigitalHuman, Persona, SongIdea } from "@prisma/client";

import {
  getConfiguredLLMProvider,
  withLLMFallback,
  type LLMProviderKey
} from "./llm-provider";

export type MusicProviderKey = "suno_manual" | "makebestmusic_manual";

export type MusicPromptPackage = {
  providerKey: MusicProviderKey;
  providerName: string;
  songTitle: string;
  songPrompt: string;
  lyrics: string;
  stylePrompt: string;
  genre: string;
  mood: string;
  duration: string;
  llmProviderName: string;
  llmUsedFallback: boolean;
  llmError: string | null;
};

export type MusicPromptInput = {
  contentPlan: ContentPlan & {
    digitalHuman: DigitalHuman & { persona: Persona | null };
    songIdea: SongIdea;
  };
  llmProviderKey?: LLMProviderKey | null;
};

export interface MusicProvider {
  readonly providerKey: MusicProviderKey;
  readonly providerName: string;
  buildPrompt(input: MusicPromptInput): Promise<MusicPromptPackage>;
}

export class SunoManualProvider implements MusicProvider {
  readonly providerKey = "suno_manual" as const;
  readonly providerName = "Suno";

  async buildPrompt(input: MusicPromptInput): Promise<MusicPromptPackage> {
    return buildLLMMusicPrompt(this.providerKey, this.providerName, input);
  }
}

export class MakeBestMusicManualProvider implements MusicProvider {
  readonly providerKey = "makebestmusic_manual" as const;
  readonly providerName = "MakeBestMusic";

  async buildPrompt(input: MusicPromptInput): Promise<MusicPromptPackage> {
    return buildLLMMusicPrompt(this.providerKey, this.providerName, input);
  }
}

export const musicProviders = [
  new SunoManualProvider(),
  new MakeBestMusicManualProvider()
] satisfies MusicProvider[];

export function getMusicProvider(providerKey?: string | null): MusicProvider {
  return musicProviders.find((provider) => provider.providerKey === providerKey) ?? musicProviders[0];
}

async function buildLLMMusicPrompt(
  providerKey: MusicProviderKey,
  providerName: string,
  input: MusicPromptInput
): Promise<MusicPromptPackage> {
  const contentPlan = toPromptContentPlan(input.contentPlan);
  const generation = await withLLMFallback(
    getConfiguredLLMProvider(input.llmProviderKey),
    (mock) => mock.generateMusicPrompt({ contentPlan, providerName }),
    (provider) => provider.generateMusicPrompt({ contentPlan, providerName })
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

export function toPromptContentPlan(contentPlan: MusicPromptInput["contentPlan"]) {
  const persona = contentPlan.digitalHuman.persona;
  if (!persona) throw new Error("Digital human persona is required for LLM prompts.");

  return {
    title: contentPlan.title,
    caption: contentPlan.caption,
    hashtags: contentPlan.hashtags,
    targetPlatform: contentPlan.targetPlatform,
    songIdea: {
      theme: contentPlan.songIdea.theme,
      lyricsDirection: contentPlan.songIdea.lyricsDirection,
      videoScript: contentPlan.songIdea.videoScript,
      musicPrompt: contentPlan.songIdea.musicPrompt
    },
    digitalHuman: {
      displayName: contentPlan.digitalHuman.displayName,
      persona: {
        archetype: persona.archetype,
        backstory: persona.backstory,
        toneOfVoice: persona.toneOfVoice,
        audience: persona.audience,
        musicStyle: persona.musicStyle,
        visualStyle: persona.visualStyle
      }
    }
  };
}
