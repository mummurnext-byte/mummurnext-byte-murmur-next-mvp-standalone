import { cookies, headers } from "next/headers";

import { normalizeUILanguage, type UILanguage } from "@/lib/ui-language";

export async function getRequestUILanguage(): Promise<UILanguage> {
  const cookieStore = await cookies();
  const cookieLanguage = normalizeUILanguage(cookieStore.get("mummur_ui_language")?.value);
  if (cookieLanguage) return cookieLanguage;

  const headerStore = await headers();
  return languageFromAcceptLanguage(headerStore.get("accept-language"));
}

function languageFromAcceptLanguage(value: string | null): UILanguage {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("th")) return "th";
  return "en";
}
