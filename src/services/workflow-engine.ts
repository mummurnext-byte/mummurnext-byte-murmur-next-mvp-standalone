import type { PrismaClient, WorkflowState, WorkflowStepKey } from "@prisma/client";

export type WorkflowActor = "system" | "user";

export const workflowStates: WorkflowState[] = [
  "draft",
  "planning",
  "music_pending",
  "music_ready",
  "video_pending",
  "video_ready",
  "publish_ready",
  "scheduled",
  "published",
  "failed"
];

export const workflowStepKeys: WorkflowStepKey[] = ["planning", "music", "video", "publish"];

export type WorkflowSnapshot = {
  currentState: WorkflowState;
  hasMusicAsset: boolean;
  hasVideoAsset: boolean;
  isScheduled: boolean;
  isPublished: boolean;
};

export type WorkflowTransition = {
  nextState: WorkflowState;
  stepKey: WorkflowStepKey;
  completed: boolean;
  errorMessage: string | null;
};

export type WorkflowEventRecord = {
  eventType: string;
  actor: WorkflowActor;
  timestamp: Date;
  payload: Record<string, unknown>;
};

export function getNextWorkflowTransition(snapshot: WorkflowSnapshot): WorkflowTransition {
  if (snapshot.currentState === "failed") {
    return { nextState: "failed", stepKey: "planning", completed: false, errorMessage: "Workflow is failed." };
  }

  if (snapshot.currentState === "published" || snapshot.isPublished) {
    return { nextState: "published", stepKey: "publish", completed: true, errorMessage: null };
  }

  if (snapshot.currentState === "draft") {
    return { nextState: "planning", stepKey: "planning", completed: true, errorMessage: null };
  }

  if (snapshot.currentState === "planning") {
    return { nextState: "music_pending", stepKey: "music", completed: false, errorMessage: null };
  }

  if (snapshot.currentState === "music_pending") {
    if (!snapshot.hasMusicAsset) {
      return {
        nextState: "failed",
        stepKey: "music",
        completed: false,
        errorMessage: "Music asset is required before continuing workflow."
      };
    }
    return { nextState: "music_ready", stepKey: "music", completed: true, errorMessage: null };
  }

  if (snapshot.currentState === "music_ready") {
    return { nextState: "video_pending", stepKey: "video", completed: false, errorMessage: null };
  }

  if (snapshot.currentState === "video_pending") {
    if (!snapshot.hasVideoAsset) {
      return {
        nextState: "failed",
        stepKey: "video",
        completed: false,
        errorMessage: "Video asset is required before continuing workflow."
      };
    }
    return { nextState: "video_ready", stepKey: "video", completed: true, errorMessage: null };
  }

  if (snapshot.currentState === "video_ready") {
    return { nextState: "publish_ready", stepKey: "publish", completed: true, errorMessage: null };
  }

  if (snapshot.currentState === "publish_ready") {
    return { nextState: snapshot.isScheduled ? "scheduled" : "publish_ready", stepKey: "publish", completed: snapshot.isScheduled, errorMessage: null };
  }

  if (snapshot.currentState === "scheduled") {
    return { nextState: "published", stepKey: "publish", completed: true, errorMessage: null };
  }

  return { nextState: "draft", stepKey: "planning", completed: false, errorMessage: null };
}

export function classifyWorkflowState(state: WorkflowState): "waiting" | "running" | "failed" | "completed" {
  if (state === "failed") return "failed";
  if (state === "published") return "completed";
  if (state === "planning" || state === "music_pending" || state === "video_pending") return "running";
  return "waiting";
}

export function createWorkflowEvent(
  eventType: string,
  actor: WorkflowActor,
  payload: Record<string, unknown>,
  timestamp = new Date()
): WorkflowEventRecord {
  return { eventType, actor, timestamp, payload };
}

export function retryWorkflowState(currentState: WorkflowState): { nextState: WorkflowState; stepKey: WorkflowStepKey } {
  const stepKey = stepKeyForState(currentState);
  return { nextState: stateForStep(stepKey), stepKey };
}

