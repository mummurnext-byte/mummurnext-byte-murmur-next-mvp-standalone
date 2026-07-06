import type { ContentPlan, DigitalHuman, Persona, SongIdea, TargetPlatform } from "@prisma/client";

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
};

export type MusicPromptInput = {
  contentPlan: ContentPlan & {
    digitalHuman: DigitalHuman & { persona: Persona | null };
    songIdea: SongIdea;
  };
};

export interface MusicProvider {
  readonly providerKey: MusicProviderKey;
  readonly providerName: string;
  buildPrompt(input: MusicPromptInput): MusicPromptPackage;
}

export class SunoManualProvider implements MusicProvider {
  readonly providerKey = "suno_manual" as const;
  readonly providerName = "Suno";

  buildPrompt({ contentPlan }: MusicPromptInput): MusicPromptPackage {
    const style = contentPlan.digitalHuman.persona?.musicStyle ?? "modern vocal pop";
    const genre = inferGenre(style);
    const mood = inferMood(contentPlan.songIdea.theme);

    return {
      providerKey: this.providerKey,
      providerName: this.providerName,
      songTitle: contentPlan.title,
      songPrompt: [
        buildSongPrompt(contentPlan),
        "Use a strong first-line hook and a chorus that works in short-form clips.",
        "Avoid artist names, copyrighted melodies, and direct soundalikes."
      ].join(" "),
      lyrics: buildLyrics(contentPlan),
      stylePrompt: [
        style,
        genre,
        mood,
        contentPlan.digitalHuman.persona?.toneOfVoice
          ? `${contentPlan.digitalHuman.persona.toneOfVoice} vocal delivery`
          : null,
        "clean mix, memorable hook, short-form friendly arrangement"
      ]
        .filter(Boolean)
        .join(", "),
      genre,
      mood,
      duration: suggestedDuration(contentPlan.targetPlatform)
    };
  }
}

export class MakeBestMusicManualProvider implements MusicProvider {
  readonly providerKey = "makebestmusic_manual" as const;
  readonly providerName = "MakeBestMusic";

  buildPrompt({ contentPlan }: MusicPromptInput): MusicPromptPackage {
    const persona = contentPlan.digitalHuman.persona;
    const style = persona?.musicStyle ?? "modern vocal pop";
    const genre = inferGenre(style);
    const mood = inferMood(contentPlan.songIdea.theme);

    return {
      providerKey: this.providerKey,
      providerName: this.providerName,
      songTitle: contentPlan.title,
      songPrompt: buildSongPrompt(contentPlan),
      lyrics: buildLyrics(contentPlan),
      stylePrompt: [
        contentPlan.songIdea.musicPrompt,
        `Vocal identity: ${contentPlan.digitalHuman.displayName}.`,
        persona ? `Tone: ${persona.toneOfVoice}.` : null,
        persona ? `Audience: ${persona.audience}.` : null,
        "Original AI music for short-form video. Clean mix, strong hook, no copyrighted melodies."
      ]
        .filter(Boolean)
        .join(" "),
      genre,
      mood,
      duration: suggestedDuration(contentPlan.targetPlatform)
    };
  }
}

export const musicProviders = [
  new SunoManualProvider(),
  new MakeBestMusicManualProvider()
] satisfies MusicProvider[];

export function getMusicProvider(providerKey?: string | null): MusicProvider {
  return musicProviders.find((provider) => provider.providerKey === providerKey) ?? musicProviders[0];
}

function buildSongPrompt(contentPlan: MusicPromptInput["contentPlan"]) {
  const persona = contentPlan.digitalHuman.persona;

  return [
    `Create an original song for ${contentPlan.digitalHuman.displayName}.`,
    `Theme: ${contentPlan.songIdea.theme}.`,
    `Title direction: ${contentPlan.title}.`,
    persona ? `Persona: ${persona.archetype}.` : null,
    persona ? `Audience: ${persona.audience}.` : null
  ]
    .filter(Boolean)
    .join(" ");
}

function buildLyrics(contentPlan: MusicPromptInput["contentPlan"]) {
  const theme = titleCase(contentPlan.songIdea.theme);
  const name = contentPlan.digitalHuman.displayName;

  return [
    "[Verse]",
    `${theme} in the city light`,
    `${name} keeps the dream in sight`,
    contentPlan.songIdea.lyricsDirection,
    "",
    "[Pre-Chorus]",
    "Turn the quiet into gold",
    "Let the story be told",
    "",
    "[Chorus]",
    `${theme}, play it one more time`,
    "Make the hook easy to remember",
    "Keep it clean, emotional, and short-form ready"
  ].join("\n");
}

function suggestedDuration(platform: TargetPlatform) {
  return platform === "youtube" ? "90 seconds" : "45 seconds";
}

function inferGenre(style: string) {
  const normalized = style.toLowerCase();

  if (normalized.includes("hip hop") || normalized.includes("rap")) return "hip hop";
  if (normalized.includes("r&b") || normalized.includes("rnb")) return "R&B";
  if (normalized.includes("edm") || normalized.includes("electronic")) return "electronic pop";
  if (normalized.includes("rock")) return "pop rock";
  if (normalized.includes("lofi") || normalized.includes("lo-fi")) return "lo-fi pop";

  return "pop";
}

function inferMood(theme: string) {
  const normalized = theme.toLowerCase();

  if (normalized.includes("romance")) return "romantic";
  if (normalized.includes("revenge") || normalized.includes("glow")) return "confident";
  if (normalized.includes("late") || normalized.includes("quiet")) return "moody";
  if (normalized.includes("summer")) return "bright";

  return "uplifting";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
