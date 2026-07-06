import { NextResponse } from "next/server";

import { readStoredFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = normalizeId((await params).id);

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid asset id." }, { status: 400 });
  }

  const asset = await prisma.publishAsset.findFirst({
    where: {
      id,
      deletedAt: null,
      contentPlan: {
        deletedAt: null,
        digitalHuman: { deletedAt: null }
      }
    },
    include: {
      contentPlan: { select: { id: true } }
    }
  });

  if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });

  const metadata = assetMetadata(asset.metadata);
  if (!metadata.fileAssetId) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const fileAsset = await prisma.fileAsset.findFirst({
    where: {
      id: metadata.fileAssetId,
      deletedAt: null,
      entityType: "content_plan",
      entityId: asset.contentPlan.id
    }
  });

  if (!fileAsset) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const file = await readStoredFile(fileAsset.storageKey);

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": fileAsset.mimeType,
      "content-length": String(fileAsset.byteSize),
      "content-disposition": `inline; filename="${fileAsset.originalName.replace(/["\\\r\n]/g, "_")}"`
    }
  });
}

function assetMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as { fileAssetId?: string };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeId(value: string | string[]) {
  return (Array.isArray(value) ? value[0] : value).trim();
}
