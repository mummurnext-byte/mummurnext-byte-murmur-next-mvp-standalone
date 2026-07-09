export const inputLanguageOptions = [
  { key: "auto", label: "Auto Detect" },
  { key: "en", label: "English" },
  { key: "zh-CN", label: "简体中文" },
  { key: "th", label: "ไทย" }
] as const;

export const outputLanguageOptions = [
  { key: "en", label: "English" },
  { key: "zh-CN", label: "简体中文" },
  { key: "th", label: "ไทย" }
] as const;

export const targetMarketOptions = [
  { key: "global", label: "Global" },
  { key: "us", label: "United States" },
  { key: "china", label: "China" },
  { key: "thailand", label: "Thailand" },
  { key: "japan", label: "Japan" },
  { key: "korea", label: "Korea" },
  { key: "spain", label: "Spain" },
  { key: "france", label: "France" },
  { key: "germany", label: "Germany" }
] as const;

export type InputLanguage = (typeof inputLanguageOptions)[number]["key"];
export type OutputLanguage = (typeof outputLanguageOptions)[number]["key"];
export type TargetMarket = (typeof targetMarketOptions)[number]["key"];

export type LanguageSettings = {
  inputLanguage: InputLanguage;
  outputLanguage: OutputLanguage;
  targetMarket: TargetMarket;
};

export const defaultLanguageSettings: LanguageSettings = {
  inputLanguage: "auto",
  outputLanguage: "en",
  targetMarket: "global"
};

export function normalizeInputLanguage(value: unknown): InputLanguage {
  return inputLanguageOptions.some((option) => option.key === value)
    ? (value as InputLanguage)
    : defaultLanguageSettings.inputLanguage;
}

export function normalizeOutputLanguage(value: unknown): OutputLanguage {
  return outputLanguageOptions.some((option) => option.key === value)
    ? (value as OutputLanguage)
    : defaultLanguageSettings.outputLanguage;
}

export function normalizeTargetMarket(value: unknown): TargetMarket {
  return targetMarketOptions.some((option) => option.key === value)
    ? (value as TargetMarket)
    : defaultLanguageSettings.targetMarket;
}

export function resolveLanguageSettings(
  input: Partial<LanguageSettings> = {},
  defaults: Partial<LanguageSettings> = {}
): LanguageSettings {
  return {
    inputLanguage: normalizeInputLanguage(input.inputLanguage ?? defaults.inputLanguage),
    outputLanguage: normalizeOutputLanguage(input.outputLanguage ?? defaults.outputLanguage),
    targetMarket: normalizeTargetMarket(input.targetMarket ?? defaults.targetMarket)
  };
}

export function languageSettingsFromRecord(
  record?: {
    inputLanguage?: string | null;
    outputLanguage?: string | null;
    targetMarket?: string | null;
  } | null
) {
  return {
    inputLanguage: normalizeInputLanguage(record?.inputLanguage),
    outputLanguage: normalizeOutputLanguage(record?.outputLanguage),
    targetMarket: normalizeTargetMarket(record?.targetMarket)
  };
}

export function languageSettingsFromForm(formData: FormData) {
  return {
    inputLanguage: normalizeInputLanguage(formData.get("inputLanguage")?.toString()),
    outputLanguage: normalizeOutputLanguage(formData.get("outputLanguage")?.toString()),
    targetMarket: normalizeTargetMarket(formData.get("targetMarket")?.toString())
  };
}

export function languageInstruction(settings: LanguageSettings) {
  return [
    "You may receive input in any language.",
    `Input language: ${languageName(settings.inputLanguage)} (${settings.inputLanguage}). Use it only to understand the source material.`,
    `Output language: ${languageName(settings.outputLanguage)} (${settings.outputLanguage}). Generate the final result entirely in ${languageName(settings.outputLanguage)}.`,
    `Target market: ${marketName(settings.targetMarket)} (${settings.targetMarket}).`,
    marketInstruction(settings.targetMarket),
    "Adapt style, cultural tone, hooks, hashtags, and platform copy for the target market.",
    "Do not mix languages unless explicitly requested by the user."
  ].join("\n");
}

export function languageName(language: InputLanguage | OutputLanguage) {
  const names: Record<InputLanguage | OutputLanguage, string> = {
    auto: "Auto Detect",
    en: "English",
    "zh-CN": "Simplified Chinese",
    th: "Thai"
  };
  return names[language];
}

export function marketName(market: TargetMarket) {
  return targetMarketOptions.find((option) => option.key === market)?.label ?? "Global";
}

export function marketInstruction(market: TargetMarket) {
  const instructions: Record<TargetMarket, string> = {
    global: "Use globally understandable pop culture references and avoid region-specific slang.",
    us: "Use United States localization: direct hooks, creator economy language, concise TikTok and YouTube phrasing, and US-friendly hashtags.",
    china: "Use China localization: polished short-video language, music hooks that fit Douyin-style pacing, and culturally natural Chinese phrasing.",
    thailand: "Use Thailand localization: warm Thai social tone, catchy TikTok-friendly hooks, Thai music audience preferences, and locally natural hashtags.",
    japan: "Use Japan localization: concise emotional phrasing, polished pop aesthetics, and culturally respectful audience language.",
    korea: "Use Korea localization: modern pop sensibility, trend-aware short-video phrasing, and fandom-friendly tone.",
    spain: "Use Spain localization: natural Spanish-market phrasing, energetic hooks, and platform copy suited to Spain audiences.",
    france: "Use France localization: stylish, concise phrasing with culturally natural music and short-video language.",
    germany: "Use Germany localization: clear, credible phrasing with direct hooks and platform copy suited to German audiences."
  };
  return instructions[market];
}

export function localizedText(settings: LanguageSettings, english: string, chinese: string, thai: string) {
  if (settings.outputLanguage === "zh-CN") return chinese;
  if (settings.outputLanguage === "th") return thai;
  return english;
}
