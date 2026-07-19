import { createHash } from "node:crypto";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getObjectStorageProvider } from "@/lib/storage-provider";

export async function storeUploadedFile(input: {
  file: File;
  entityType: string;
  entityId: string;
}) {
  const env = getEnv();

  if (input.file.size > env.maxUploadBytes) {
    throw new Error(`File exceeds maximum size of ${env.maxUploadBytes} bytes.`);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  return storeFileBuffer({
    buffer,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    entityType: input.entityType,
    entityId: input.entityId
  });
}

export async function storeFileBuffer(input: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  entityType: string;
  entityId: string;
}) {
  const env = getEnv();

  if (input.buffer.byteLength > env.maxUploadBytes) {
    throw new Error(`File exceeds maximum size of ${env.maxUploadBytes} bytes.`);
  }

  const checksumSha256 = createHash("sha256").update(input.buffer).digest("hex");
  const storage = await getObjectStorageProvider().storeObject({
    fileName: input.fileName,
    buffer: input.buffer
  });

  return prisma.fileAsset.create({
    data: {
      originalName: input.fileName,
      storageKey: storage.storageKey,
      mimeType: input.mimeType,
      byteSize: input.buffer.byteLength,
      checksumSha256,
      entityType: input.entityType,
      entityId: input.entityId
    }
  });
}

export async function readStoredFile(storageKey: string) {
  return getObjectStorageProvider().readObject(storageKey);
}
