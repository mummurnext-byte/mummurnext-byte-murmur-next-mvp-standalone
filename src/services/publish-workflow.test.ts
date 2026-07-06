import { describe, expect, it } from "vitest";

import {
  assertPublishStatusTransition,
  defaultPublishCopy,
  isPublishPlatform,
  isPublishStatus,
  scheduledAtFromInput,
  splitPublishHashtags
} from "./publish-workflow";

describe("publish workflow helpers", () => {
  it("validates manual publish statuses and platforms", () => {
    expect(isPublishStatus("ready")).toBe(true);
    expect(isPublishStatus("queued")).toBe(false);
    expect(isPublishPlatform("youtube_shorts")).toBe(true);
    expect(isPublishPlatform("instagram")).toBe(false);
  });

  it("builds default publish copy from a content plan", () => {
    expect(
      defaultPublishCopy({
        title: "Mummur Test",
        caption: "Manual publish caption",
        hashtags: ["#MummurNext", "#AIMusic"]
      })
    ).toEqual({
      title: "Mummur Test",
      description: "Manual publish caption",
      hashtags: ["#MummurNext", "#AIMusic"]
    });
  });

  it("normalizes hashtags and requires scheduledAt for scheduled posts", () => {
    expect(splitPublishHashtags("#MummurNext, AIMusic youtube")).toEqual([
      "#MummurNext",
      "#AIMusic",
      "#youtube"
    ]);
    expect(scheduledAtFromInput("ready", null)).toBeNull();
    expect(scheduledAtFromInput("scheduled", "2026-07-06T12:00")).toBeInstanceOf(Date);
    expect(() => scheduledAtFromInput("scheduled", null)).toThrow("scheduledAt is required");
  });

  it("blocks ready and scheduled states when no video asset exists", () => {
    expect(() => assertPublishStatusTransition({ status: "ready", hasVideo: false })).toThrow(
      "video asset is required"
    );
    expect(() => assertPublishStatusTransition({ status: "scheduled", hasVideo: false })).toThrow(
      "video asset is required"
    );
    expect(() => assertPublishStatusTransition({ status: "ready", hasVideo: true })).not.toThrow();
  });

  it("requires publishedUrl when manually marking published", () => {
    expect(() => assertPublishStatusTransition({ status: "published", hasVideo: true })).toThrow(
      "publishedUrl is required"
    );
    expect(() =>
      assertPublishStatusTransition({
        status: "published",
        hasVideo: true,
        publishedUrl: "https://youtube.com/watch?v=test"
      })
    ).not.toThrow();
  });

  it("requires failureReason for failed publish records", () => {
    expect(() => assertPublishStatusTransition({ status: "failed", hasVideo: true })).toThrow(
      "failureReason is required"
    );
    expect(() =>
      assertPublishStatusTransition({
        status: "failed",
        hasVideo: true,
        failureReason: "Manual upload failed"
      })
    ).not.toThrow();
  });
});
