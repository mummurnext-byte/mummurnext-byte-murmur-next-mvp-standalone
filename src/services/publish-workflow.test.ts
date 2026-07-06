import { describe, expect, it } from "vitest";

import {
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
      publishTitle: "Mummur Test",
      publishDescription: "Manual publish caption",
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
});
