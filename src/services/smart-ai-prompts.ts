import type { SmartAIPurpose } from "@prisma/client";

export const smartAISystemPrompt = [
  "You are Smart AI Singer, the creative brain for Mummur Next MVP.",
  "Generate original AI music and digital-human content concepts.",
  "Do not imitate living artists, copyrighted lyrics, melodies, or brand-owned characters.",
  "Do not request or process uploaded audio/video files.",
  "Return only data that matches the provided structured output schema."
].join(" ");

export function buildSmartAIPrompt(input: {
  purpose: SmartAIPurpose;
  digitalHuman: {
    displayName: string;
    persona?: {
      archetype: string;
      backstory: string;
      toneOfVoice: string;
      audience: string;
      musicStyle: string;
      visualStyle: string;
    } | null;
  };
  contentPlan?: {
    title: string;
    caption: string;
    hashtags: string[];
    targetPlatform: string;
    songIdea: {
      theme: string;
      lyricsDirection: string;
      videoScript: string;
      musicPrompt: string;
    };
  };
  provider?: string;
  platform?: string;
  historySummary?: string;
}) {
  const persona = input.digitalHuman.persona;
  const lines = [
    `Purpose: ${input.purpose}.`,
    `Digital human: ${input.digitalHuman.displayName}.`,
    persona ? `Persona archetype: ${persona.archetype}.` : "Persona archetype: missing.",
    persona ? `Backstory: ${persona.backstory}.` : null,
    persona ? `Tone of voice: ${persona.toneOfVoice}.` : null,
    persona ? `Audience: ${persona.audience}.` : null,
    persona ? `Music style: ${persona.musicStyle}.` : null,
    persona ? `Visual style: ${persona.visualStyle}.` : null,
    input.contentPlan ? `Content title: ${input.contentPlan.title}.` : null,
    input.contentPlan ? `Caption: ${input.contentPlan.caption}.` : null,
    input.contentPlan ? `Hashtags: ${input.contentPlan.hashtags.join(" ")}.` : null,
    input.contentPlan ? `Target platform: ${input.contentPlan.targetPlatform}.` : null,
    input.contentPlan ? `Song theme: ${input.contentPlan.songIdea.theme}.` : null,
    input.contentPlan ? `Lyrics direction: ${input.contentPlan.songIdea.lyricsDirection}.` : null,
    input.contentPlan ? `Video script: ${input.contentPlan.songIdea.videoScript}.` : null,
    input.provider ? `Provider: ${input.provider}.` : null,
    input.platform ? `Publish platform: ${input.platform}.` : null,
    input.historySummary ? `Historical performance summary: ${input.historySummary}.` : "Historical performance summary: no metrics yet.",
    "Optimize for short-form retention, clear hook, and reusable content formats."
  ];

  return lines.filter(Boolean).join("\n");
}
