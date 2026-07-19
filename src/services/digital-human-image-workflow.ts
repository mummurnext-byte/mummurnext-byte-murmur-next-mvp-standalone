import { createHash } from "node:crypto";

import { storeFileBuffer } from "@/lib/file-storage";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  assertDigitalHumanImageBytes,
  assertDigitalHumanImageDailyLimit,
  assertDigitalHumanImageFile,
  buildDigitalHumanImagePrompt,
  parseDigitalHumanImageStyle,
  startOfUtcDay
} from "@/services/digital-human-image";
import { createDigitalHumanImageProvider } from "@/services/digital-human-image-provider";

export async function generateDigitalHumanImage(input: {
  digitalHumanId: string;
  file: File;
  style: string;
  consentConfirmed: boolean;
}) {
  if (!input.consentConfirmed) {
    throw new Error("Confirm that the portrait owner authorized this digital-human image generation.");
  }

  assertDigitalHumanImageFile(input.file);
  const sourceBuffer = Buffer.from(await input.file.arrayBuffer());
  assertDigitalHumanImageBytes(sourceBuffer, input.file.type);

  const now = new Date();
  const [digitalHuman, consentRecord, generationCount] = await Promise.all([
    prisma.digitalHuman.findFirst({
      where: { id: input.digitalHumanId, deletedAt: null },
      include: { persona: true }
    }),
    prisma.consentRecord.findFirst({
      where: {
        digitalHumanId: input.digitalHumanId,
        deletedAt: null,
        signedAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: { signedAt: "desc" }
    }),
    prisma.digitalHumanImageGeneration.count({
      where: { createdAt: { gte: startOfUtcDay(now) }, deletedAt: null }
    })
  ]);

  if (!digitalHuman) throw new Error("Digital human was not found or is archived.");
  if (!consentRecord) throw new Error("An active Consent Record is required before generating a digital human image.");
  assertDigitalHumanImageDailyLimit(generationCount, getEnv().digitalHumanImageDailyLimit);

  const style = parseDigitalHumanImageStyle(input.style);
  const provider = createDigitalHumanImageProvider();
  const prompt = buildDigitalHumanImagePrompt({
    style,
    visualStyle: digitalHuman.persona?.visualStyle,
    archetype: digitalHuman.persona?.archetype
  });
  const generation = await prisma.digitalHumanImageGeneration.create({
    data: {
      digitalHumanId: digitalHuman.id,
      consentRecordId: consentRecord.id,
      sourceOriginalName: input.file.name,
      sourceMimeType: input.file.type,
      sourceByteSize: sourceBuffer.byteLength,
      sourceChecksumSha256: createHash("sha256").update(sourceBuffer).digest("hex"),
      provider: provider.providerKey,
      model: provider.model,
      style,
      prompt
    }
  });

  try {
    const result = await provider.generate({
      sourceImage: sourceBuffer,
      sourceMimeType: input.file.type,
      sourceFileName: input.file.name,
      prompt
    });
    const outputAsset = await storeFileBuffer({
      buffer: result.buffer,
      fileName: `digital-human-${digitalHuman.id}${result.extension}`,
      mimeType: result.mimeType,
      entityType: "digital_human_image_output",
      entityId: digitalHuman.id
    });
    const avatarUrl = `/api/digital-human-images/${outputAsset.id}`;

    await prisma.$transaction([
      prisma.digitalHumanImageGeneration.update({
        where: { id: generation.id },
        data: {
          outputFileAssetId: outputAsset.id,
          provider: result.provider,
          model: result.model,
          status: "completed",
          finishedAt: new Date()
        }
      }),
      prisma.digitalHuman.update({
        where: { id: digitalHuman.id },
        data: { avatarUrl }
      })
    ]);

    return { generationId: generation.id, avatarUrl, provider: result.provider };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digital human image generation failed.";
    await prisma.digitalHumanImageGeneration.update({
      where: { id: generation.id },
      data: { status: "failed", errorMessage: message.slice(0, 1000), finishedAt: new Date() }
    });
    throw new Error(message);
  }
}
