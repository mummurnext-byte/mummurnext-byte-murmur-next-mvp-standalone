import { NextResponse } from "next/server";

import { readStoredFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id.trim();
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid image id." }, { status: 400 });

  const generation = await prisma.digitalHumanImageGeneration.findFirst({
    where: {
      outputFileAssetId: id,
      status: "completed",
      deletedAt: null,
      digitalHuman: { deletedAt: null },
      outputFileAsset: { deletedAt: null, entityType: "digital_human_image_output" }
    },
    include: { outputFileAsset: true }
  });

  if (!generation?.outputFileAsset) {
    return NextResponse.json({ error: "Digital human image not found." }, { status: 404 });
  }

  const file = await readStoredFile(generation.outputFileAsset.storageKey);
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": generation.outputFileAsset.mimeType,
      "content-length": String(generation.outputFileAsset.byteSize),
      "content-disposition": `inline; filename="${generation.outputFileAsset.originalName.replace(/["\\\r\n]/g, "_")}"`,
      "cache-control": "private, max-age=300",
      "content-security-policy": "default-src 'none'; img-src data:",
      "x-content-type-options": "nosniff"
    }
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
