import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

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
  const extension = path.extname(input.file.name).toLowerCase();
  const storageKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  const storageRoot = path.resolve(env.localFileStorageDir);
  const storagePath = path.resolve(storageRoot, storageKey);

  if (storagePath !== storageRoot && !storagePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid file storage key.");
  }

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, buffer);

  return prisma.fileAsset.create({
    data: {
      originalName: input.file.name,
      storageKey,
      mimeType: input.file.type || "application/octet-stream",
      byteSize: input.file.size,
      checksumSha256,
      entityType: input.entityType,
      entityId: input.entityId
    }
  });
}

export async function readStoredFile(storageKey: string) {
  const env = getEnv();
  const storageRoot = path.resolve(env.localFileStorageDir);
  const storagePath = path.resolve(storageRoot, storageKey);

  if (storagePath !== storageRoot && !storagePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new Error("Invalid file storage key.");
  }

  return readFile(storagePath);
}
