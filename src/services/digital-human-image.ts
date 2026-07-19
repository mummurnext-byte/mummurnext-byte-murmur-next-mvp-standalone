import path from "node:path";

export const digitalHumanImageStyles = ["studio", "music_artist", "cinematic", "futuristic"] as const;

export type DigitalHumanImageStyle = (typeof digitalHumanImageStyles)[number];

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"]
} as const;

export function parseDigitalHumanImageStyle(value: unknown): DigitalHumanImageStyle {
  return digitalHumanImageStyles.includes(value as DigitalHumanImageStyle)
    ? (value as DigitalHumanImageStyle)
    : "studio";
}

export function assertDigitalHumanImageFile(file: File) {
  if (file.size === 0) throw new Error("A portrait image is required.");
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error("Portrait image must be 10 MB or smaller.");

  const extensions = imageTypes[file.type as keyof typeof imageTypes];
  const extension = path.extname(file.name).toLowerCase();
  if (!extensions || !(extensions as readonly string[]).includes(extension)) {
    throw new Error("Portrait image must be a JPG, PNG, or WebP file with a matching file extension.");
  }
}

export function assertDigitalHumanImageBytes(buffer: Buffer, mimeType: string) {
  const valid =
    (mimeType === "image/jpeg" && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mimeType === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP");

  if (!valid) throw new Error("Portrait file content does not match its declared image type.");
}

export function isActiveConsent(
  record: { signedAt: Date; expiresAt: Date | null; deletedAt: Date | null },
  now = new Date()
) {
  return !record.deletedAt && record.signedAt <= now && (!record.expiresAt || record.expiresAt > now);
}

export function assertDigitalHumanImageDailyLimit(count: number, limit: number) {
  if (count >= limit) {
    throw new Error(`Digital human image daily limit reached (${limit}). Try again tomorrow or raise DIGITAL_HUMAN_IMAGE_DAILY_LIMIT.`);
  }
}

export function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function buildDigitalHumanImagePrompt(input: {
  style: DigitalHumanImageStyle;
  visualStyle?: string | null;
  archetype?: string | null;
}) {
  const styleInstructions: Record<DigitalHumanImageStyle, string> = {
    studio: "a polished neutral studio portrait with soft professional lighting",
    music_artist: "a contemporary music artist portrait suitable for streaming and short-video profiles",
    cinematic: "a cinematic artist portrait with controlled dramatic lighting and a clean background",
    futuristic: "a refined near-future digital artist portrait with subtle technology-inspired styling"
  };

  return [
    `Create ${styleInstructions[input.style]} from the supplied portrait.`,
    "Preserve the person's identity, facial proportions, skin tone, age presentation, and recognizable features.",
    "Change only styling, wardrobe, lighting, and background. Keep one adult person in a head-and-shoulders composition.",
    input.archetype ? `Artist archetype: ${input.archetype}.` : "",
    input.visualStyle ? `Preferred visual direction: ${input.visualStyle}.` : "",
    "Use a square 1:1 composition. Do not add text, logos, watermarks, extra people, or misleading identity changes."
  ].filter(Boolean).join(" ");
}
