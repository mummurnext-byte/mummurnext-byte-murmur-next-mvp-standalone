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
    publishTitle: contentPlan.title,
    publishDescription: contentPlan.caption,
    hashtags: contentPlan.hashtags
  };
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
