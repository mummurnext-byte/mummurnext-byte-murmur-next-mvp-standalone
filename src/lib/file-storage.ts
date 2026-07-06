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
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
  const storage = await getObjectStorageProvider().storeObject({
    fileName: input.file.name,
    buffer
  });

  return prisma.fileAsset.create({
    data: {
      originalName: input.file.name,
      storageKey: storage.storageKey,
      mimeType: input.file.type || "application/octet-stream",
      byteSize: input.file.size,
      checksumSha256,
      entityType: input.entityType,
      entityId: input.entityId
    }
  });
}

export async function readStoredFile(storageKey: string) {
  return getObjectStorageProvider().readObject(storageKey);
}
