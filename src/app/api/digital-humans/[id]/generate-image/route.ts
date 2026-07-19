import { NextResponse } from "next/server";

import { generateDigitalHumanImage } from "@/services/digital-human-image-workflow";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const digitalHumanId = (await params).id.trim();
  if (!isUuid(digitalHumanId)) {
    return NextResponse.json({ error: "Invalid digital human id." }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A portrait image is required." }, { status: 400 });
    }

    const result = await generateDigitalHumanImage({
      digitalHumanId,
      file,
      style: formData.get("style")?.toString() ?? "studio",
      consentConfirmed: formData.get("consentConfirmed") === "on"
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digital human image generation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
