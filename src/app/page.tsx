import type { ContentStatus } from "@prisma/client";
import Link from "next/link";

import {
  addConsentRecordAction,
  askSmartSingerAction,
  createDigitalHumanAction,
  generateSmartSingerProfileAction,
  generateWeeklyPlanAction,
  updateContentPlanLanguageAction,
  updateContentPlanCopyAction,
  updateContentPlanStatusAction,
  updateDigitalHumanAction,
  uploadMusicAssetAction,
  uploadVideoAssetAction
} from "@/app/actions";
import { CopyFields } from "@/components/copy-fields";
import { LanguageSwitcher } from "@/components/language-switcher";
import { prisma } from "@/lib/prisma";
import { getUICopy, type UICopy } from "@/lib/ui-copy";
import { getRequestUILanguage } from "@/lib/ui-language-server";
import {
  inputLanguageOptions,
  outputLanguageOptions,
  targetMarketOptions
} from "@/services/global-language";
import { getMusicProvider, musicProviders } from "@/services/music-provider";
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
  }>;
}) {
  const params = await searchParams;
  const uiLanguage = await getRequestUILanguage();
  const ui = getUICopy(uiLanguage);
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
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Mummur Next MVP</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">{ui.description}</p>
            <Link
              href="/admin/deployment-checklist"
              className="mt-3 inline-flex rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              {ui.deploymentChecklist}
            </Link>
          </div>
          <LanguageSwitcher currentLanguage={uiLanguage} />
        </header>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="space-y-4">
            <Panel title={ui.createDigitalHuman}>
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
                <LanguagePreferenceFields ui={ui} />
                <Input label="Consented name" name="consentedName" />
                <Input label="Consent document URL" name="documentUrl" />
                <Input label="Consent scope" name="scope" defaultValue="AI music and digital-human video" />
                <Input label="Signed at" name="signedAt" type="date" />
                <Input label="Expires at" name="expiresAt" type="date" />
                <Submit>Create</Submit>
              </form>
            </Panel>

            <Panel title={ui.digitalHumans}>
              <div className="grid gap-2">
                {digitalHumans.length === 0 ? (
                  <p className="text-sm text-zinc-400">{ui.noDigitalHumans}</p>
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
            {selectedHuman ? <SelectedHumanPanel human={selectedHuman} ui={ui} /> : null}
            {selectedPlan ? (
              <SelectedPlanPanel
                contentPlan={selectedPlan}
                selectedMusicProvider={params?.musicProvider}
                selectedVideoProvider={params?.videoProvider}
                ui={ui}
              />
            ) : null}
            <ContentPlansPanel contentPlans={contentPlans} ui={ui} />
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
      consentRecords: { where: { deletedAt: null }, orderBy: { signedAt: "desc" } },
      smartSingerProfile: true,
      smartAIGenerations: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5
      }
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
      },
      smartAIGenerations: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10
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
  ui
}: {
  human: NonNullable<Awaited<ReturnType<typeof loadSelectedHuman>>>;
  ui: UICopy;
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
          <LanguagePreferenceFields
            ui={ui}
            inputLanguage={human.persona?.inputLanguage}
            outputLanguage={human.persona?.outputLanguage}
            targetMarket={human.persona?.targetMarket}
          />
          <Submit>{ui.saveDigitalHuman}</Submit>
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
            <Submit>{ui.generateWeeklyPlan}</Submit>
          </form>

          <form action={generateSmartSingerProfileAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="digitalHumanId" value={human.id} />
            <LanguagePreferenceFields
              ui={ui}
              inputLanguage={human.persona?.inputLanguage}
              outputLanguage={human.persona?.outputLanguage}
              targetMarket={human.persona?.targetMarket}
            />
            <Submit>{ui.generateProfile}</Submit>
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

          <SmartSingerProfilePanel human={human} />
        </div>
      </div>
    </Panel>
  );
}

