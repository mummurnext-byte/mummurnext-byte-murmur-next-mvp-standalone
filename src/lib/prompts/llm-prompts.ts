import type { TargetPlatform } from "@prisma/client";

export type PromptPersona = {
  archetype: string;
  backstory: string;
  toneOfVoice: string;
  audience: string;
  musicStyle: string;
  visualStyle: string;
};

export type PromptDigitalHuman = {
  displayName: string;
  persona: PromptPersona;
};

export type PromptContentPlan = {
  title: string;
  caption: string;
  hashtags: string[];
  targetPlatform: TargetPlatform;
  songIdea: {
    theme: string;
    lyricsDirection: string;
    videoScript: string;
    musicPrompt: string;
  };
  digitalHuman: PromptDigitalHuman;
};

export type PromptMusicInput = {
  contentPlan: PromptContentPlan;
  providerName: string;
};

export type PromptVideoInput = {
  contentPlan: PromptContentPlan;
  providerName: string;
  musicAssetName?: string | null;
};

export function systemPrompt() {
  return [
    "You generate original AI music and digital-human short-video planning assets for Mummur Next MVP.",
    "Return only valid JSON matching the requested schema.",
    "Do not imitate living artists, copyrighted songs, brand logos, or platform account data.",
    "Use only the text context provided. Do not request or infer uploaded files."
  ].join(" ");
}

export function weeklyPlanPrompt(digitalHuman: PromptDigitalHuman) {
  return [
    `Create exactly 7 daily original song and short-video ideas for ${digitalHuman.displayName}.`,
    `Persona: ${digitalHuman.persona.archetype}.`,
    `Backstory: ${digitalHuman.persona.backstory}.`,
    `Tone: ${digitalHuman.persona.toneOfVoice}.`,
    `Audience: ${digitalHuman.persona.audience}.`,
    `Music style: ${digitalHuman.persona.musicStyle}.`,
    `Visual style: ${digitalHuman.persona.visualStyle}.`,
    "Each item must include theme, lyrics direction, video script, music prompt, publish title, caption, hashtags, and target platform."
  ].join("\n");
}

export function musicPrompt(input: PromptMusicInput) {
  const { contentPlan } = input;
  return [
    `Create a music generation prompt package for ${input.providerName}.`,
    `Digital human: ${contentPlan.digitalHuman.displayName}.`,
    `Persona: ${contentPlan.digitalHuman.persona.archetype}.`,
    `Audience: ${contentPlan.digitalHuman.persona.audience}.`,
    `Tone: ${contentPlan.digitalHuman.persona.toneOfVoice}.`,
    `Theme: ${contentPlan.songIdea.theme}.`,
    `Existing music direction: ${contentPlan.songIdea.musicPrompt}.`,
    `Lyrics direction: ${contentPlan.songIdea.lyricsDirection}.`,
    `Target platform: ${contentPlan.targetPlatform}.`,
    "Make the result safe for manual copy into a music provider."
  ].join("\n");
}

export function videoBriefPrompt(input: PromptVideoInput) {
  const { contentPlan } = input;
  return [
    `Create a digital-human music video production brief for ${input.providerName}.`,
    `Digital human: ${contentPlan.digitalHuman.displayName}.`,
    `Persona: ${contentPlan.digitalHuman.persona.archetype}.`,
    `Visual style: ${contentPlan.digitalHuman.persona.visualStyle}.`,
    `Song theme: ${contentPlan.songIdea.theme}.`,
    `Video script: ${contentPlan.songIdea.videoScript}.`,
    `Caption: ${contentPlan.caption}.`,
    `Hashtags: ${contentPlan.hashtags.join(" ")}.`,
    input.musicAssetName ? `Uploaded audio filename: ${input.musicAssetName}.` : "No uploaded audio filename is available.",
    "Do not request provider login, cookies, account details, or file uploads."
  ].join("\n");
}

export function publishCopyPrompt(contentPlan: PromptContentPlan) {
  return [
    `Create publish copy for ${contentPlan.targetPlatform}.`,
    `Title: ${contentPlan.title}.`,
    `Caption direction: ${contentPlan.caption}.`,
    `Theme: ${contentPlan.songIdea.theme}.`,
    `Audience: ${contentPlan.digitalHuman.persona.audience}.`,
    "Return title, description, TikTok caption, YouTube Shorts description, and hashtags."
  ].join("\n");
}

export const weeklyPlanJsonSchema = {
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
          hashtags: { type: "array", items: { type: "string" } },
          targetPlatform: { type: "string", enum: ["tiktok", "youtube_shorts", "youtube"] }
        }
      }
    }
  }
} as const;

export const musicPromptJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["songTitle", "songPrompt", "lyrics", "stylePrompt", "genre", "mood", "duration"],
  properties: {
    songTitle: { type: "string" },
    songPrompt: { type: "string" },
    lyrics: { type: "string" },
    stylePrompt: { type: "string" },
    genre: { type: "string" },
    mood: { type: "string" },
    duration: { type: "string" }
  }
} as const;

export const videoBriefJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "videoTitle",
    "avatarInstructions",
    "cameraStyle",
    "lipSyncNotes",
    "scenePrompt",
    "subtitleText",
    "coverTitle",
    "tiktokCaption",
    "youtubeShortsTitle",
    "youtubeShortsDescription"
  ],
  properties: {
    videoTitle: { type: "string" },
    avatarInstructions: { type: "string" },
    cameraStyle: { type: "string" },
    lipSyncNotes: { type: "string" },
    scenePrompt: { type: "string" },
    subtitleText: { type: "string" },
    coverTitle: { type: "string" },
    tiktokCaption: { type: "string" },
    youtubeShortsTitle: { type: "string" },
    youtubeShortsDescription: { type: "string" }
  }
} as const;

export const publishCopyJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "tiktokCaption", "youtubeShortsDescription", "hashtags"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tiktokCaption: { type: "string" },
    youtubeShortsDescription: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } }
  }
} as const;
