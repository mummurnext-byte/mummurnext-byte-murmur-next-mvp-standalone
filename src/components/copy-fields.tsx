"use client";

import { useState } from "react";

export function CopyFields({
  title,
  description,
  fields
}: {
  title: string;
  description: string;
  fields: { key: string; label: string; value: string }[];
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const allText = fields.map((field) => `${field.label}:\n${field.value}`).join("\n\n");

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1200);
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => copy("all", allText)}
          className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-100"
        >
          {copiedKey === "all" ? "Copied" : "Copy all"}
        </button>
      </div>
      <div className="grid gap-3">
        {fields.map((field) => (
          <div key={field.key} className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase text-zinc-500">{field.label}</div>
              <button
                type="button"
                onClick={() => copy(field.key, field.value)}
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
              >
                {copiedKey === field.key ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{field.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
