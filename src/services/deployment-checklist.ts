import type { DeploymentCheck, EnvSource } from "@/lib/env";
import { getEnv, validateDeploymentEnv } from "@/lib/env";

export type DeploymentChecklistItem = DeploymentCheck & {
  key: string;
};

export type DeploymentChecklist = {
  items: DeploymentChecklistItem[];
  buildVersion: string;
  appBaseUrl: string;
  environmentMode: string;
};

export function buildDeploymentChecklist(input: {
  env?: EnvSource;
  databaseConnected: boolean;
}): DeploymentChecklist {
  const env = getEnv(input.env);
  const checks = validateDeploymentEnv(input.env);
  const items: DeploymentChecklistItem[] = [
    {
      key: "database",
      label: "Database connected",
      ok: input.databaseConnected,
      detail: input.databaseConnected ? "Database responded to health check." : "Database health check failed."
    },
    ...checks
      .filter((check) => check.label !== "Database connected")
      .map((check) => ({
        key: keyForLabel(check.label),
        ...check
      }))
  ];

  return {
    items,
    buildVersion: env.vercelGitCommitSha || env.npmPackageVersion || "local",
    appBaseUrl: env.appBaseUrl,
    environmentMode: env.nodeEnv
  };
}

export function renderDeploymentChecklistText(checklist: DeploymentChecklist) {
  return checklist.items.map((item) => `${item.ok ? "PASS" : "WARN"} ${item.label}: ${item.detail}`).join("\n");
}

function keyForLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
