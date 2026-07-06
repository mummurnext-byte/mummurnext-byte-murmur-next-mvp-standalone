import { describe, expect, it } from "vitest";

import { buildDeploymentChecklist, renderDeploymentChecklistText } from "./deployment-checklist";

describe("deployment checklist", () => {
  it("renders database and environment status", () => {
    const checklist = buildDeploymentChecklist({
      databaseConnected: true,
      env: {
        DATABASE_URL: "postgresql://example",
        APP_BASE_URL: "https://mummur.example",
        NODE_ENV: "production",
        STORAGE_PROVIDER: "local",
        VERCEL_GIT_COMMIT_SHA: "abc123"
      }
    });

    expect(checklist.buildVersion).toBe("abc123");
    expect(checklist.appBaseUrl).toBe("https://mummur.example");
    expect(checklist.environmentMode).toBe("production");
    expect(checklist.items.find((item) => item.label === "Database connected")?.ok).toBe(true);
  });

  it("renders text output without secrets", () => {
    const checklist = buildDeploymentChecklist({
      databaseConnected: false,
      env: {
        LLM_PROVIDER: "openai",
        OPENAI_API_KEY: "secret-key",
        STORAGE_PROVIDER: "local"
      }
    });

    const text = renderDeploymentChecklistText(checklist);

    expect(text).toContain("WARN Database connected");
    expect(text).toContain("openai key is configured");
    expect(text).not.toContain("secret-key");
  });
});
