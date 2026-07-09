export const uiLanguageOptions = [
  { key: "en", label: "English" },
  { key: "zh-CN", label: "简体中文" },
  { key: "th", label: "ไทย" }
] as const;

export type UILanguage = (typeof uiLanguageOptions)[number]["key"];

export function normalizeUILanguage(value: unknown): UILanguage | null {
  return uiLanguageOptions.some((option) => option.key === value) ? (value as UILanguage) : null;
}
