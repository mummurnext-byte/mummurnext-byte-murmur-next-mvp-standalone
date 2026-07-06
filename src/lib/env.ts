export type StorageProviderKey = "local" | "s3" | "r2" | "vercel_blob";

export type DeploymentCheck = {
  label: string;
  ok: boolean;
  detail: string;
};

export type EnvSource = Partial<Record<string, string | undefined>>;

export function getEnv(source: EnvSource = process.env) {
  const maxUploadBytes = Number(source.MAX_UPLOAD_BYTES ?? 104857600);

  return {
    appBaseUrl: source.APP_BASE_URL ?? "http://localhost:3000",
    databaseUrl: source.DATABASE_URL ?? "",
    openaiApiKey: source.OPENAI_API_KEY ?? "",
    storageProvider: parseStorageProvider(source.STORAGE_PROVIDER),
    localFileStorageDir: source.LOCAL_FILE_STORAGE_DIR ?? "./uploads",
    maxUploadBytes: Number.isFinite(maxUploadBytes) && maxUploadBytes > 0 ? maxUploadBytes : 104857600,
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
      ok: env.storageProvider === "local",
      detail:
        env.storageProvider === "local"
          ? "Using LocalStorageProvider. Use object storage before production uploads."
          : `${env.storageProvider} is selected but not implemented in this MVP.`
    },
    {
      label: "LLM provider configured",
      ok: true,
      detail: env.openaiApiKey ? "OpenAI key is configured." : "OpenAI key missing; app will use mock text generation."
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