export function cancelWorkflowState(currentState: WorkflowState) {
  return {
    nextState: "failed" as WorkflowState,
    event: createWorkflowEvent("workflow_canceled", "user", { previousState: currentState })
  };
}

export function buildTimeline(
  steps: Array<{
    stepKey: WorkflowStepKey;
    state: WorkflowState;
    startedAt: Date | null;
    finishedAt: Date | null;
    errorMessage: string | null;
  }>
) {
  return workflowStepKeys.map((stepKey) => {
    const step = steps.find((item) => item.stepKey === stepKey);
    return {
      stepKey,
      label: stepLabel(stepKey),
      state: step?.state ?? "draft",
      startedAt: step?.startedAt ?? null,
      finishedAt: step?.finishedAt ?? null,
      errorMessage: step?.errorMessage ?? null
    };
  });
}

export class WorkflowService {
  constructor(private readonly prisma: PrismaClient) {}

  async startWorkflow(contentPlanId: string) {
    const contentPlan = await this.prisma.contentPlan.findFirst({
      where: { id: contentPlanId, deletedAt: null },
      select: { id: true }
    });

    if (!contentPlan) throw new Error("Content plan was not found or is archived.");

    const existing = await this.prisma.workflowRun.findFirst({
      where: {
        contentPlanId,
        deletedAt: null,
        currentState: { notIn: ["published", "failed"] }
      },
      include: { steps: true, events: true }
    });

    if (existing) return existing;

    return this.prisma.workflowRun.create({
      data: {
        contentPlanId,
        currentState: "planning",
        startedAt: new Date(),
        steps: {
          create: workflowStepKeys.map((stepKey) => ({
            stepKey,
            state: stepKey === "planning" ? "planning" : "draft",
            startedAt: stepKey === "planning" ? new Date() : null
          }))
        },
        events: {
          create: {
            eventType: "workflow_started",
            actor: "user",
            payload: { contentPlanId }
          }
        }
      },
      include: { steps: true, events: true }
    });
  }

  async nextStep(workflowRunId: string) {
    const workflow = await this.loadWorkflow(workflowRunId);
    const snapshot = await this.snapshot(workflow.id, workflow.contentPlanId, workflow.currentState);
    const transition = getNextWorkflowTransition(snapshot);
    return this.applyTransition(workflow.id, transition, "system");
  }

  async retryStep(workflowRunId: string) {
    const workflow = await this.loadWorkflow(workflowRunId);
    const failedStep = workflow.steps.find((step) => step.state === "failed");
    const stepKey = failedStep?.stepKey ?? stepKeyForState(workflow.currentState);

    await this.prisma.workflowStep.upsert({
      where: { workflowRunId_stepKey: { workflowRunId, stepKey } },
      create: {
        workflowRunId,
        stepKey,
        state: stateForStep(stepKey),
        startedAt: new Date(),
        retryCount: 1
      },
      update: {
        state: stateForStep(stepKey),
        startedAt: new Date(),
        finishedAt: null,
        durationMs: null,
        errorMessage: null,
        retryCount: { increment: 1 }
      }
    });

    await this.prisma.workflowEvent.create({
      data: {
        workflowRunId,
        eventType: "workflow_retried",
        actor: "user",
        payload: { stepKey }
      }
    });

    return this.prisma.workflowRun.update({
      where: { id: workflowRunId },
      data: {
        currentState: stateForStep(stepKey),
        errorMessage: null,
        finishedAt: null
      },
      include: { steps: true, events: true }
    });
  }

  async cancelWorkflow(workflowRunId: string) {
    const workflow = await this.loadWorkflow(workflowRunId);
    const now = new Date();

    return this.prisma.workflowRun.update({
      where: { id: workflow.id },
      data: {
        currentState: "failed",
        finishedAt: now,
        errorMessage: "Workflow canceled by user.",
        events: {
          create: {
            eventType: "workflow_canceled",
            actor: "user",
            payload: { previousState: workflow.currentState }
          }
        }
      },
      include: { steps: true, events: true }
    });
  }

