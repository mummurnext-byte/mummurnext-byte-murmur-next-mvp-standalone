import type {
  ContentPlan,
  DigitalHuman,
  Persona,
  PublishAsset,
  SongIdea,
  VideoApiJobStatus
} from "@prisma/client";

import { getVideoProvider } from "./video-provider";

export type VideoApiProviderKey = "mock_video_api";

export type VideoApiProviderConfig = {
  providerKey: VideoApiProviderKey;
  providerName: string;
  mode: "mock" | "official_api";
  usesOfficialApi: boolean;
  storesCredentials: false;
};

export type VideoApiJobInput = {
  contentPlan: ContentPlan & {
    digitalHuman: DigitalHuman & { persona: Persona | null };
    songIdea: SongIdea;
  };
  musicAsset: Pick<PublishAsset, "id" | "provider" | "metadata">;
};

export type VideoApiJobResult = {
  status: VideoApiJobStatus;
  generatedVideoUrl: string | null;
  errorMessage: string | null;
  providerConfig: VideoApiProviderConfig;
  requestPayload: Record<string, string | null>;
};

export interface VideoApiProvider {
  readonly providerKey: VideoApiProviderKey;
  readonly providerName: string;
  getConfig(): VideoApiProviderConfig;
  createJob(input: VideoApiJobInput): Promise<VideoApiJobResult>;
  retryJob(input: VideoApiJobInput): Promise<VideoApiJobResult>;
}

export class MockVideoApiProvider implements VideoApiProvider {
  readonly providerKey = "mock_video_api" as const;
  readonly providerName = "Mock Video API";

  getConfig(): VideoApiProviderConfig {
    return {
      providerKey: this.providerKey,
      providerName: this.providerName,
      mode: "mock",
      usesOfficialApi: false,
      storesCredentials: false
    };
  }

  async createJob(input: VideoApiJobInput): Promise<VideoApiJobResult> {
    return this.buildCompletedResult(input);
  }

  async retryJob(input: VideoApiJobInput): Promise<VideoApiJobResult> {
    return this.buildCompletedResult(input);
  }

  private buildCompletedResult(input: VideoApiJobInput): VideoApiJobResult {
    const prompt = getVideoProvider("heygen_manual").buildPrompt(input);
    const safeId = input.contentPlan.id.replace(/[^a-z0-9-]/gi, "");

    return {
      status: "completed",
      generatedVideoUrl: `https://mock-video-api.local/generated/${safeId}.mp4`,
      errorMessage: null,
      providerConfig: this.getConfig(),
      requestPayload: {
        videoTitle: prompt.videoTitle,
        avatarInstructions: prompt.avatarInstructions,
        cameraStyle: prompt.cameraStyle,
        lipSyncNotes: prompt.lipSyncNotes,
        scenePrompt: prompt.scenePrompt,
        subtitleText: prompt.subtitleText,
        coverTitle: prompt.coverTitle,
        tiktokCaption: prompt.tiktokCaption,
        youtubeShortsTitle: prompt.youtubeShortsTitle,
        youtubeShortsDescription: prompt.youtubeShortsDescription,
        sourceMusicAssetId: input.musicAsset.id
      }
    };
  }
}

export const videoApiProviders = [new MockVideoApiProvider()] satisfies VideoApiProvider[];

export function getVideoApiProvider(providerKey?: string | null): VideoApiProvider {
  return videoApiProviders.find((provider) => provider.providerKey === providerKey) ?? videoApiProviders[0];
}

export function isVideoApiProviderKey(value: string): value is VideoApiProviderKey {
  return videoApiProviders.some((provider) => provider.providerKey === value);
}

export function isRetryableVideoApiStatus(status: VideoApiJobStatus) {
  return status === "failed";
}
