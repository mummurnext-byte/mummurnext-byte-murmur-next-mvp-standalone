"use client";

import { useEffect } from "react";

import { uiLanguageOptions, type UILanguage } from "@/lib/ui-language";

export function LanguageSwitcher({ currentLanguage }: { currentLanguage: UILanguage }) {
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("mummur_ui_language") as UILanguage | null;
    if (savedLanguage && savedLanguage !== currentLanguage) {
      setUILanguage(savedLanguage);
    }
  }, [currentLanguage]);

  return (
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-300">UI Language</span>
      <select
        defaultValue={currentLanguage}
        onChange={(event) => setUILanguage(event.target.value as UILanguage)}
        className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100"
      >
        {uiLanguageOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function setUILanguage(language: UILanguage) {
  window.localStorage.setItem("mummur_ui_language", language);
  document.cookie = `mummur_ui_language=${language}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
