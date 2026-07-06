import type { ContentStatus, PublishStatus, TargetPlatform } from "@prisma/client";
import Link from "next/link";

import {
  addConsentRecordAction,
  createDigitalHumanAction,
  generateWeeklyPlanAction,
  markPlatformPostPublishedAction,
  retryMusicApiJobAction,
  retryVideoApiJobAction,
  savePlatformPostAction,
  startMusicApiJobAction,
  startVideoApiJobAction,
  updateContentPlanCopyAction,
  updateContentPlanStatusAction,
  updateDigitalHumanAction,
  uploadMusicAssetAction,
  uploadVideoAssetAction
} from "@/app/actions";
import { CopyFields } from "@/components/copy-fields";
import { prisma } from "@/lib/prisma";
import { llmProviderOptions } from "@/services/llm-provider";
import { isRetryableMusicApiStatus, musicApiProviders } from "@/services/music-api-provider";
import { getMusicProvider, musicProviders } from "@/services/music-provider";
import { defaultPublishCopy, publishPlatforms, publishStatuses } from "@/services/publish-workflow";
import { isRetryableVideoApiStatus, videoApiProviders } from "@/services/video-api-provider";
import { getVideoProvider, videoProviders } from "@/services/video-provider";

export const dynamic = "force-dynamic";

const statuses: ContentStatus[] = ["idea", "lyrics", "music_generated", "video_ready", "published"];
const editablePublishStatuses: PublishStatus[] = publishStatuses.filter((status) => status !== "published");

const platformLabels: Record<TargetPlatform, string> = {
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  youtube: "YouTube"
};

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
  const [digitalHumans, contentPlans, publishStats, selectedHuman, selectedPlan] = await Promise.all([
    prisma.digitalHuman.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { persona: true, consentRecords: { where: { deletedAt: null }, take: 5 } }
    }),
    loadContentPlans(),
    loadPublishStats(),
    params?.digitalHumanId ? loadSelectedHuman(params.digitalHumanId) : null,
    params?.planId ? loadSelectedPlan(params.planId) : null
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Mummur Next MVP</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Standalone AI digital-human music content system. No Back Office modules, no media
            provider automation, no cookies or tokens.
          </p>
        </header>

        <PublishStatsPanel stats={publishStats} />

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
            {selectedHuman ? <SelectedHumanPanel human={selectedHuman} /> : null}
            {selectedPlan ? (
              <SelectedPlanPanel
                contentPlan={selectedPlan}
                selectedMusicProvider={params?.musicProvider}
                selectedVideoProvider={params?.videoProvider}
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
      },
      platformPosts: {
        where: { deletedAt: null },
        orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
        include: {
          histories: {
            orderBy: { createdAt: "desc" },
            take: 10
          }
        }
      },
      musicGenerationJobs: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20
      },
      videoGenerationJobs: {
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
    include: { digitalHuman: true, songIdea: true, platformPosts: { where: { deletedAt: null } } }
  });
}

async function loadPublishStats() {
  const counts = await prisma.platformPost.groupBy({
    by: ["status"],
    where: { deletedAt: null, status: { in: ["ready", "scheduled", "published"] } },
    _count: true
  });

  return {
    ready: counts.find((count) => count.status === "ready")?._count ?? 0,
    scheduled: counts.find((count) => count.status === "scheduled")?._count ?? 0,
    published: counts.find((count) => count.status === "published")?._count ?? 0
  };
}

