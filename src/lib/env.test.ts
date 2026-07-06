import { describe, expect, it } from "vitest";

import { getEnv, parseStorageProvider, validateDeploymentEnv } from "./env";

describe("env", () => {
  it("selects supported storage providers", () => {
    expect(parseStorageProvider("local")).toBe("local");
    expect(parseStorageProvider("s3")).toBe("s3");
    expect(parseStorageProvider("r2")).toBe("r2");
    expect(parseStorageProvider("vercel_blob")).toBe("vercel_blob");
    expect(parseStorageProvider("unknown")).toBe("local");
  });

  it("uses safe defaults without secrets", () => {
    const env = getEnv({});

    expect(env.appBaseUrl).toBe("http://localhost:3000");
    expect(env.openaiApiKey).toBe("");
    expect(env.storageProvider).toBe("local");
    expect(env.maxUploadBytes).toBe(104857600);
  });

  it("validates deployment environment settings", () => {
    const checks = validateDeploymentEnv({
      DATABASE_URL: "postgresql://example",
      APP_BASE_URL: "https://mummur.example",
      STORAGE_PROVIDER: "local",
      OPENAI_API_KEY: "",
      MAX_UPLOAD_BYTES: "500"
    });

    expect(checks.find((check) => check.label === "Database connected")?.ok).toBe(true);
    expect(checks.find((check) => check.label === "Storage provider configured")?.ok).toBe(true);
    expect(checks.find((check) => check.label === "LLM provider configured")?.detail).toContain("mock");
    expect(checks.find((check) => check.label === "Upload file size limit")?.detail).toBe("500 bytes");
  });

  it("requires a token when Vercel Blob is selected", () => {
    const missingToken = validateDeploymentEnv({
      STORAGE_PROVIDER: "vercel_blob"
    });
    const withToken = validateDeploymentEnv({
      STORAGE_PROVIDER: "vercel_blob",
      BLOB_READ_WRITE_TOKEN: "example-token"
    });

    expect(missingToken.find((check) => check.label === "Storage provider configured")?.ok).toBe(false);
    expect(withToken.find((check) => check.label === "Storage provider configured")?.ok).toBe(true);
  });
});
