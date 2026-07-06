import type { PublishStatus, TargetPlatform } from "@prisma/client";

export const publishStatuses: PublishStatus[] = ["draft", "ready", "scheduled", "published", "failed"];
export const publishPlatforms: TargetPlatform[] = ["tiktok", "youtube_shorts", "youtube"];

export type PublishCopySource = {
  title: string;
  caption: string;
  hashtags: string[];
};

export function isPublishStatus(value: string): value is PublishStatus {
  return publishStatuses.includes(value as PublishStatus);
}

export function isPublishPlatform(value: string): value is TargetPlatform {
  return publishPlatforms.includes(value as TargetPlatform);
}

export function defaultPublishCopy(contentPlan: PublishCopySource) {
  return {
    title: contentPlan.title,
    description: contentPlan.caption,
    hashtags: contentPlan.hashtags
  };
}

export function assertPublishStatusTransition(input: {
  status: PublishStatus;
  hasVideo: boolean;
  publishedUrl?: string | null;
  failureReason?: string | null;
}) {
  if (input.status === "ready" && !input.hasVideo) {
    throw new Error("A video asset is required before marking a publish record ready.");
  }

  if (input.status === "scheduled" && !input.hasVideo) {
    throw new Error("A video asset is required before scheduling a publish record.");
  }

  if (input.status === "published" && !input.publishedUrl) {
    throw new Error("publishedUrl is required when marking a publish record published.");
  }

  if (input.status === "failed" && !input.failureReason) {
    throw new Error("failureReason is required when marking a publish record failed.");
  }
}

export function splitPublishHashtags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

export function scheduledAtFromInput(status: PublishStatus, value: string | null) {
  if (!value) {
    if (status === "scheduled") throw new Error("scheduledAt is required for scheduled posts.");
    return null;
  }

  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("scheduledAt must be a valid date.");

  return scheduledAt;
}
