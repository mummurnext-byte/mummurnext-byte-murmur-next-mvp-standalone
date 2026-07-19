import { describe, expect, it } from "vitest";

import {
  getEnv,
  parseDigitalHumanImageProvider,
  parseLLMProvider,
  parseStorageProvider,
  validateDeploymentEnv
} from "./env";

describe("env", () => {
  it("selects supported storage providers", () => {
    expect(parseStorageProvider("local")).toBe("local");
    expect(parseStorageProvider("s3")).toBe("s3");
    expect(parseStorageProvider("r2")).toBe("r2");
    expect(parseStorageProvider("vercel_blob")).toBe("vercel_blob");
    expect(parseStorageProvider("unknown")).toBe("local");
  });

  it("selects supported llm providers", () => {
    expect(parseLLMProvider("mock")).toBe("mock");
    expect(parseLLMProvider("openai")).toBe("openai");
    expect(parseLLMProvider("gemini")).toBe("gemini");
    expect(parseLLMProvider("groq")).toBe("groq");
    expect(parseLLMProvider("openrouter")).toBe("openrouter");
    expect(parseLLMProvider("unknown")).toBe("mock");
  });

  it("selects supported digital human image providers", () => {
    expect(parseDigitalHumanImageProvider("openai")).toBe("openai");
    expect(parseDigitalHumanImageProvider("gemini")).toBe("gemini");
    expect(parseDigitalHumanImageProvider("mock")).toBe("mock");
    expect(parseDigitalHumanImageProvider("unknown")).toBe("mock");
  });

  it("reuses configured Gemini for digital-human images only when the image provider is unset", () => {
    const automatic = getEnv({ LLM_PROVIDER: "gemini", GEMINI_API_KEY: "test-only-key" });
    const explicitMock = getEnv({
      LLM_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-only-key",
      DIGITAL_HUMAN_IMAGE_PROVIDER: "mock"
    });

    expect(automatic.digitalHumanImageProvider).toBe("gemini");
    expect(automatic.digitalHumanImageModel).toBe("gemini-3.1-flash-image");
    expect(explicitMock.digitalHumanImageProvider).toBe("mock");
    expect(explicitMock.digitalHumanImageModel).toBe("gpt-image-2");
  });

  it("uses safe defaults without secrets", () => {
    const env = getEnv({});

    expect(env.appBaseUrl).toBe("http://localhost:3000");
    expect(env.llmProvider).toBe("mock");
    expect(env.llmModel).toBe("");
    expect(env.openaiApiKey).toBe("");
    expect(env.openaiModel).toBe("gpt-5.5");
    expect(env.geminiApiKey).toBe("");
    expect(env.groqApiKey).toBe("");
    expect(env.openrouterApiKey).toBe("");
    expect(env.storageProvider).toBe("local");
    expect(env.maxUploadBytes).toBe(104857600);
    expect(env.smartAIDailyLimit).toBe(20);
    expect(env.digitalHumanImageProvider).toBe("mock");
    expect(env.digitalHumanImageModel).toBe("gpt-image-2");
    expect(env.digitalHumanImageDailyLimit).toBe(5);
  });

  it("validates deployment environment settings", () => {
    const checks = validateDeploymentEnv({
      DATABASE_URL: "postgresql://example",
      APP_BASE_URL: "https://mummur.example",
      STORAGE_PROVIDER: "local",
      LLM_PROVIDER: "gemini",
      MAX_UPLOAD_BYTES: "500"
    });

    expect(checks.find((check) => check.label === "Database connected")?.ok).toBe(true);
    expect(checks.find((check) => check.label === "Storage provider configured")?.ok).toBe(true);
    expect(checks.find((check) => check.label === "LLM provider configured")?.detail).toContain("gemini selected");
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
