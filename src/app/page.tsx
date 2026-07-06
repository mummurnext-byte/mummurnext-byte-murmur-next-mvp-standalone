import type { ContentStatus, PublishStatus, TargetPlatform } from "@prisma/client";
import Link from "next/link";

import {
  addConsentRecordAction,
  createDigitalHumanAction,
  generateWeeklyPlanAction,
  markPublishRecordPublishedAction,
  savePublishRecordAction,
  savePlatformMetricAction,
  updateContentPlanCopyAction,
  updateContentPlanStatusAction,
  updateDigitalHumanAction,
  uploadMusicAssetAction,
  uploadVideoAssetAction
} from "@/app/actions";
import { CopyFields } from "@/components/copy-fields";
import { prisma } from "@/lib/prisma";
import { summarizeMetrics, type AnalyticsFilters, type AnalyticsMetricRow } from "@/services/analytics";
import { getMusicProvider, musicProviders } from "@/services/music-provider";
import { defaultPublishCopy, publishPlatforms, publishStatuses } from "@/services/publish-workflow";
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
    from?: string;
    to?: string;
    platform?: string;
    digitalHumanFilter?: string;
  }>;
}) {
  const params = await searchParams;
  const analyticsFilters = analyticsFiltersFromParams(params);
  const [digitalHumans, contentPlans, publishStats, analytics, selectedHuman, selectedPlan] = await Promise.all([
    loadDigitalHumans(),
    loadContentPlans(),
    loadPublishStats(),
    loadAnalytics(analyticsFilters),
    params?.digitalHumanId ? loadSelectedHuman(params.digitalHumanId) : null,
    params?.planId ? loadSelectedPlan(params.planId) : null
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Mummur Next MVP</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Standalone AI digital-human music content system. No Back Office modules, no real AI
            provider API calls, no cookies or tokens.
          </p>
        </header>

        <PublishStatsPanel stats={publishStats} />
        <AnalyticsDashboardPanel analytics={analytics} digitalHumans={digitalHumans} filters={analyticsFilters} />

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

async function loadDigitalHumans() {
  return prisma.digitalHuman.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { persona: true, consentRecords: { where: { deletedAt: null }, take: 5 } }
  });
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
      publishRecords: {
        where: { deletedAt: null },
        orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
        include: {
          metrics: {
            where: { deletedAt: null },
            orderBy: { date: "desc" },
            take: 30
          },
          histories: {
            orderBy: { createdAt: "desc" },
            take: 10
          }
        }
      }
    }
  });
}

async function loadContentPlans() {
  return prisma.contentPlan.findMany({
    where: { deletedAt: null },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
    take: 100,
    include: { digitalHuman: true, songIdea: true, publishRecords: { where: { deletedAt: null } } }
  });
}

async function loadPublishStats() {
  const counts = await prisma.publishRecord.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: true
  });

  return {
    draft: counts.find((count) => count.status === "draft")?._count ?? 0,
    ready: counts.find((count) => count.status === "ready")?._count ?? 0,
    scheduled: counts.find((count) => count.status === "scheduled")?._count ?? 0,
    published: counts.find((count) => count.status === "published")?._count ?? 0,
    failed: counts.find((count) => count.status === "failed")?._count ?? 0
  };
}

