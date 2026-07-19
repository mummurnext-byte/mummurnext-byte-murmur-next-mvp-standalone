export type StorageProviderKey = "local" | "s3" | "r2" | "vercel_blob";
export type LLMProviderKey = "mock" | "openai" | "gemini" | "groq" | "openrouter";
export type DigitalHumanImageProviderKey = "mock" | "openai" | "gemini";

export type DeploymentCheck = {
  label: string;
  ok: boolean;
  detail: string;
};

export type EnvSource = Partial<Record<string, string | undefined>>;

export function getEnv(source: EnvSource = process.env) {
  const maxUploadBytes = Number(source.MAX_UPLOAD_BYTES ?? 104857600);
  const llmProvider = source.LLM_PROVIDER ? parseLLMProvider(source.LLM_PROVIDER) : source.OPENAI_API_KEY ? "openai" : "mock";
  const digitalHumanImageProvider = source.DIGITAL_HUMAN_IMAGE_PROVIDER
    ? parseDigitalHumanImageProvider(source.DIGITAL_HUMAN_IMAGE_PROVIDER)
    : source.LLM_PROVIDER === "gemini" && source.GEMINI_API_KEY
      ? "gemini"
      : "mock";

  return {
    appBaseUrl: source.APP_BASE_URL ?? "http://localhost:3000",
    databaseUrl: source.DATABASE_URL ?? "",
    llmProvider,
    llmModel: source.LLM_MODEL ?? source.OPENAI_MODEL ?? "",
    openaiApiKey: source.OPENAI_API_KEY ?? "",
    openaiModel: source.OPENAI_MODEL ?? source.LLM_MODEL ?? "gpt-5.5",
    geminiApiKey: source.GEMINI_API_KEY ?? "",
    groqApiKey: source.GROQ_API_KEY ?? "",
    openrouterApiKey: source.OPENROUTER_API_KEY ?? "",
    blobReadWriteToken: source.BLOB_READ_WRITE_TOKEN ?? "",
    storageProvider: parseStorageProvider(source.STORAGE_PROVIDER),
    localFileStorageDir: source.LOCAL_FILE_STORAGE_DIR ?? "./uploads",
    maxUploadBytes: Number.isFinite(maxUploadBytes) && maxUploadBytes > 0 ? maxUploadBytes : 104857600,
    smartAIDailyLimit: parsePositiveInt(source.SMART_AI_DAILY_LIMIT, 20),
    digitalHumanImageProvider,
    digitalHumanImageModel:
      source.DIGITAL_HUMAN_IMAGE_MODEL ??
      (digitalHumanImageProvider === "gemini" ? "gemini-3.1-flash-image" : "gpt-image-2"),
    digitalHumanImageDailyLimit: parsePositiveInt(source.DIGITAL_HUMAN_IMAGE_DAILY_LIMIT, 5),
    nodeEnv: source.NODE_ENV ?? "development",
    vercelGitCommitSha: source.VERCEL_GIT_COMMIT_SHA ?? "",
    npmPackageVersion: source.npm_package_version ?? ""
  };
}

export function validateDeploymentEnv(source: EnvSource = process.env): DeploymentCheck[] {
  const env = getEnv(source);

  return [
    {
      label: "Database connected",
      ok: Boolean(env.databaseUrl),
      detail: env.databaseUrl ? "DATABASE_URL is configured." : "DATABASE_URL is missing."
    },
    {
      label: "Storage provider configured",
      ok: env.storageProvider === "local" || (env.storageProvider === "vercel_blob" && Boolean(env.blobReadWriteToken)),
      detail: storageProviderDetail(env)
    },
    {
      label: "LLM provider configured",
      ok: true,
      detail: llmProviderDetail(env)
    },
    {
      label: "App base URL",
      ok: Boolean(env.appBaseUrl),
      detail: env.appBaseUrl
    },
    {
      label: "Upload file size limit",
      ok: env.maxUploadBytes > 0,
      detail: `${env.maxUploadBytes} bytes`
    },
    {
      label: "Environment mode",
      ok: true,
      detail: env.nodeEnv
    }
  ];
}

export function parseStorageProvider(value?: string): StorageProviderKey {
  if (value === "s3" || value === "r2" || value === "vercel_blob") return value;
  return "local";
}

export function parseLLMProvider(value?: string): LLMProviderKey {
  if (value === "openai" || value === "gemini" || value === "groq" || value === "openrouter") return value;
  return "mock";
}

export function parseDigitalHumanImageProvider(value?: string): DigitalHumanImageProviderKey {
  if (value === "openai" || value === "gemini") return value;
  return "mock";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function storageProviderDetail(env: ReturnType<typeof getEnv>) {
  if (env.storageProvider === "local") {
    return "Using LocalStorageProvider. Use object storage before production uploads.";
  }

  if (env.storageProvider === "vercel_blob") {
    return env.blobReadWriteToken
      ? "Using Vercel Blob for durable uploaded media."
      : "Vercel Blob selected but BLOB_READ_WRITE_TOKEN is missing.";
  }

  return `${env.storageProvider} is selected but not implemented in this MVP.`;
}

function llmProviderDetail(env: ReturnType<typeof getEnv>) {
  if (env.llmProvider === "mock") {
    return "Using MockLLMProvider for local or free development.";
  }

  const keyConfigured =
    (env.llmProvider === "openai" && Boolean(env.openaiApiKey)) ||
    (env.llmProvider === "gemini" && Boolean(env.geminiApiKey)) ||
    (env.llmProvider === "groq" && Boolean(env.groqApiKey)) ||
    (env.llmProvider === "openrouter" && Boolean(env.openrouterApiKey));

  return keyConfigured
    ? `${env.llmProvider} key is configured.`
    : `${env.llmProvider} selected but API key is missing; app will use mock text generation.`;
}
