import { describe, expect, it } from "vitest";

import { getObjectStorageProvider, isLocalStorageProductionRisk } from "./storage-provider";

describe("storage provider", () => {
  it("selects local storage for the MVP", () => {
    const provider = getObjectStorageProvider("local");

    expect(provider.providerKey).toBe("local");
    expect(provider.providerName).toBe("Local filesystem");
    expect(provider.isConfigured).toBe(true);
  });

  it("reserves future object storage providers", () => {
    expect(getObjectStorageProvider("s3").isConfigured).toBe(false);
    expect(getObjectStorageProvider("r2").providerName).toBe("Cloudflare R2");
    expect(getObjectStorageProvider("vercel_blob").providerName).toBe("Vercel Blob");
  });

  it("flags local storage as a production durability risk", () => {
    expect(isLocalStorageProductionRisk({ NODE_ENV: "production", STORAGE_PROVIDER: "local" })).toBe(true);
    expect(isLocalStorageProductionRisk({ NODE_ENV: "production", STORAGE_PROVIDER: "s3" })).toBe(false);
  });
});