async function loadAnalytics(filters: AnalyticsFilters) {
  const metrics = await prisma.platformMetric.findMany({
    where: {
      deletedAt: null,
      platform: filters.platform ?? undefined,
      date: {
        gte: filters.from ? dateOnly(filters.from) : undefined,
        lte: filters.to ? dateOnly(filters.to) : undefined
      },
      publishRecord: {
        deletedAt: null,
        contentPlan: {
          deletedAt: null,
          digitalHumanId: filters.digitalHumanId ?? undefined,
          digitalHuman: { deletedAt: null }
        }
      }
    },
    orderBy: { date: "desc" },
    take: 1000,
    include: {
      publishRecord: {
        include: {
          contentPlan: {
            include: {
              digitalHuman: true
            }
          }
        }
      }
    }
  });

  const rows: AnalyticsMetricRow[] = metrics.map((metric) => ({
    date: metric.date,
    platform: metric.platform,
    views: metric.views,
    likes: metric.likes,
    comments: metric.comments,
    shares: metric.shares,
    watchTimeSeconds: metric.watchTimeSeconds,
    revenue: Number(metric.revenue),
    currency: metric.currency,
    publishRecordId: metric.publishRecordId,
    contentPlanId: metric.publishRecord.contentPlanId,
    contentPlanTitle: metric.publishRecord.contentPlan.title,
    digitalHumanId: metric.publishRecord.contentPlan.digitalHumanId,
    digitalHumanName: metric.publishRecord.contentPlan.digitalHuman.displayName
  }));

  return {
    rows,
    summary: summarizeMetrics(rows)
  };
}

function PublishStatsPanel({ stats }: { stats: Awaited<ReturnType<typeof loadPublishStats>> }) {
  return (
    <section className="grid gap-3 sm:grid-cols-5">
      <Metric label="Draft" value={stats.draft} />
      <Metric label="Ready" value={stats.ready} />
      <Metric label="Scheduled" value={stats.scheduled} />
      <Metric label="Published" value={stats.published} />
      <Metric label="Failed" value={stats.failed} />
    </section>
  );
}

