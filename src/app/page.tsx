import type { ContentStatus } from "@prisma/client";
import Link from "next/link";

import {
  addConsentRecordAction,
  createDigitalHumanAction,
  generateWeeklyPlanAction,
  updateContentPlanCopyAction,
  updateContentPlanStatusAction,
  updateDigitalHumanAction,
  uploadMusicAssetAction,
  uploadVideoAssetAction
} from "@/app/actions";
import { CopyFields } from "@/components/copy-fields";
import { prisma } from "@/lib/prisma";
import type { LLMProviderKey } from "@/services/llm-provider";
import { getMusicProvider, musicProviders } from "@/services/music-provider";
import { buildPublishCopyPackage } from "@/services/publish-copy";
import { getVideoProvider, videoProviders } from "@/services/video-provider";

export const dynamic = "force-dynamic";

const statuses: ContentStatus[] = ["idea", "lyrics", "music_generated", "video_ready", "published"];

type SelectedPlan = Awaited<ReturnType<typeof loadSelectedPlan>>;

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{
    digitalHumanId?: string;
    planId?: string;
    musicProvider?: string;
    videoProvider?: string;
    llmProvider?: string;
    llmError?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedLLMProvider = llmProviderFromParam(params?.llmProvider);
  const [digitalHumans, contentPlans, selectedHuman, selectedPlan] = await Promise.all([
    prisma.digitalHuman.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { persona: true, consentRecords: { where: { deletedAt: null }, take: 5 } }
    }),
    loadContentPlans(),
    params?.digitalHumanId ? loadSelectedHuman(params.digitalHumanId) : null,
    params?.planId ? loadSelectedPlan(params.planId) : null
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Mummur Next MVP</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Standalone AI digital-human music content system. No Back Office modules, no platform
            automation, no cookies or tokens. OpenAI is optional and falls back to Mock LLM.
          </p>
          {params?.llmError ? <LLMNotice error={params.llmError} providerName="Mock LLM" /> : null}
        </header>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="space-y-4">
            <Panel title="Create Digital Human">
              <form action={createDigitalHumanAction} className="grid gap-3">
                <Input label="Display name" name="displayName" required />
                <Input label="Legal name" name="legalName" />
                <Input label="Avatar URL" name="avatarUrl" />
                <Input label="Voice sample URL" name="voiceSampleUrl" />
                <Textarea label="Notes" name="notes" />
                <Input label="Archetype" name="archetype" defaultValue="founder artist" required />
                <Textarea label="Backstory" name="backstory" defaultValue="A digital human built for original AI music." required />
                <Input label="Tone of voice" name="toneOfVoice" defaultValue="direct and warm" required />
                <Input label="Audience" name="audience" defaultValue="short-video music listeners" required />
                <Input label="Music style" name="musicStyle" defaultValue="electronic pop" required />
                <Input label="Visual style" name="visualStyle" defaultValue="clean studio portrait" required />
                <Input label="Consented name" name="consentedName" />
                <Input label="Consent document URL" name="documentUrl" />
                <Input label="Consent scope" name="scope" defaultValue="AI music and digital-human video" />
                <Input label="Signed at" name="signedAt" type="date" />
                <Input label="Expires at" name="expiresAt" type="date" />
                <Submit>Create</Submit>
              </form>
            </Panel>

            <Panel title="Digital Humans">
              <div className="grid gap-2">
                {digitalHumans.length === 0 ? (
                  <p className="text-sm text-zinc-400">No digital humans yet.</p>
                ) : (
                  digitalHumans.map((human) => (
                    <Link
                      key={human.id}
                      href={`/?digitalHumanId=${human.id}`}
                      className="rounded-md border border-zinc-800 p-3 hover:border-zinc-600"
                    >
                      <div className="font-medium">{human.displayName}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {human.persona?.archetype ?? "No persona"} / consent records:{" "}
                        {human.consentRecords.length}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Panel>
          </section>

          <section className="space-y-4">
            {selectedHuman ? (
              <SelectedHumanPanel human={selectedHuman} selectedLLMProvider={selectedLLMProvider} />
            ) : null}
            {selectedPlan ? (
              <SelectedPlanPanel
                contentPlan={selectedPlan}
                selectedMusicProvider={params?.musicProvider}
                selectedVideoProvider={params?.videoProvider}
                selectedLLMProvider={selectedLLMProvider}
              />
            ) : null}
            <ContentPlansPanel contentPlans={contentPlans} />
          </section>
        </div>
      </div>
    </main>
  );
}

async function loadSelectedHuman(id: string) {
  if (!isUuid(id)) return null;
  return prisma.digitalHuman.findFirst({
    where: { id, deletedAt: null },
    include: {
      persona: true,
      consentRecords: { where: { deletedAt: null }, orderBy: { signedAt: "desc" } }
    }
  });
}

async function loadSelectedPlan(id: string) {
  if (!isUuid(id)) return null;
  return prisma.contentPlan.findFirst({
    where: { id, deletedAt: null },
    include: {
      digitalHuman: { include: { persona: true } },
      songIdea: true,
      publishAssets: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });
}

async function loadContentPlans() {
  return prisma.contentPlan.findMany({
    where: { deletedAt: null },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
    take: 100,
    include: { digitalHuman: true, songIdea: true }
  });
}

function SelectedHumanPanel({
  human,
  selectedLLMProvider
}: {
  human: NonNullable<Awaited<ReturnType<typeof loadSelectedHuman>>>;
  selectedLLMProvider: LLMProviderKey | null;
}) {
  return (
    <Panel title={`Digital Human: ${human.displayName}`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <form action={updateDigitalHumanAction} className="grid gap-3">
          <input type="hidden" name="id" value={human.id} />
          <Input label="Display name" name="displayName" defaultValue={human.displayName} required />
          <Input label="Legal name" name="legalName" defaultValue={human.legalName ?? ""} />
          <Input label="Avatar URL" name="avatarUrl" defaultValue={human.avatarUrl ?? ""} />
          <Input label="Voice sample URL" name="voiceSampleUrl" defaultValue={human.voiceSampleUrl ?? ""} />
          <Textarea label="Notes" name="notes" defaultValue={human.notes ?? ""} />
          <Input label="Archetype" name="archetype" defaultValue={human.persona?.archetype ?? ""} required />
          <Textarea label="Backstory" name="backstory" defaultValue={human.persona?.backstory ?? ""} required />
          <Input label="Tone of voice" name="toneOfVoice" defaultValue={human.persona?.toneOfVoice ?? ""} required />
          <Input label="Audience" name="audience" defaultValue={human.persona?.audience ?? ""} required />
          <Input label="Music style" name="musicStyle" defaultValue={human.persona?.musicStyle ?? ""} required />
          <Input label="Visual style" name="visualStyle" defaultValue={human.persona?.visualStyle ?? ""} required />
          <Submit>Save Digital Human</Submit>
        </form>

        <div className="space-y-4">
          <form action={addConsentRecordAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="digitalHumanId" value={human.id} />
            <Input label="Consented name" name="consentedName" required />
            <Input label="Consent document URL" name="documentUrl" required />
            <Input label="Scope" name="scope" defaultValue="AI music and digital-human video" required />
            <Input label="Signed at" name="signedAt" type="date" />
            <Input label="Expires at" name="expiresAt" type="date" />
            <Submit>Add Consent</Submit>
          </form>

          <form action={generateWeeklyPlanAction} className="rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="digitalHumanId" value={human.id} />
            <Select label="LLM provider" name="llmProvider" defaultValue={selectedLLMProvider ?? ""}>
              <option value="">Auto</option>
              <option value="mock">Mock LLM</option>
              <option value="openai">OpenAI</option>
            </Select>
            <p className="mt-2 text-xs text-zinc-500">Auto uses OpenAI only when OPENAI_API_KEY is configured.</p>
            <Submit>Generate 7-day Plan</Submit>
          </form>

          <div className="rounded-md border border-zinc-800 p-3">
            <div className="text-sm font-medium">Consent Records</div>
            {human.consentRecords.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">No consent records yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                {human.consentRecords.map((record) => (
                  <li key={record.id}>
                    {record.consentedName} / {record.scope} / signed {formatDate(record.signedAt)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

async function SelectedPlanPanel({
  contentPlan,
  selectedMusicProvider,
  selectedVideoProvider,
  selectedLLMProvider
}: {
  contentPlan: NonNullable<SelectedPlan>;
  selectedMusicProvider?: string;
  selectedVideoProvider?: string;
  selectedLLMProvider: LLMProviderKey | null;
}) {
  const audioAssets = contentPlan.publishAssets.filter((asset) => asset.assetType === "audio");
  const videoAssets = contentPlan.publishAssets.filter((asset) => asset.assetType === "video");
  const latestAudioAsset = audioAssets[0];
  const musicProvider = getMusicProvider(selectedMusicProvider);
  const videoProvider = getVideoProvider(selectedVideoProvider);
  const musicPrompt = await musicProvider.buildPrompt({ contentPlan, llmProviderKey: selectedLLMProvider });
  const publishCopy = await buildPublishCopyPackage(contentPlan, selectedLLMProvider);
  const videoPrompt = latestAudioAsset
    ? await videoProvider.buildPrompt({
        contentPlan,
        musicAsset: latestAudioAsset,
        llmProviderKey: selectedLLMProvider
      })
    : null;

  return (
    <Panel title={`Content Plan: ${contentPlan.title}`}>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <ProviderSelect
            planId={contentPlan.id}
            label="LLM provider"
            name="llmProvider"
            selected={selectedLLMProvider ?? ""}
            keepMusicProvider={musicProvider.providerKey}
            keepVideoProvider={videoProvider.providerKey}
            options={[
              { key: "", name: "Auto" },
              { key: "mock", name: "Mock LLM" },
              { key: "openai", name: "OpenAI" }
            ]}
          />
          <LLMNotice
            providerName={musicPrompt.llmProviderName}
            error={musicPrompt.llmError ?? publishCopy.llmError ?? videoPrompt?.llmError ?? null}
            usedFallback={musicPrompt.llmUsedFallback || publishCopy.llmUsedFallback || Boolean(videoPrompt?.llmUsedFallback)}
          />
          <ProviderSelect
            planId={contentPlan.id}
            label="Music provider"
            name="musicProvider"
            selected={musicProvider.providerKey}
            keepLLMProvider={selectedLLMProvider}
            options={musicProviders.map((provider) => ({
              key: provider.providerKey,
              name: provider.providerName
            }))}
          />
          <CopyFields
            title={`${musicProvider.providerName} Music Prompt`}
            description="Copy these fields into the selected music provider manually."
            fields={[
              { key: "songTitle", label: "Song Title", value: musicPrompt.songTitle },
              { key: "songPrompt", label: "Song Prompt", value: musicPrompt.songPrompt },
              { key: "lyrics", label: "Lyrics", value: musicPrompt.lyrics },
              { key: "stylePrompt", label: "Style Prompt", value: musicPrompt.stylePrompt },
              { key: "genre", label: "Genre", value: musicPrompt.genre },
              { key: "mood", label: "Mood", value: musicPrompt.mood },
              { key: "duration", label: "Duration", value: musicPrompt.duration }
            ]}
          />

          <CopyFields
            title="LLM Publish Copy"
            description="Copy these fields into manual TikTok or YouTube publishing workflows."
            fields={[
              { key: "title", label: "Title", value: publishCopy.title },
              { key: "description", label: "Description", value: publishCopy.description },
              { key: "tiktokCaption", label: "TikTok Caption", value: publishCopy.tiktokCaption },
              {
                key: "youtubeShortsDescription",
                label: "YouTube Shorts Description",
                value: publishCopy.youtubeShortsDescription
              },
              { key: "hashtags", label: "Hashtags", value: publishCopy.hashtags.join(" ") }
            ]}
          />

          {videoPrompt ? (
            <>
              <ProviderSelect
                planId={contentPlan.id}
                label="Video provider"
                name="videoProvider"
                selected={videoProvider.providerKey}
                keepMusicProvider={musicProvider.providerKey}
                keepLLMProvider={selectedLLMProvider}
                options={videoProviders.map((provider) => ({
                  key: provider.providerKey,
                  name: provider.providerName
                }))}
              />
              <CopyFields
                title={`${videoProvider.providerName} Video Prompt`}
                description="Copy these fields into the selected video provider manually."
                fields={[
                  { key: "videoTitle", label: "Video Title", value: videoPrompt.videoTitle },
                  {
                    key: "avatarInstructions",
                    label: "Avatar Instructions",
                    value: videoPrompt.avatarInstructions
                  },
                  { key: "cameraStyle", label: "Camera Style", value: videoPrompt.cameraStyle },
                  { key: "lipSyncNotes", label: "Lip Sync Notes", value: videoPrompt.lipSyncNotes },
                  { key: "scenePrompt", label: "Scene Prompt", value: videoPrompt.scenePrompt },
                  { key: "subtitleText", label: "Subtitle Text", value: videoPrompt.subtitleText },
                  { key: "coverTitle", label: "Cover Title", value: videoPrompt.coverTitle },
                  { key: "tiktokCaption", label: "TikTok Caption", value: videoPrompt.tiktokCaption },
                  {
                    key: "youtubeShortsTitle",
                    label: "YouTube Shorts Title",
                    value: videoPrompt.youtubeShortsTitle
                  },
                  {
                    key: "youtubeShortsDescription",
                    label: "YouTube Shorts Description",
                    value: videoPrompt.youtubeShortsDescription
                  }
                ]}
              />
            </>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              Upload a music asset before preparing video prompts.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <form action={updateContentPlanCopyAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="id" value={contentPlan.id} />
            <Input label="Title" name="title" defaultValue={contentPlan.title} required />
            <Textarea label="Caption" name="caption" defaultValue={contentPlan.caption} required />
            <Textarea label="Hashtags" name="hashtags" defaultValue={contentPlan.hashtags.join(" ")} required />
            <Submit>Save Copy</Submit>
          </form>

          <form action={updateContentPlanStatusAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="id" value={contentPlan.id} />
            <Select label="Status" name="status" defaultValue={contentPlan.status}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Submit>Update Status</Submit>
          </form>

          <form action={uploadMusicAssetAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="contentPlanId" value={contentPlan.id} />
            <input type="hidden" name="provider" value={musicProvider.providerKey} />
            <FileInput label="Music asset" name="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" />
            <p className="text-xs text-zinc-500">Accepted: mp3, wav, m4a.</p>
            <Submit>Upload Music</Submit>
          </form>

          <form action={uploadVideoAssetAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="contentPlanId" value={contentPlan.id} />
            <input type="hidden" name="provider" value={videoProvider.providerKey} />
            <FileInput label="Video asset" name="file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" />
            <p className="text-xs text-zinc-500">Accepted: mp4, mov, webm. Requires music first.</p>
            <Submit>Upload Video</Submit>
          </form>

          <AssetList title="Music Assets" assets={audioAssets} mediaType="audio" />
          <AssetList title="Video Assets" assets={videoAssets} mediaType="video" />
        </aside>
      </div>
    </Panel>
  );
}

function ProviderSelect({
  planId,
  label,
  name,
  selected,
  options,
  keepMusicProvider,
  keepVideoProvider,
  keepLLMProvider
}: {
  planId: string;
  label: string;
  name: string;
  selected: string;
  options: { key: string; name: string }[];
  keepMusicProvider?: string;
  keepVideoProvider?: string;
  keepLLMProvider?: string | null;
}) {
  return (
    <form action="/" className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <input type="hidden" name="planId" value={planId} />
      {keepMusicProvider ? <input type="hidden" name="musicProvider" value={keepMusicProvider} /> : null}
      {keepVideoProvider ? <input type="hidden" name="videoProvider" value={keepVideoProvider} /> : null}
      {keepLLMProvider ? <input type="hidden" name="llmProvider" value={keepLLMProvider} /> : null}
      <Select label={label} name={name} defaultValue={selected}>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.name}
          </option>
        ))}
      </Select>
      <Submit>Use Provider</Submit>
    </form>
  );
}

function ContentPlansPanel({
  contentPlans
}: {
  contentPlans: Awaited<ReturnType<typeof loadContentPlans>>;
}) {
  return (
    <Panel title="Content Plans">
      {contentPlans.length === 0 ? (
        <p className="text-sm text-zinc-400">No content plans yet.</p>
      ) : (
        <div className="grid gap-3">
          {contentPlans.map((plan) => (
            <Link
              key={plan.id}
              href={`/?planId=${plan.id}`}
              className="rounded-md border border-zinc-800 p-3 hover:border-zinc-600"
            >
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{formatDate(plan.scheduledDate)}</span>
                <span>{plan.targetPlatform}</span>
                <span>{plan.status}</span>
                <span>{plan.digitalHuman.displayName}</span>
              </div>
              <div className="mt-2 font-medium">{plan.title}</div>
              <p className="mt-1 text-sm text-zinc-400">{plan.caption}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                {plan.hashtags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AssetList({
  title,
  assets,
  mediaType
}: {
  title: string;
  assets: NonNullable<SelectedPlan>["publishAssets"];
  mediaType: "audio" | "video";
}) {
  return (
    <div className="rounded-md border border-zinc-800 p-3">
      <div className="text-sm font-medium">{title}</div>
      {assets.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">No assets uploaded.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {assets.map((asset) => {
            const metadata = assetMetadata(asset.metadata);
            const src = `/api/assets/${asset.id}`;
            return (
              <div key={asset.id} className="rounded border border-zinc-800 p-3">
                <div className="text-sm">{metadata.originalName ?? asset.assetUrl}</div>
                <div className="mt-1 text-xs text-zinc-500">{asset.provider ?? "manual"}</div>
                {mediaType === "audio" ? (
                  <audio controls preload="metadata" className="mt-3 w-full" src={src} />
                ) : (
                  <video controls preload="metadata" className="mt-3 aspect-video w-full bg-black" src={src} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LLMNotice({
  providerName,
  error,
  usedFallback = Boolean(error)
}: {
  providerName: string;
  error: string | null;
  usedFallback?: boolean;
}) {
  if (!error && !usedFallback) {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
        LLM provider: {providerName}.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-700/60 bg-amber-950/30 p-3 text-sm text-amber-100">
      LLM fallback active: showing Mock LLM output.
      {error ? <div className="mt-1 text-xs text-amber-200/80">{error}</div> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-300">{label}</span>
      <input {...inputProps} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
    </label>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...textareaProps } = props;
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-300">{label}</span>
      <textarea {...textareaProps} className="min-h-20 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
    </label>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const { label, ...selectProps } = props;
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-300">{label}</span>
      <select {...selectProps} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100" />
    </label>
  );
}

function FileInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <Input label={label} type="file" required {...inputProps} />;
}

function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950">
      {children}
    </button>
  );
}

function assetMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as { originalName?: string };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function llmProviderFromParam(value?: string): LLMProviderKey | null {
  if (value === "mock" || value === "openai") return value;
  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
