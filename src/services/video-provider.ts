import type { ContentPlan, DigitalHuman, Persona, PublishAsset, SongIdea } from "@prisma/client";

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
};

export type VideoPromptInput = {
  contentPlan: ContentPlan & {
    digitalHuman: DigitalHuman & { persona: Persona | null };
    songIdea: SongIdea;
  };
  musicAsset: Pick<PublishAsset, "provider" | "metadata">;
};

export interface VideoProvider {
  readonly providerKey: VideoProviderKey;
  readonly providerName: string;
  buildPrompt(input: VideoPromptInput): VideoPromptPackage;
}

export class HeyGenManualProvider implements VideoProvider {
  readonly providerKey = "heygen_manual" as const;
  readonly providerName = "HeyGen";

  buildPrompt(input: VideoPromptInput): VideoPromptPackage {
    const base = buildBasePrompt(input);
    return {
      ...base,
      providerKey: this.providerKey,
      providerName: this.providerName,
      avatarInstructions: `${base.avatarInstructions} Use a realistic talking-avatar performance with confident, music-video energy.`,
      cameraStyle: "Medium close-up, gentle push-in, clean studio framing, vertical 9:16 safe area.",
      lipSyncNotes: `${base.lipSyncNotes} Prioritize mouth shape accuracy on the chorus and keep head movement subtle.`
    };
  }
}

export class AkoolManualProvider implements VideoProvider {
  readonly providerKey = "akool_manual" as const;
  readonly providerName = "Akool";

  buildPrompt(input: VideoPromptInput): VideoPromptPackage {
    const base = buildBasePrompt(input);
    return {
      ...base,
      providerKey: this.providerKey,
      providerName: this.providerName,
      avatarInstructions: `${base.avatarInstructions} Use expressive facial animation and a polished creator-video look.`,
      cameraStyle: "Dynamic vertical portrait, light motion, quick hook framing, keep face centered.",
      lipSyncNotes: `${base.lipSyncNotes} Match the uploaded track timing and emphasize expressive chorus delivery.`
    };
  }
}

export class DIDManualProvider implements VideoProvider {
  readonly providerKey = "did_manual" as const;
  readonly providerName = "D-ID";

  buildPrompt(input: VideoPromptInput): VideoPromptPackage {
    const base = buildBasePrompt(input);
    return {
      ...base,
      providerKey: this.providerKey,
      providerName: this.providerName,
      avatarInstructions: `${base.avatarInstructions} Use a natural presenter-style digital human with restrained movement.`,
      cameraStyle: "Stable front-facing portrait, soft lighting, minimal background motion, vertical crop.",
      lipSyncNotes: `${base.lipSyncNotes} Keep lip sync clear and avoid exaggerated facial movement.`
    };
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

function buildBasePrompt({ contentPlan, musicAsset }: VideoPromptInput) {
  const persona = contentPlan.digitalHuman.persona;
  const hashtags = contentPlan.hashtags.join(" ");
  const musicFileName = musicAssetFileName(musicAsset.metadata);
  const visualStyle = persona?.visualStyle ?? "clean short-form studio";

  return {
    videoTitle: contentPlan.title,
    avatarInstructions: [
      `Create a digital-human music video for ${contentPlan.digitalHuman.displayName}.`,
      persona ? `Persona: ${persona.archetype}.` : null,
      `Visual style: ${visualStyle}.`
    ]
      .filter(Boolean)
      .join(" "),
    cameraStyle: "Vertical 9:16 portrait, close-up hook, steady camera, short-form pacing.",
    lipSyncNotes: [
      `Use the uploaded music asset${musicFileName ? ` (${musicFileName})` : ""}.`,
      "Sync vocal mouth movement to the final audio and keep timing aligned to the hook."
    ].join(" "),
    scenePrompt: [
      contentPlan.songIdea.videoScript,
      `Mood: ${contentPlan.songIdea.theme}.`,
      "Keep backgrounds original and avoid brand logos or copyrighted visuals."
    ].join(" "),
    subtitleText: [contentPlan.title, contentPlan.songIdea.lyricsDirection, contentPlan.caption].join(
      "\n"
    ),
    coverTitle: contentPlan.title,
    tiktokCaption: `${contentPlan.caption} ${hashtags}`.trim(),
    youtubeShortsTitle: contentPlan.title,
    youtubeShortsDescription: `${contentPlan.caption}\n\n${hashtags}`.trim()
  };
}

function musicAssetFileName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const { originalName } = metadata as { originalName?: unknown };
  return typeof originalName === "string" ? originalName : null;
}
