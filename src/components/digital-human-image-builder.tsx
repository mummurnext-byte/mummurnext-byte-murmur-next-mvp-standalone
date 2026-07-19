"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Generation = {
  id: string;
  status: "processing" | "completed" | "failed";
  provider: string;
  model: string | null;
  style: string;
  createdAt: string;
  errorMessage: string | null;
  outputFileAssetId: string | null;
};

type Labels = {
  title: string;
  description: string;
  sourcePhoto: string;
  style: string;
  consentConfirmation: string;
  generate: string;
  generating: string;
  activeConsentRequired: string;
  generationHistory: string;
};

export function DigitalHumanImageBuilder({
  digitalHumanId,
  avatarUrl,
  hasActiveConsent,
  generations,
  provider,
  labels
}: {
  digitalHumanId: string;
  avatarUrl: string | null;
  hasActiveConsent: boolean;
  generations: Generation[];
  provider: { name: string; model: string; sendsImageExternally: boolean };
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/digital-humans/${digitalHumanId}/generate-image`, {
        method: "POST",
        body: new FormData(form)
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Digital human image generation failed.");

      form.reset();
      setMessage({ ok: true, text: "Digital human image generated and saved." });
      router.refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Digital human image generation failed." });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-md border border-zinc-800 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{labels.title}</h3>
          <p className="mt-1 text-xs text-zinc-400">{labels.description}</p>
        </div>
        <span className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
          {provider.name} / {provider.model}
        </span>
      </div>

      {avatarUrl ? (
        <div className="mt-3 aspect-square w-full max-w-64 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
          <Image src={avatarUrl} alt="Generated digital human avatar" width={512} height={512} unoptimized className="h-full w-full object-cover" />
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm text-zinc-300">
          {labels.sourcePhoto}
          <input
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            required
            disabled={!hasActiveConsent || pending}
            className="min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-100"
          />
        </label>
        <label className="grid gap-1 text-sm text-zinc-300">
          {labels.style}
          <select name="style" disabled={!hasActiveConsent || pending} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2">
            <option value="studio">Studio</option>
            <option value="music_artist">Music Artist</option>
            <option value="cinematic">Cinematic</option>
            <option value="futuristic">Futuristic</option>
          </select>
        </label>
        <label className="flex items-start gap-2 text-xs text-zinc-300">
          <input type="checkbox" name="consentConfirmed" required disabled={!hasActiveConsent || pending} className="mt-0.5" />
          <span>{labels.consentConfirmation}</span>
        </label>
        {!hasActiveConsent ? <p className="text-xs text-amber-300">{labels.activeConsentRequired}</p> : null}
        <button
          type="submit"
          disabled={!hasActiveConsent || pending}
          className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? labels.generating : labels.generate}
        </button>
        <p className="text-xs text-zinc-500">
          {provider.sendsImageExternally
            ? `The authorized portrait is sent to ${provider.name} only for this generation.`
            : "Local Preview does not send the portrait to an external image service."}
        </p>
        {message ? <p className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p> : null}
      </form>

      {generations.length > 0 ? (
        <div className="mt-5 border-t border-zinc-800 pt-4">
          <div className="text-xs font-medium uppercase text-zinc-500">{labels.generationHistory}</div>
          <ul className="mt-2 grid gap-2">
            {generations.map((generation) => (
              <li key={generation.id} className="flex items-center gap-3 rounded-md bg-zinc-900 p-2 text-xs text-zinc-300">
                {generation.outputFileAssetId ? (
                  <Image
                    src={`/api/digital-human-images/${generation.outputFileAssetId}`}
                    alt="Generated digital human"
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <div>{generation.status} / {generation.provider} / {generation.style}</div>
                  <div className="mt-1 text-zinc-500">{generation.createdAt}</div>
                  {generation.errorMessage ? <div className="mt-1 text-red-300">{generation.errorMessage}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
