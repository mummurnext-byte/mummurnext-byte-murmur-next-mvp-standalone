import type { TargetPlatform } from "@prisma/client";

import type { WeeklyPlanContext } from "./llm-provider";

export const weeklyPlanThemes = [
  "quiet confidence",
  "late night reset",
  "founder glow up",
  "summer revenge",
  "soft launch romance",
  "city lights",
  "future self"
];

export const weeklyPlanPlatforms: TargetPlatform[] = ["tiktok", "youtube_shorts", "youtube"];

export function buildWeeklyPlanSystemPrompt() {
  return [
    "You write original AI music and short-form video content plans for Mummur Next MVP.",
    "Return exactly seven content plan items.",
    "Keep every idea original. Do not reference real artists, copyrighted songs, or soundalikes.",
    "Use concise social copy that is ready for manual review before publishing."
  ].join(" ");
}

export function buildWeeklyPlanUserPrompt(context: WeeklyPlanContext) {
  const persona = context.digitalHuman.persona;

  return [
    `Digital human: ${context.digitalHuman.displayName}`,
    `Persona archetype: ${persona?.archetype ?? "digital music creator"}`,
    `Backstory: ${persona?.backstory ?? "No backstory provided."}`,
    `Tone of voice: ${persona?.toneOfVoice ?? "direct and warm"}`,
    `Audience: ${persona?.audience ?? "short-video music listeners"}`,
    `Music style: ${persona?.musicStyle ?? "modern pop"}`,
    `Visual style: ${persona?.visualStyle ?? "clean studio portrait"}`,
    `Preferred weekly themes: ${weeklyPlanThemes.join(", ")}`,
    `Target platforms to rotate: ${weeklyPlanPlatforms.join(", ")}`,
    "For each item include theme, lyricsDirection, videoScript, musicPrompt, title, caption, hashtags, and targetPlatform."
  ].join("\n");
}

export function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
