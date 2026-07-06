import { describe, expect, it } from "vitest";

import {
  buildTimeline,
  cancelWorkflowState,
  classifyWorkflowState,
  createWorkflowEvent,
  getNextWorkflowTransition,
  retryWorkflowState
} from "./workflow-engine";

describe("workflow engine", () => {
  it("advances a normal workflow", () => {
    expect(next("draft")).toMatchObject({ nextState: "planning", stepKey: "planning" });
    expect(next("planning")).toMatchObject({ nextState: "music_pending", stepKey: "music" });
    expect(next("music_pending", { hasMusicAsset: true })).toMatchObject({
      nextState: "music_ready",
      stepKey: "music"
    });
    expect(next("music_ready")).toMatchObject({ nextState: "video_pending", stepKey: "video" });
    expect(next("video_pending", { hasVideoAsset: true })).toMatchObject({
      nextState: "video_ready",
      stepKey: "video"
    });
    expect(next("video_ready")).toMatchObject({ nextState: "publish_ready", stepKey: "publish" });
    expect(next("publish_ready", { isScheduled: true })).toMatchObject({
      nextState: "scheduled",
      stepKey: "publish"
    });
    expect(next("scheduled")).toMatchObject({ nextState: "published", stepKey: "publish" });
    expect(classifyWorkflowState("published")).toBe("completed");
  });

  it("fails when music is missing", () => {
    const result = next("music_pending");

    expect(result.nextState).toBe("failed");
    expect(result.stepKey).toBe("music");
    expect(result.errorMessage).toContain("Music asset");
    expect(classifyWorkflowState(result.nextState)).toBe("failed");
  });

  it("retries the failed step", () => {
    expect(retryWorkflowState("failed")).toEqual({
      nextState: "planning",
      stepKey: "planning"
    });
    expect(retryWorkflowState("video_pending")).toEqual({
      nextState: "video_pending",
      stepKey: "video"
    });
  });

  it("cancels workflow into failed state", () => {
    const result = cancelWorkflowState("music_pending");

    expect(result.nextState).toBe("failed");
    expect(result.event.eventType).toBe("workflow_canceled");
    expect(result.event.actor).toBe("user");
    expect(result.event.payload).toEqual({ previousState: "music_pending" });
  });

  it("records event log payloads", () => {
    const timestamp = new Date("2026-07-06T12:00:00.000Z");
    const event = createWorkflowEvent("workflow_step_failed", "system", { stepKey: "music" }, timestamp);

    expect(event).toEqual({
      eventType: "workflow_step_failed",
      actor: "system",
      timestamp,
      payload: { stepKey: "music" }
    });
  });

  it("builds a timeline with step timestamps", () => {
    const startedAt = new Date("2026-07-06T12:00:00.000Z");
    const finishedAt = new Date("2026-07-06T12:01:00.000Z");
    const timeline = buildTimeline([
      {
        stepKey: "planning",
        state: "planning",
        startedAt,
        finishedAt,
        errorMessage: null
      },
      {
        stepKey: "music",
        state: "failed",
        startedAt,
        finishedAt,
        errorMessage: "Music asset is required before continuing workflow."
      }
    ]);

    expect(timeline).toHaveLength(4);
    expect(timeline[0]).toMatchObject({ label: "Planning", finishedAt });
    expect(timeline[1]).toMatchObject({ label: "Music Generated", state: "failed" });
    expect(timeline[2]).toMatchObject({ label: "Video Uploaded", state: "draft" });
  });
});

function next(
  currentState: Parameters<typeof getNextWorkflowTransition>[0]["currentState"],
  overrides: Partial<Parameters<typeof getNextWorkflowTransition>[0]> = {}
) {
  return getNextWorkflowTransition({
    currentState,
    hasMusicAsset: false,
    hasVideoAsset: false,
    isScheduled: false,
    isPublished: false,
    ...overrides
  });
}
