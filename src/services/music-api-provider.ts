import type {
  ContentPlan,
  DigitalHuman,
  MusicApiJobStatus,
  Persona,
  SongIdea
} from "@prisma/client";

import { getMusicProvider } from "./music-provider";

export type MusicApiProviderKey = "mock_music_api";

export type MusicApiProviderConfig = {
  providerKey: MusicApiProviderKey;
  providerName: string;
  mode: "mock" | "official_api";
  usesOfficialApi: boolean;
  storesCredentials: false;
};

export type MusicApiJobInput = {
  contentPlan: ContentPlan & {
    digitalHuman: DigitalHuman & { persona: Persona | null };
    songIdea: SongIdea;
  };
};

export type MusicApiJobResult = {
  status: MusicApiJobStatus;
  generatedAudioUrl: string | null;
  errorMessage: string | null;
  providerConfig: MusicApiProviderConfig;
  requestPayload: Record<string, string | string[]>;
};

export interface MusicApiProvider {
  readonly providerKey: MusicApiProviderKey;
  readonly providerName: string;
  getConfig(): MusicApiProviderConfig;
  createJob(input: MusicApiJobInput): Promise<MusicApiJobResult>;
  retryJob(input: MusicApiJobInput): Promise<MusicApiJobResult>;
}

export class MockMusicApiProvider implements MusicApiProvider {
  readonly providerKey = "mock_music_api" as const;
  readonly providerName = "Mock Music API";

  getConfig(): MusicApiProviderConfig {
    return {
      providerKey: this.providerKey,
      providerName: this.providerName,
      mode: "mock",
      usesOfficialApi: false,
      storesCredentials: false
    };
  }

  async createJob(input: MusicApiJobInput): Promise<MusicApiJobResult> {
    return this.buildCompletedResult(input);
  }

  async retryJob(input: MusicApiJobInput): Promise<MusicApiJobResult> {
    return this.buildCompletedResult(input);
  }

  private buildCompletedResult({ contentPlan }: MusicApiJobInput): MusicApiJobResult {
    const prompt = getMusicProvider("suno_manual").buildPrompt({ contentPlan });
    const safeId = contentPlan.id.replace(/[^a-z0-9-]/gi, "");

    return {
      status: "completed",
      generatedAudioUrl: `https://mock-music-api.local/generated/${safeId}.mp3`,
      errorMessage: null,
      providerConfig: this.getConfig(),
      requestPayload: {
        songTitle: prompt.songTitle,
        songPrompt: prompt.songPrompt,
        lyrics: prompt.lyrics,
        stylePrompt: prompt.stylePrompt,
        genre: prompt.genre,
        mood: prompt.mood,
        duration: prompt.duration,
        hashtags: contentPlan.hashtags
      }
    };
  }
}

export const musicApiProviders = [new MockMusicApiProvider()] satisfies MusicApiProvider[];

export function getMusicApiProvider(providerKey?: string | null): MusicApiProvider {
  return musicApiProviders.find((provider) => provider.providerKey === providerKey) ?? musicApiProviders[0];
}

export function isMusicApiProviderKey(value: string): value is MusicApiProviderKey {
  return musicApiProviders.some((provider) => provider.providerKey === value);
}

export function isRetryableMusicApiStatus(status: MusicApiJobStatus) {
  return status === "failed";
}
