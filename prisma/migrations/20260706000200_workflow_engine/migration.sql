CREATE TYPE "WorkflowState" AS ENUM (
  'draft',
  'planning',
  'music_pending',
  'music_ready',
  'video_pending',
  'video_ready',
  'publish_ready',
  'scheduled',
  'published',
  'failed'
);

CREATE TYPE "WorkflowStepKey" AS ENUM (
  'planning',
  'music',
  'video',
  'publish'
);

CREATE TABLE "workflow_runs" (
  "id" UUID NOT NULL,
  "content_plan_id" UUID NOT NULL,
  "current_state" "WorkflowState" NOT NULL DEFAULT 'draft',
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),

  CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_steps" (
  "id" UUID NOT NULL,
  "workflow_run_id" UUID NOT NULL,
  "step_key" "WorkflowStepKey" NOT NULL,
  "state" "WorkflowState" NOT NULL DEFAULT 'draft',
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_events" (
  "id" UUID NOT NULL,
  "workflow_run_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL,

  CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_runs_content_plan_id_idx" ON "workflow_runs"("content_plan_id");
CREATE INDEX "workflow_runs_current_state_idx" ON "workflow_runs"("current_state");

CREATE UNIQUE INDEX "workflow_steps_workflow_run_id_step_key_key" ON "workflow_steps"("workflow_run_id", "step_key");
CREATE INDEX "workflow_steps_workflow_run_id_idx" ON "workflow_steps"("workflow_run_id");
CREATE INDEX "workflow_steps_step_key_idx" ON "workflow_steps"("step_key");
CREATE INDEX "workflow_steps_state_idx" ON "workflow_steps"("state");

CREATE INDEX "workflow_events_workflow_run_id_idx" ON "workflow_events"("workflow_run_id");
CREATE INDEX "workflow_events_event_type_idx" ON "workflow_events"("event_type");
CREATE INDEX "workflow_events_timestamp_idx" ON "workflow_events"("timestamp");

ALTER TABLE "workflow_runs"
  ADD CONSTRAINT "workflow_runs_content_plan_id_fkey"
  FOREIGN KEY ("content_plan_id") REFERENCES "content_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_steps"
  ADD CONSTRAINT "workflow_steps_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workflow_events"
  ADD CONSTRAINT "workflow_events_workflow_run_id_fkey"
  FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
