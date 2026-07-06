import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEnv, type EnvSource, type StorageProviderKey } from "@/lib/env";

export type StoredObject = {
  storageKey: string;
  publicUrl: string | null;
};

export type StoreObjectInput = {
  fileName: string;
  buffer: Buffer;
};

export interface ObjectStorageProvider {
  readonly providerKey: StorageProviderKey;
  readonly providerName: string;
  readonly isConfigured: boolean;
  storeObject(input: StoreObjectInput): Promise<StoredObject>;
  readObject(storageKey: string): Promise<Buffer>;
}

export class LocalStorageProvider implements ObjectStorageProvider {
  readonly providerKey = "local" as const;
  readonly providerName = "Local filesystem";
  readonly isConfigured = true;

  async storeObject(input: StoreObjectInput): Promise<StoredObject> {
    const storageKey = buildStorageKey(input.fileName);
    const storagePath = resolveLocalStoragePath(storageKey);

    await mkdir(path.dirname(storagePath), { recursive: true });
    await writeFile(storagePath, input.buffer);

    return { storageKey, publicUrl: null };
  }

  async readObject(storageKey: string): Promise<Buffer> {
    return readFile(resolveLocalStoragePath(storageKey));
  }
}

export class PlaceholderObjectStorageProvider implements ObjectStorageProvider {
  readonly isConfigured = false;

  constructor(
    readonly providerKey: Exclude<StorageProviderKey, "local">,
    readonly providerName: string
  ) {}

  async storeObject(): Promise<StoredObject> {
    throw new Error(`${this.providerName} is reserved for future production storage integration.`);
  }

  async readObject(): Promise<Buffer> {
    throw new Error(`${this.providerName} is reserved for future production storage integration.`);
  }
}

export function getObjectStorageProvider(providerKey = getEnv().storageProvider): ObjectStorageProvider {
  if (providerKey === "local") return new LocalStorageProvider();
  if (providerKey === "s3") return new PlaceholderObjectStorageProvider("s3", "Amazon S3");
  if (providerKey === "r2") return new PlaceholderObjectStorageProvider("r2", "Cloudflare R2");
  return new PlaceholderObjectStorageProvider("vercel_blob", "Vercel Blob");
}

export function isLocalStorageProductionRisk(source: EnvSource = process.env) {
  return getEnv(source).storageProvider === "local" && source.NODE_ENV === "production";
}

function buildStorageKey(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
}

function resolveLocalStoragePath(storageKey: string) {
  const storageRoot = path.resolve(getEnv().localFileStorageDir);
  const storagePath = path.resolve(storageRoot, storageKey);

  if (storagePath !== storageRoot && !storagePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid file storage key.");
  }

  return storagePath;
}