  private async applyTransition(workflowRunId: string, transition: WorkflowTransition, actor: WorkflowActor) {
    const now = new Date();
    const startedAt = transition.completed ? null : now;
    const finishedAt = transition.completed || transition.errorMessage ? now : null;
    const previousStep = await this.prisma.workflowStep.findUnique({
      where: { workflowRunId_stepKey: { workflowRunId, stepKey: transition.stepKey } }
    });
    const durationMs =
      previousStep?.startedAt && finishedAt ? Math.max(0, finishedAt.getTime() - previousStep.startedAt.getTime()) : null;

    await this.prisma.workflowStep.upsert({
      where: { workflowRunId_stepKey: { workflowRunId, stepKey: transition.stepKey } },
      create: {
        workflowRunId,
        stepKey: transition.stepKey,
        state: transition.errorMessage ? "failed" : transition.nextState,
        startedAt,
        finishedAt,
        durationMs,
        errorMessage: transition.errorMessage
      },
      update: {
        state: transition.errorMessage ? "failed" : transition.nextState,
        startedAt: previousStep?.startedAt ?? startedAt,
        finishedAt,
        durationMs,
        errorMessage: transition.errorMessage
      }
    });

    return this.prisma.workflowRun.update({
      where: { id: workflowRunId },
      data: {
        currentState: transition.nextState,
        finishedAt: transition.nextState === "published" || transition.nextState === "failed" ? now : null,
        errorMessage: transition.errorMessage,
        events: {
          create: {
            eventType: transition.errorMessage ? "workflow_step_failed" : "workflow_step_advanced",
            actor,
            payload: {
              stepKey: transition.stepKey,
              nextState: transition.nextState,
              errorMessage: transition.errorMessage
            }
          }
        }
      },
      include: { steps: true, events: true }
    });
  }

  private async loadWorkflow(workflowRunId: string) {
    const workflow = await this.prisma.workflowRun.findFirst({
      where: { id: workflowRunId, deletedAt: null },
      include: { steps: true, events: true }
    });

    if (!workflow) throw new Error("Workflow was not found or is archived.");
    return workflow;
  }

  private async snapshot(workflowRunId: string, contentPlanId: string, currentState: WorkflowState): Promise<WorkflowSnapshot> {
    const [musicAsset, videoAsset, scheduledPost, publishedPost] = await Promise.all([
      this.prisma.publishAsset.findFirst({
        where: { contentPlanId, assetType: "audio", deletedAt: null },
        select: { id: true }
      }),
      this.prisma.publishAsset.findFirst({
        where: { contentPlanId, assetType: "video", deletedAt: null },
        select: { id: true }
      }),
      this.prisma.platformPost.findFirst({
        where: { contentPlanId, status: "scheduled", deletedAt: null },
        select: { id: true }
      }),
      this.prisma.platformPost.findFirst({
        where: { contentPlanId, status: "published", deletedAt: null },
        select: { id: true }
      })
    ]);

    return {
      currentState,
      hasMusicAsset: Boolean(musicAsset),
      hasVideoAsset: Boolean(videoAsset),
      isScheduled: Boolean(scheduledPost),
      isPublished: Boolean(publishedPost) || (await this.hasPublishedContentPlan(workflowRunId))
    };
  }

  private async hasPublishedContentPlan(workflowRunId: string) {
    const workflow = await this.prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      select: { contentPlan: { select: { status: true } } }
    });

    return workflow?.contentPlan.status === "published";
  }
}

function stepKeyForState(state: WorkflowState): WorkflowStepKey {
  if (state === "music_pending" || state === "music_ready") return "music";
  if (state === "video_pending" || state === "video_ready") return "video";
  if (state === "publish_ready" || state === "scheduled" || state === "published") return "publish";
  return "planning";
}

function stateForStep(stepKey: WorkflowStepKey): WorkflowState {
  if (stepKey === "music") return "music_pending";
  if (stepKey === "video") return "video_pending";
  if (stepKey === "publish") return "publish_ready";
  return "planning";
}

function stepLabel(stepKey: WorkflowStepKey) {
  if (stepKey === "planning") return "Planning";
  if (stepKey === "music") return "Music Generated";
  if (stepKey === "video") return "Video Uploaded";
  return "Publish Ready";
}
