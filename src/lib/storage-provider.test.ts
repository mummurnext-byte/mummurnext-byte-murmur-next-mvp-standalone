import { describe, expect, it } from "vitest";

import {
  getObjectStorageProvider,
  isLocalStorageProductionRisk,
  VercelBlobStorageProvider
} from "./storage-provider";

describe("storage provider", () => {
  it("selects local storage for the MVP", () => {
    const provider = getObjectStorageProvider("local");

    expect(provider.providerKey).toBe("local");
    expect(provider.providerName).toBe("Local filesystem");
    expect(provider.isConfigured).toBe(true);
  });

  it("reserves future S3 and R2 providers", () => {
    expect(getObjectStorageProvider("s3").isConfigured).toBe(false);
    expect(getObjectStorageProvider("r2").providerName).toBe("Cloudflare R2");
  });

  it("selects Vercel Blob storage for production uploads", () => {
    const provider = getObjectStorageProvider("vercel_blob");

    expect(provider).toBeInstanceOf(VercelBlobStorageProvider);
    expect(provider.providerName).toBe("Vercel Blob");
  });

  it("flags local storage as a production durability risk", () => {
    expect(isLocalStorageProductionRisk({ NODE_ENV: "production", STORAGE_PROVIDER: "local" })).toBe(true);
    expect(isLocalStorageProductionRisk({ NODE_ENV: "production", STORAGE_PROVIDER: "s3" })).toBe(false);
  });
});