function AnalyticsDashboardPanel({
  analytics,
  digitalHumans,
  filters
}: {
  analytics: Awaited<ReturnType<typeof loadAnalytics>>;
  digitalHumans: Awaited<ReturnType<typeof loadDigitalHumans>>;
  filters: AnalyticsFilters;
}) {
  const summary = analytics.summary;
  const hasMetrics = analytics.rows.length > 0;

  return (
    <Panel title="Analytics Dashboard">
      <form action="/" className="mb-4 grid gap-3 md:grid-cols-4">
        <Input label="From" name="from" type="date" defaultValue={filters.from ?? ""} />
        <Input label="To" name="to" type="date" defaultValue={filters.to ?? ""} />
        <Select label="Platform" name="platform" defaultValue={filters.platform ?? ""}>
          <option value="">All platforms</option>
          {publishPlatforms.map((platform) => (
            <option key={platform} value={platform}>
              {platformLabels[platform]}
            </option>
          ))}
        </Select>
        <Select label="Digital Human" name="digitalHumanFilter" defaultValue={filters.digitalHumanId ?? ""}>
          <option value="">All digital humans</option>
          {digitalHumans.map((human) => (
            <option key={human.id} value={human.id}>
              {human.displayName}
            </option>
          ))}
        </Select>
        <div className="md:col-span-4">
          <Submit>Apply Filters</Submit>
        </div>
      </form>

      {!hasMetrics ? (
        <p className="text-sm text-zinc-400">No platform metrics yet. Add daily metrics from a Publish Record.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="Views" value={formatNumber(summary.totals.views)} />
            <Metric label="Likes" value={formatNumber(summary.totals.likes)} />
            <Metric label="Comments" value={formatNumber(summary.totals.comments)} />
            <Metric label="Shares" value={formatNumber(summary.totals.shares)} />
            <Metric label="Watch Time" value={formatDuration(summary.totals.watchTimeSeconds)} />
            <Metric label="Revenue" value={formatCurrency(summary.totals.revenue)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Ranking title="Top 10 Content Plans by Views" rows={summary.topContentPlansByViews} valueKey="views" />
            <Ranking title="Top 10 Content Plans by Revenue" rows={summary.topContentPlansByRevenue} valueKey="revenue" />
            <Ranking title="Top Digital Humans by Views" rows={summary.topDigitalHumansByViews} valueKey="views" />
            <Ranking title="Top Platforms by Revenue" rows={summary.topPlatformsByRevenue} valueKey="revenue" />
          </div>
        </div>
      )}
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Ranking({
  title,
  rows,
  valueKey
}: {
  title: string;
  rows: { id: string; label: string; views: number; revenue: number }[];
  valueKey: "views" | "revenue";
}) {
  return (
    <div className="rounded-md border border-zinc-800 p-3">
      <div className="text-sm font-medium">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">No data.</p>
      ) : (
        <ol className="mt-3 space-y-2 text-sm">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center justify-between gap-3">
              <span className="truncate text-zinc-300">
                {index + 1}. {row.label}
              </span>
              <span className="shrink-0 text-zinc-500">
                {valueKey === "views" ? formatNumber(row.views) : formatCurrency(row.revenue)}
              </span>
            </li>
          ))}
        </ol>
      )}
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

          <form action={uploadVideoAssetAction} className="grid gap-3 rounded-md border border-zinc-800 p-3">
            <input type="hidden" name="contentPlanId" value={contentPlan.id} />
            <input type="hidden" name="provider" value={videoProvider.providerKey} />
            <FileInput label="Video asset" name="file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" />
            <p className="text-xs text-zinc-500">Accepted: mp4, mov, webm. Requires music first.</p>
            <Submit>Upload Video</Submit>
          </form>

          <AssetList title="Music Assets" assets={audioAssets} mediaType="audio" />
          <AssetList title="Video Assets" assets={videoAssets} mediaType="video" />
          <PublishWorkflowPanel contentPlan={contentPlan} hasVideo={videoAssets.length > 0} />
        </aside>
      </div>
    </Panel>
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
          <PublishRecordForm
            contentPlanId={contentPlan.id}
            platform={contentPlan.targetPlatform}
            status="ready"
            title={defaults.title}
            description={defaults.description}
            hashtags={defaults.hashtags}
            submitLabel="Save Publish Prep"
          />

          <div className="space-y-3">
            <div className="text-sm font-medium">Publish History</div>
            {contentPlan.publishRecords.length === 0 ? (
              <p className="text-sm text-zinc-400">No publish records yet.</p>
            ) : (
              contentPlan.publishRecords.map((record) => (
                <div key={record.id} className="space-y-3 rounded border border-zinc-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{platformLabels[record.platform]}</div>
                      <div className="text-xs text-zinc-500">Status: {record.status}</div>
                    </div>
                    {record.publishedUrl ? (
                      <a className="text-xs text-zinc-300 underline" href={record.publishedUrl}>
                        Published URL
                      </a>
                    ) : null}
                  </div>

                  <PublishRecordForm
                    contentPlanId={contentPlan.id}
                    platform={record.platform}
                    status={record.status === "published" ? "ready" : record.status}
                    title={record.title ?? defaults.title}
                    description={record.description ?? defaults.description}
                    hashtags={record.hashtags.length > 0 ? record.hashtags : defaults.hashtags}
                    scheduledAt={record.scheduledAt}
                    failureReason={record.failureReason ?? ""}
                    submitLabel="Update Publish Record"
                  />

                  <form action={markPublishRecordPublishedAction} className="grid gap-3 rounded border border-zinc-800 p-3">
                    <input type="hidden" name="id" value={record.id} />
                    <Input label="Published URL" name="publishedUrl" defaultValue={record.publishedUrl ?? ""} required />
                    <Submit>Mark Published</Submit>
                  </form>

                  <PlatformMetricsPanel publishRecord={record} />

                  {record.histories.length === 0 ? (
                    <p className="text-xs text-zinc-500">No history entries yet.</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-zinc-500">
                      {record.histories.map((history) => (
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

function PlatformMetricsPanel({
  publishRecord
}: {
  publishRecord: NonNullable<SelectedPlan>["publishRecords"][number];
}) {
  return (
    <div className="space-y-3 rounded border border-zinc-800 p-3">
      <div>
        <div className="text-sm font-medium">Daily Metrics</div>
        <p className="mt-1 text-xs text-zinc-500">Manual analytics entry. No platform APIs are called.</p>
      </div>

      <PlatformMetricForm publishRecordId={publishRecord.id} submitLabel="Save Daily Metrics" />

      {publishRecord.metrics.length === 0 ? (
        <p className="text-sm text-zinc-400">No metrics recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {publishRecord.metrics.map((metric) => (
            <PlatformMetricForm
              key={metric.id}
              publishRecordId={publishRecord.id}
              date={formatDateInput(metric.date)}
              views={metric.views}
              likes={metric.likes}
              comments={metric.comments}
              shares={metric.shares}
              watchTimeSeconds={metric.watchTimeSeconds}
              revenue={Number(metric.revenue)}
              currency={metric.currency}
              submitLabel={`Update ${formatDate(metric.date)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformMetricForm({
  publishRecordId,
  date,
  views = 0,
  likes = 0,
  comments = 0,
  shares = 0,
  watchTimeSeconds = 0,
  revenue = 0,
  currency = "USD",
  submitLabel
}: {
  publishRecordId: string;
  date?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  watchTimeSeconds?: number;
  revenue?: number;
  currency?: string;
  submitLabel: string;
}) {
  return (
    <form action={savePlatformMetricAction} className="grid gap-3 rounded border border-zinc-800 p-3">
      <input type="hidden" name="publishRecordId" value={publishRecordId} />
      <Input label="Date" name="date" type="date" defaultValue={date ?? todayInput()} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Views" name="views" type="number" min="0" defaultValue={views} required />
        <Input label="Likes" name="likes" type="number" min="0" defaultValue={likes} required />
        <Input label="Comments" name="comments" type="number" min="0" defaultValue={comments} required />
        <Input label="Shares" name="shares" type="number" min="0" defaultValue={shares} required />
        <Input label="Watch time seconds" name="watchTimeSeconds" type="number" min="0" defaultValue={watchTimeSeconds} required />
        <Input label="Revenue" name="revenue" type="number" min="0" step="0.0001" defaultValue={revenue} required />
      </div>
      <Input label="Currency" name="currency" defaultValue={currency} required />
      <Submit>{submitLabel}</Submit>
    </form>
  );
}

function PublishRecordForm({
  contentPlanId,
  platform,
  status,
  title,
  description,
  hashtags,
  scheduledAt,
  failureReason,
  submitLabel
}: {
  contentPlanId: string;
  platform: TargetPlatform;
  status: Exclude<PublishStatus, "published">;
  title: string;
  description: string;
  hashtags: string[];
  scheduledAt?: Date | null;
  failureReason?: string;
  submitLabel: string;
}) {
  return (
    <form action={savePublishRecordAction} className="grid gap-3 rounded border border-zinc-800 p-3">
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
      <Input label="Publish title" name="title" defaultValue={title} required />
      <Textarea label="Publish description" name="description" defaultValue={description} required />
      <Textarea label="Hashtags" name="hashtags" defaultValue={hashtags.join(" ")} required />
      <Input
        label="Scheduled at"
        name="scheduledAt"
        type="datetime-local"
        defaultValue={scheduledAt ? formatDateTimeInput(scheduledAt) : ""}
      />
      <Textarea label="Failure reason" name="failureReason" defaultValue={failureReason ?? ""} />
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
                {plan.publishRecords.length > 0 ? (
                  <span>
                    publish: {plan.publishRecords.map((record) => `${platformLabels[record.platform]} ${record.status}`).join(", ")}
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

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function analyticsFiltersFromParams(params?: {
  from?: string;
  to?: string;
  platform?: string;
  digitalHumanFilter?: string;
}): AnalyticsFilters {
  return {
    from: isDateInput(params?.from) ? params?.from : null,
    to: isDateInput(params?.to) ? params?.to : null,
    platform: params?.platform && isTargetPlatform(params.platform) ? params.platform : null,
    digitalHumanId: params?.digitalHumanFilter && isUuid(params.digitalHumanFilter) ? params.digitalHumanFilter : null
  };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function isDateInput(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dateOnly(value).getTime()));
}

function isTargetPlatform(value: string): value is TargetPlatform {
  return publishPlatforms.includes(value as TargetPlatform);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