function PublishStatsPanel({ stats }: { stats: Awaited<ReturnType<typeof loadPublishStats>> }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Metric label="Ready" value={stats.ready} />
      <Metric label="Scheduled" value={stats.scheduled} />
      <Metric label="Published" value={stats.published} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SelectedHumanPanel({ human }: { human: NonNullable<Awaited<ReturnType<typeof loadSelectedHuman>>> }) {
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
            <Select label="LLM provider" name="llmProvider" defaultValue="mock">
              {llmProviderOptions.map((provider) => (
                <option key={provider.providerKey} value={provider.providerKey}>
                  {provider.providerName}
                </option>
              ))}
            </Select>
            <div className="mt-3">
              <Submit>Generate 7-day Plan</Submit>
            </div>
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

function SelectedPlanPanel({
  contentPlan,
  selectedMusicProvider,
  selectedVideoProvider
}: {
  contentPlan: NonNullable<SelectedPlan>;
  selectedMusicProvider?: string;
  selectedVideoProvider?: string;
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

          <MusicApiJobsPanel contentPlan={contentPlan} />

          <form action={uploadVideoAssetAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="contentPlanId" value={contentPlan.id} />
            <input type="hidden" name="provider" value={videoProvider.providerKey} />
            <FileInput label="Video asset" name="file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" />
            <p className="text-xs text-zinc-500">Accepted: mp4, mov, webm. Requires music first.</p>
            <Submit>Upload Video</Submit>
          </form>

          <VideoApiJobsPanel contentPlan={contentPlan} hasMusic={audioAssets.length > 0} />

          <AssetList title="Music Assets" assets={audioAssets} mediaType="audio" />
          <AssetList title="Video Assets" assets={videoAssets} mediaType="video" />
          <PublishWorkflowPanel contentPlan={contentPlan} hasVideo={videoAssets.length > 0} />
        </aside>
      </div>
    </Panel>
  );
}

function MusicApiJobsPanel({ contentPlan }: { contentPlan: NonNullable<SelectedPlan> }) {
  return (
    <div className="space-y-3 rounded-md border border-zinc-800 p-3">
      <div>
        <div className="text-sm font-medium">Music API Provider</div>
        <p className="mt-1 text-xs text-zinc-500">Official API or mock API only. No cookies or browser login.</p>
      </div>

      <form action={startMusicApiJobAction} className="grid gap-3 rounded border border-zinc-800 p-3">
        <input type="hidden" name="contentPlanId" value={contentPlan.id} />
        <Select label="API provider" name="provider" defaultValue={musicApiProviders[0].providerKey}>
          {musicApiProviders.map((provider) => (
            <option key={provider.providerKey} value={provider.providerKey}>
              {provider.providerName}
            </option>
          ))}
        </Select>
        <Submit>Generate Music via API</Submit>
      </form>

      {contentPlan.musicGenerationJobs.length === 0 ? (
        <p className="text-sm text-zinc-400">No music API jobs yet.</p>
      ) : (
        <div className="grid gap-3">
          {contentPlan.musicGenerationJobs.map((job) => (
            <div key={job.id} className="rounded border border-zinc-800 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{job.provider}</div>
                  <div className="text-xs text-zinc-500">Status: {job.status}</div>
                </div>
                {job.generatedAudioUrl ? (
                  <a className="text-xs text-zinc-300 underline" href={job.generatedAudioUrl}>
                    generatedAudioUrl
                  </a>
                ) : null}
              </div>
              {job.errorMessage ? <p className="mt-2 text-xs text-red-300">{job.errorMessage}</p> : null}
              <div className="mt-2 text-xs text-zinc-500">
                Provider config: {compactJson(job.providerConfig)}
              </div>
              {isRetryableMusicApiStatus(job.status) ? (
                <form action={retryMusicApiJobAction} className="mt-3">
                  <input type="hidden" name="id" value={job.id} />
                  <Submit>Retry</Submit>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoApiJobsPanel({
  contentPlan,
  hasMusic
}: {
  contentPlan: NonNullable<SelectedPlan>;
  hasMusic: boolean;
}) {
  return (
    <div className="space-y-3 rounded-md border border-zinc-800 p-3">
      <div>
        <div className="text-sm font-medium">Video API Provider</div>
        <p className="mt-1 text-xs text-zinc-500">Official API or mock API only. No cookies or browser login.</p>
      </div>

      {hasMusic ? (
        <form action={startVideoApiJobAction} className="grid gap-3 rounded border border-zinc-800 p-3">
          <input type="hidden" name="contentPlanId" value={contentPlan.id} />
          <Select label="API provider" name="provider" defaultValue={videoApiProviders[0].providerKey}>
            {videoApiProviders.map((provider) => (
              <option key={provider.providerKey} value={provider.providerKey}>
                {provider.providerName}
              </option>
            ))}
          </Select>
          <Submit>Generate Video via API</Submit>
        </form>
      ) : (
        <p className="text-sm text-zinc-400">Upload or generate a music asset before video API generation.</p>
      )}

      {contentPlan.videoGenerationJobs.length === 0 ? (
        <p className="text-sm text-zinc-400">No video API jobs yet.</p>
      ) : (
        <div className="grid gap-3">
          {contentPlan.videoGenerationJobs.map((job) => (
            <div key={job.id} className="rounded border border-zinc-800 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{job.provider}</div>
                  <div className="text-xs text-zinc-500">Status: {job.status}</div>
                </div>
                {job.generatedVideoUrl ? (
                  <a className="text-xs text-zinc-300 underline" href={job.generatedVideoUrl}>
                    generatedVideoUrl
                  </a>
                ) : null}
              </div>
              {job.errorMessage ? <p className="mt-2 text-xs text-red-300">{job.errorMessage}</p> : null}
              <div className="mt-2 text-xs text-zinc-500">
                Provider config: {compactJson(job.providerConfig)}
              </div>
              {isRetryableVideoApiStatus(job.status) ? (
                <form action={retryVideoApiJobAction} className="mt-3">
                  <input type="hidden" name="id" value={job.id} />
                  <Submit>Retry</Submit>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublishWorkflowPanel({
  contentPlan,
  hasVideo
}: {
  contentPlan: NonNullable<SelectedPlan>;
  hasVideo: boolean;
}) {
  const defaults = defaultPublishCopy(contentPlan);

  return (
    <div className="space-y-4 rounded-md border border-zinc-800 p-3">
      <div>
        <div className="text-sm font-medium">Publish Workflow</div>
        <p className="mt-1 text-xs text-zinc-500">Manual preparation only. No TikTok or YouTube APIs are called.</p>
      </div>

      {!hasVideo ? (
        <p className="text-sm text-zinc-400">Upload a video asset before preparing platform publishing.</p>
      ) : (
        <>
          <PublishPostForm
            contentPlanId={contentPlan.id}
            platform={contentPlan.targetPlatform}
            status="ready"
            publishTitle={defaults.publishTitle}
            publishDescription={defaults.publishDescription}
            hashtags={defaults.hashtags}
            submitLabel="Save Publish Prep"
          />

          <div className="space-y-3">
            <div className="text-sm font-medium">Publish History</div>
            {contentPlan.platformPosts.length === 0 ? (
              <p className="text-sm text-zinc-400">No platform posts yet.</p>
            ) : (
              contentPlan.platformPosts.map((post) => (
                <div key={post.id} className="space-y-3 rounded border border-zinc-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{platformLabels[post.platform]}</div>
                      <div className="text-xs text-zinc-500">Status: {post.status}</div>
                    </div>
                    {post.publishedUrl ? (
                      <a className="text-xs text-zinc-300 underline" href={post.publishedUrl}>
                        Published URL
                      </a>
                    ) : null}
                  </div>

                  <PublishPostForm
                    contentPlanId={contentPlan.id}
                    platform={post.platform}
                    status={post.status === "published" ? "ready" : post.status}
                    publishTitle={post.publishTitle ?? defaults.publishTitle}
                    publishDescription={post.publishDescription ?? defaults.publishDescription}
                    hashtags={post.hashtags.length > 0 ? post.hashtags : defaults.hashtags}
                    scheduledAt={post.scheduledAt}
                    errorMessage={post.errorMessage ?? ""}
                    submitLabel="Update Publish Record"
                  />

                  <form action={markPlatformPostPublishedAction} className="grid gap-3 rounded border border-zinc-800 p-3">
                    <input type="hidden" name="id" value={post.id} />
                    <Input label="Published URL" name="publishedUrl" defaultValue={post.publishedUrl ?? ""} required />
                    <Submit>Mark Published</Submit>
                  </form>

                  {post.histories.length === 0 ? (
                    <p className="text-xs text-zinc-500">No history entries yet.</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-zinc-500">
                      {post.histories.map((history) => (
                        <li key={history.id}>
                          {formatDateTime(history.createdAt)} / {history.status}
                          {history.note ? ` / ${history.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PublishPostForm({
  contentPlanId,
  platform,
  status,
  publishTitle,
  publishDescription,
  hashtags,
  scheduledAt,
  errorMessage,
  submitLabel
}: {
  contentPlanId: string;
  platform: TargetPlatform;
  status: Exclude<PublishStatus, "published">;
  publishTitle: string;
  publishDescription: string;
  hashtags: string[];
  scheduledAt?: Date | null;
  errorMessage?: string;
  submitLabel: string;
}) {
  return (
    <form action={savePlatformPostAction} className="grid gap-3 rounded border border-zinc-800 p-3">
      <input type="hidden" name="contentPlanId" value={contentPlanId} />
      <Select label="Platform" name="platform" defaultValue={platform}>
        {publishPlatforms.map((option) => (
          <option key={option} value={option}>
            {platformLabels[option]}
          </option>
        ))}
      </Select>
      <Select label="Publish status" name="status" defaultValue={status}>
        {editablePublishStatuses.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      <Input label="Publish title" name="publishTitle" defaultValue={publishTitle} required />
      <Textarea label="Publish description" name="publishDescription" defaultValue={publishDescription} required />
      <Textarea label="Hashtags" name="hashtags" defaultValue={hashtags.join(" ")} required />
      <Input
        label="Scheduled at"
        name="scheduledAt"
        type="datetime-local"
        defaultValue={scheduledAt ? formatDateTimeInput(scheduledAt) : ""}
      />
      <Textarea label="Failure note" name="errorMessage" defaultValue={errorMessage ?? ""} />
      <Submit>{submitLabel}</Submit>
    </form>
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
                {plan.platformPosts.length > 0 ? (
                  <span>
                    publish: {plan.platformPosts.map((post) => `${platformLabels[post.platform]} ${post.status}`).join(", ")}
                  </span>
                ) : null}
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
            const src = asset.assetUrl.startsWith("http") ? asset.assetUrl : `/api/assets/${asset.id}`;
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

function compactJson(value: unknown) {
  if (!value || typeof value !== "object") return "not configured";
  return JSON.stringify(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

function formatDateTimeInput(date: Date) {
  return date.toISOString().slice(0, 16);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
