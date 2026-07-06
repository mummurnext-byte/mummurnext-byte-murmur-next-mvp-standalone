"use server";

import type { ContentStatus, PublishStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { storeUploadedFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { normalizeMetricInput } from "@/services/analytics";
import {
  assertMusicFile,
  assertVideoFile,
  buildMusicAssetMetadata,
  buildVideoAssetMetadata
} from "@/services/asset-services";
import type { MusicProviderKey } from "@/services/music-provider";
import { musicProviders } from "@/services/music-provider";
import {
  assertPublishStatusTransition,
  isPublishPlatform,
  isPublishStatus,
  scheduledAtFromInput,
  splitPublishHashtags
} from "@/services/publish-workflow";
import { generateWeeklyPlan } from "@/services/weekly-plan";
import type { VideoProviderKey } from "@/services/video-provider";
import { videoProviders } from "@/services/video-provider";

export async function createDigitalHumanAction(formData: FormData) {
  const digitalHuman = await prisma.digitalHuman.create({
    data: {
      displayName: requiredString(formData, "displayName"),
      legalName: optionalString(formData, "legalName"),
      avatarUrl: optionalString(formData, "avatarUrl"),
      voiceSampleUrl: optionalString(formData, "voiceSampleUrl"),
      notes: optionalString(formData, "notes"),
      persona: {
        create: personaData(formData)
      }
    }
  });

  const consent = consentData(formData);
  if (consent) {
    await prisma.consentRecord.create({
      data: {
        ...consent,
        digitalHumanId: digitalHuman.id
      }
    });
  }

  revalidatePath("/");
  redirect(`/?digitalHumanId=${digitalHuman.id}`);
}

export async function updateDigitalHumanAction(formData: FormData) {
  const id = requiredString(formData, "id");
  await requireActiveDigitalHuman(id);

  await prisma.digitalHuman.update({
    where: { id },
    data: {
      displayName: requiredString(formData, "displayName"),
      legalName: optionalString(formData, "legalName"),
      avatarUrl: optionalString(formData, "avatarUrl"),
      voiceSampleUrl: optionalString(formData, "voiceSampleUrl"),
      notes: optionalString(formData, "notes"),
      persona: {
        upsert: {
          create: personaData(formData),
          update: personaData(formData)
        }
      }
    }
  });

  revalidatePath("/");
}

export async function addConsentRecordAction(formData: FormData) {
  const digitalHumanId = requiredString(formData, "digitalHumanId");
  await requireActiveDigitalHuman(digitalHumanId);

  await prisma.consentRecord.create({
    data: {
      digitalHumanId,
      consentedName: requiredString(formData, "consentedName"),
      documentUrl: requiredString(formData, "documentUrl"),
      scope: requiredString(formData, "scope"),
      signedAt: dateFromForm(formData, "signedAt") ?? new Date(),
      expiresAt: dateFromForm(formData, "expiresAt")
    }
  });

  revalidatePath("/");
}

export async function generateWeeklyPlanAction(formData: FormData) {
  await generateWeeklyPlan(requiredString(formData, "digitalHumanId"));
  revalidatePath("/");
}

export async function updateContentPlanCopyAction(formData: FormData) {
  const id = requiredString(formData, "id");
  await requireActiveContentPlan(id);

  await prisma.contentPlan.update({
    where: { id },
    data: {
      title: requiredString(formData, "title"),
      caption: requiredString(formData, "caption"),
      hashtags: splitHashtags(requiredString(formData, "hashtags"))
    }
  });

  revalidatePath("/");
}

export async function updateContentPlanStatusAction(formData: FormData) {
  const id = requiredString(formData, "id");
  const status = requiredString(formData, "status");

  if (!isContentStatus(status)) throw new Error("Invalid content status.");
  await requireActiveContentPlan(id);

  await prisma.contentPlan.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/");
}

export async function uploadMusicAssetAction(formData: FormData) {
  const contentPlanId = requiredString(formData, "contentPlanId");
  const contentPlan = await requireActiveContentPlan(contentPlanId);
  const provider = requiredString(formData, "provider");
  const file = formData.get("file");

  if (!isMusicProvider(provider)) throw new Error("Music provider is not supported.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Music file is required.");
  assertMusicFile(file);

  const savedFile = await storeUploadedFile({
    file,
    entityType: "content_plan",
    entityId: contentPlanId
  });

  await prisma.$transaction([
    prisma.publishAsset.create({
      data: {
        contentPlanId,
        assetType: "audio",
        assetUrl: `file_asset:${savedFile.id}`,
        provider,
        metadata: buildMusicAssetMetadata(savedFile, provider)
      }
    }),
    prisma.contentPlan.update({
      where: { id: contentPlanId },
      data: { status: nextMusicUploadStatus(contentPlan.status) }
    })
  ]);

  revalidatePath("/");
}

export async function uploadVideoAssetAction(formData: FormData) {
  const contentPlanId = requiredString(formData, "contentPlanId");
  const contentPlan = await requireActiveContentPlan(contentPlanId);
  const provider = requiredString(formData, "provider");
  const file = formData.get("file");
  const musicAsset = await requireLatestMusicAsset(contentPlanId);

  if (!isVideoProvider(provider)) throw new Error("Video provider is not supported.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Video file is required.");
  assertVideoFile(file);

  const savedFile = await storeUploadedFile({
    file,
    entityType: "content_plan",
    entityId: contentPlanId
  });

  await prisma.$transaction([
    prisma.publishAsset.create({
      data: {
        contentPlanId,
        assetType: "video",
        assetUrl: `file_asset:${savedFile.id}`,
        provider,
        metadata: buildVideoAssetMetadata(savedFile, provider, musicAsset.id)
      }
    }),
    prisma.contentPlan.update({
      where: { id: contentPlanId },
      data: { status: nextVideoUploadStatus(contentPlan.status) }
    })
  ]);

  revalidatePath("/");
}

export async function savePublishRecordAction(formData: FormData) {
  const contentPlanId = requiredString(formData, "contentPlanId");
  const platform = requiredString(formData, "platform");
  const status = requiredString(formData, "status");

  if (!isPublishPlatform(platform)) throw new Error("Publish platform is not supported.");
  if (!isPublishStatus(status)) throw new Error("Publish status is not supported.");
  if (status === "published") throw new Error("Use manual publish marking for published posts.");

  const contentPlan = await requireActiveContentPlan(contentPlanId);
  await requireLatestVideoAsset(contentPlanId);

  const title = requiredString(formData, "title");
  const description = requiredString(formData, "description");
  const hashtags = splitPublishHashtags(requiredString(formData, "hashtags"));
  const scheduledAt = scheduledAtFromInput(status, optionalString(formData, "scheduledAt"));
  const failureReason = status === "failed" ? optionalString(formData, "failureReason") : null;

  assertPublishStatusTransition({
    status,
    hasVideo: true,
    failureReason
  });

  await prisma.$transaction(async (tx) => {
    const publishRecord = await tx.publishRecord.upsert({
      where: {
        contentPlanId_platform: {
          contentPlanId,
          platform
        }
      },
      create: {
        contentPlanId,
        platform,
        status,
        title,
        description,
        hashtags,
        scheduledAt,
        failureReason
      },
      update: {
        status,
        title,
        description,
        hashtags,
        scheduledAt,
        failureReason
      }
    });

    await tx.publishRecordHistory.create({
      data: {
        publishRecordId: publishRecord.id,
        status,
        note: publishHistoryNote(status, contentPlan.status)
      }
    });
  });

  revalidatePath("/");
}

export async function markPublishRecordPublishedAction(formData: FormData) {
  const id = requiredString(formData, "id");
  const publishedUrl = requiredString(formData, "publishedUrl");

  const publishRecord = await prisma.publishRecord.findFirst({
    where: { id, deletedAt: null, contentPlan: { deletedAt: null, digitalHuman: { deletedAt: null } } },
    select: { id: true, contentPlanId: true }
  });

  if (!publishRecord) throw new Error("Publish record was not found or is archived.");
  await requireLatestVideoAsset(publishRecord.contentPlanId);
  assertPublishStatusTransition({ status: "published", hasVideo: true, publishedUrl });

  await prisma.$transaction([
    prisma.publishRecord.update({
      where: { id },
      data: {
        status: "published",
        publishedUrl,
        publishedAt: new Date(),
        failureReason: null
      }
    }),
    prisma.publishRecordHistory.create({
      data: {
        publishRecordId: id,
        status: "published",
        note: "Manually marked as published."
      }
    }),
    prisma.contentPlan.update({
      where: { id: publishRecord.contentPlanId },
      data: { status: "published" }
    })
  ]);

  revalidatePath("/");
}

export async function savePlatformMetricAction(formData: FormData) {
  const publishRecordId = requiredString(formData, "publishRecordId");
  const publishRecord = await prisma.publishRecord.findFirst({
    where: {
      id: publishRecordId,
      deletedAt: null,
      contentPlan: { deletedAt: null, digitalHuman: { deletedAt: null } }
    },
    select: { id: true, platform: true }
  });

  if (!publishRecord) throw new Error("Publish record was not found or is archived.");

  const metric = normalizeMetricInput({
    date: requiredString(formData, "date"),
    platform: publishRecord.platform,
    views: requiredString(formData, "views"),
    likes: requiredString(formData, "likes"),
    comments: requiredString(formData, "comments"),
    shares: requiredString(formData, "shares"),
    watchTimeSeconds: requiredString(formData, "watchTimeSeconds"),
    revenue: requiredString(formData, "revenue"),
    currency: optionalString(formData, "currency")
  });

  await prisma.platformMetric.upsert({
    where: {
      publishRecordId_date: {
        publishRecordId,
        date: metric.date
      }
    },
    create: {
      publishRecordId,
      platform: metric.platform,
      date: metric.date,
      views: metric.views,
      likes: metric.likes,
      comments: metric.comments,
      shares: metric.shares,
      watchTimeSeconds: metric.watchTimeSeconds,
      revenue: metric.revenue,
      currency: metric.currency
    },
    update: {
      platform: metric.platform,
      views: metric.views,
      likes: metric.likes,
      comments: metric.comments,
      shares: metric.shares,
      watchTimeSeconds: metric.watchTimeSeconds,
      revenue: metric.revenue,
      currency: metric.currency
    }
  });

  revalidatePath("/");
}

async function requireActiveDigitalHuman(id: string) {
  const digitalHuman = await prisma.digitalHuman.findFirst({
    where: { id, deletedAt: null },
    select: { id: true }
  });

  if (!digitalHuman) throw new Error("Digital human was not found or is archived.");
}

async function requireActiveContentPlan(id: string) {
  const contentPlan = await prisma.contentPlan.findFirst({
    where: { id, deletedAt: null, digitalHuman: { deletedAt: null } },
    select: { id: true, status: true }
  });

  if (!contentPlan) throw new Error("Content plan was not found or is archived.");
  return contentPlan;
}

async function requireLatestMusicAsset(contentPlanId: string) {
  const musicAsset = await prisma.publishAsset.findFirst({
    where: { contentPlanId, assetType: "audio", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (!musicAsset) throw new Error("A music asset is required before video upload.");
  return musicAsset;
}

async function requireLatestVideoAsset(contentPlanId: string) {
  const videoAsset = await prisma.publishAsset.findFirst({
    where: { contentPlanId, assetType: "video", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  if (!videoAsset) throw new Error("A video asset is required before publish preparation.");
  return videoAsset;
}

function personaData(formData: FormData) {
  return {
    archetype: requiredString(formData, "archetype"),
    backstory: requiredString(formData, "backstory"),
    toneOfVoice: requiredString(formData, "toneOfVoice"),
    audience: requiredString(formData, "audience"),
    musicStyle: requiredString(formData, "musicStyle"),
    visualStyle: requiredString(formData, "visualStyle")
  };
}

function consentData(formData: FormData) {
  const consentedName = optionalString(formData, "consentedName");
  const documentUrl = optionalString(formData, "documentUrl");
  const scope = optionalString(formData, "scope");

  if (!consentedName || !documentUrl || !scope) return null;

  return {
    consentedName,
    documentUrl,
    scope,
    signedAt: dateFromForm(formData, "signedAt") ?? new Date(),
    expiresAt: dateFromForm(formData, "expiresAt")
  };
}

function isMusicProvider(value: string): value is MusicProviderKey {
  return musicProviders.some((provider) => provider.providerKey === value);
}

function isVideoProvider(value: string): value is VideoProviderKey {
  return videoProviders.some((provider) => provider.providerKey === value);
}

function nextMusicUploadStatus(status: ContentStatus): ContentStatus {
  return status === "idea" || status === "lyrics" ? "music_generated" : status;
}

function nextVideoUploadStatus(status: ContentStatus): ContentStatus {
  return status === "idea" || status === "lyrics" || status === "music_generated"
    ? "video_ready"
    : status;
}

function isContentStatus(value: string): value is ContentStatus {
  return ["idea", "lyrics", "music_generated", "video_ready", "published"].includes(value);
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function dateFromForm(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  return value ? new Date(`${value}T00:00:00`) : null;
}

function splitHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

function publishHistoryNote(status: PublishStatus, contentStatus: ContentStatus) {
  if (status === "ready") return "Ready for manual publishing.";
  if (status === "scheduled") return "Manual publish time scheduled.";
  if (status === "failed") return "Manual publish marked as failed.";
  return `Publish workflow saved while content status is ${contentStatus}.`;
}