function SelectedPlanPanel({
  contentPlan,
  selectedMusicProvider,
  selectedVideoProvider,
  ui
}: {
  contentPlan: NonNullable<SelectedPlan>;
  selectedMusicProvider?: string;
  selectedVideoProvider?: string;
  ui: UICopy;
}) {
  const audioAssets = contentPlan.publishAssets.filter((asset) => asset.assetType === "audio");
  const videoAssets = contentPlan.publishAssets.filter((asset) => asset.assetType === "video");
  const latestAudioAsset = audioAssets[0];
  const musicProvider = getMusicProvider(selectedMusicProvider);
  const videoProvider = getVideoProvider(selectedVideoProvider);
  const musicPrompt = musicProvider.buildPrompt({ contentPlan });
  const videoPrompt = latestAudioAsset
    ? videoProvider.buildPrompt({ contentPlan, musicAsset: latestAudioAsset })
    : null;

  return (
    <Panel title={`Content Plan: ${contentPlan.title}`}>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <AskSmartSingerPanel contentPlan={contentPlan} selectedVideoProvider={videoProvider.providerKey} ui={ui} />

          <ProviderSelect
            planId={contentPlan.id}
            label="Music provider"
            name="musicProvider"
            selected={musicProvider.providerKey}
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

          {videoPrompt ? (
            <>
              <ProviderSelect
                planId={contentPlan.id}
                label="Video provider"
                name="videoProvider"
                selected={videoProvider.providerKey}
                keepMusicProvider={musicProvider.providerKey}
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
          <form action={updateContentPlanLanguageAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="id" value={contentPlan.id} />
            <div>
              <div className="text-sm font-medium">{ui.contentLanguageSettings}</div>
              <p className="mt-1 text-xs text-zinc-500">{ui.languageNote}</p>
            </div>
            <LanguagePreferenceFields
              ui={ui}
              inputLanguage={contentPlan.inputLanguage}
              outputLanguage={contentPlan.outputLanguage}
              targetMarket={contentPlan.targetMarket}
            />
            <Submit>{ui.saveLanguageSettings}</Submit>
          </form>

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

function SmartSingerProfilePanel({
  human
}: {
  human: NonNullable<Awaited<ReturnType<typeof loadSelectedHuman>>>;
}) {
  const profile = human.smartSingerProfile;

  return (
    <div className="rounded-md border border-zinc-800 p-3">
      <div className="text-sm font-medium">Smart Singer Profile</div>
      {profile ? (
        <div className="mt-3 space-y-3 text-sm text-zinc-300">
          <SmartField label="Positioning" value={profile.positioning} />
          <SmartField label="Persona" value={profile.personaSummary} />
          <SmartField label="Music Style" value={profile.musicStyle} />
          <SmartField label="Audience" value={profile.audience} />
          <SmartField label="Content Direction" value={profile.contentDirection} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-400">No Smart Singer Profile yet.</p>
      )}
      <SmartGenerationList generations={human.smartAIGenerations} />
    </div>
  );
}

function AskSmartSingerPanel({
  contentPlan,
  selectedVideoProvider,
  ui
}: {
  contentPlan: NonNullable<SelectedPlan>;
  selectedVideoProvider: string;
  ui: UICopy;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-sm font-medium">{ui.askSmartSinger}</div>
      <p className="mt-1 text-xs text-zinc-500">{ui.languageNote}</p>
      <form action={askSmartSingerAction} className="mt-3 grid gap-3">
        <input type="hidden" name="contentPlanId" value={contentPlan.id} />
        <input type="hidden" name="videoProvider" value={selectedVideoProvider} />
        <LanguagePreferenceFields
          ui={ui}
          inputLanguage={contentPlan.inputLanguage}
          outputLanguage={contentPlan.outputLanguage}
          targetMarket={contentPlan.targetMarket}
        />
        <div className="flex flex-wrap gap-2">
          <SmartTaskButton task="song_idea">{ui.generateSongIdea}</SmartTaskButton>
          <SmartTaskButton task="lyrics">{ui.generateLyrics}</SmartTaskButton>
          <SmartTaskButton task="suno_prompt">{ui.generateSunoPrompt}</SmartTaskButton>
          <SmartTaskButton task="makebestmusic_prompt">{ui.generateMakeBestMusicPrompt}</SmartTaskButton>
          <SmartTaskButton task="video_brief">{ui.generateVideoBrief}</SmartTaskButton>
          <SmartTaskButton task="tiktok_copy">{ui.generateTikTokCopy}</SmartTaskButton>
          <SmartTaskButton task="youtube_copy">{ui.generateYouTubeCopy}</SmartTaskButton>
        </div>
      </form>
      <SmartGenerationList generations={contentPlan.smartAIGenerations} />
    </div>
  );
}

function SmartTaskButton({
  task,
  children
}: {
  task: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      name="task"
      value={task}
      className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-500"
    >
      {children}
    </button>
  );
}

function SmartGenerationList({
  generations
}: {
  generations: {
    id: string;
    purpose: string;
    status: string;
    provider: string;
    output: unknown;
    errorMessage: string | null;
    totalTokens: number | null;
    estimatedCostUsd: unknown;
    createdAt: Date;
  }[];
}) {
  if (generations.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {generations.map((generation) => (
        <div key={generation.id} className="rounded border border-zinc-800 p-3 text-sm">
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <span>{generation.purpose}</span>
            <span>{generation.status}</span>
            <span>{generation.provider}</span>
            <span>{formatDate(generation.createdAt)}</span>
            {generation.totalTokens ? <span>{generation.totalTokens} tokens</span> : null}
            {generation.estimatedCostUsd ? <span>${String(generation.estimatedCostUsd)}</span> : null}
          </div>
          {generation.status === "failed" ? (
            <p className="mt-2 text-amber-300">{generation.errorMessage ?? "Smart AI generation failed."}</p>
          ) : (
            <SmartOutput output={generation.output} />
          )}
        </div>
      ))}
    </div>
  );
}

function SmartOutput({ output }: { output: unknown }) {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const entries = Object.entries(output as Record<string, unknown>);

  return (
    <div className="mt-3 grid gap-2">
      {entries.map(([key, value]) => (
        <SmartField key={key} label={labelFromKey(key)} value={formatSmartValue(value)} />
      ))}
    </div>
  );
}

function SmartField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-zinc-300">{value}</div>
    </div>
  );
}

function ProviderSelect({
  planId,
  label,
  name,
  selected,
  options,
  keepMusicProvider
}: {
  planId: string;
  label: string;
  name: string;
  selected: string;
  options: { key: string; name: string }[];
  keepMusicProvider?: string;
}) {
  return (
    <form action="/" className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <input type="hidden" name="planId" value={planId} />
      {keepMusicProvider ? <input type="hidden" name="musicProvider" value={keepMusicProvider} /> : null}
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

function LanguagePreferenceFields({
  ui,
  inputLanguage = "auto",
  outputLanguage = "en",
  targetMarket = "global"
}: {
  ui: UICopy;
  inputLanguage?: string | null;
  outputLanguage?: string | null;
  targetMarket?: string | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Select label={ui.inputLanguage} name="inputLanguage" defaultValue={inputLanguage ?? "auto"}>
        {inputLanguageOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select label={ui.outputLanguage} name="outputLanguage" defaultValue={outputLanguage ?? "en"}>
        {outputLanguageOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select label={ui.targetMarket} name="targetMarket" defaultValue={targetMarket ?? "global"}>
        {targetMarketOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function ContentPlansPanel({
  contentPlans,
  ui
}: {
  contentPlans: Awaited<ReturnType<typeof loadContentPlans>>;
  ui: UICopy;
}) {
  return (
    <Panel title={ui.contentPlans}>
      {contentPlans.length === 0 ? (
        <p className="text-sm text-zinc-400">{ui.noContentPlans}</p>
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

function labelFromKey(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatSmartValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatSmartValue(item)).join("\n");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value ?? "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
