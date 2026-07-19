import OpenAI, { toFile } from "openai";

import { getEnv, type EnvSource } from "@/lib/env";

export type DigitalHumanImageProviderResult = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  provider: string;
  model: string;
};

export interface DigitalHumanImageProvider {
  readonly providerKey: "mock" | "openai" | "gemini";
  readonly providerName: string;
  readonly model: string;
  readonly sendsImageExternally: boolean;
  generate(input: {
    sourceImage: Buffer;
    sourceMimeType: string;
    sourceFileName: string;
    prompt: string;
  }): Promise<DigitalHumanImageProviderResult>;
}

type GeminiImageBlock = {
  data?: unknown;
  mime_type?: unknown;
  mimeType?: unknown;
};

export class GeminiDigitalHumanImageProvider implements DigitalHumanImageProvider {
  readonly providerKey = "gemini" as const;
  readonly providerName = "Gemini Image";
  readonly sendsImageExternally = true;

  constructor(
    private readonly apiKey: string,
    readonly model: string
  ) {}

  async generate(input: {
    sourceImage: Buffer;
    sourceMimeType: string;
    sourceFileName: string;
    prompt: string;
  }): Promise<DigitalHumanImageProviderResult> {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          { type: "text", text: input.prompt },
          {
            type: "image",
            mime_type: input.sourceMimeType,
            data: input.sourceImage.toString("base64")
          }
        ],
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "1:1",
          image_size: "1K"
        }
      })
    });

    if (!response.ok) {
      throw new Error(await getGeminiProviderError(response));
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const image = findGeminiOutputImage(payload);
    if (!image || typeof image.data !== "string" || image.data.length === 0) {
      throw new Error("Gemini image provider returned no generated image.");
    }

    const mimeType = image.mime_type === "image/jpeg" || image.mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
    return {
      buffer: Buffer.from(image.data, "base64"),
      mimeType,
      extension: mimeType === "image/jpeg" ? ".jpg" : ".png",
      provider: this.providerKey,
      model: this.model
    };
  }
}

function findGeminiOutputImage(payload: Record<string, unknown>): GeminiImageBlock | null {
  const direct = payload.output_image ?? payload.outputImage;
  if (isRecord(direct)) return direct;

  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  for (let stepIndex = steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
    const step = steps[stepIndex];
    if (!isRecord(step)) continue;
    const content = Array.isArray(step.content) ? step.content : [];
    for (let contentIndex = content.length - 1; contentIndex >= 0; contentIndex -= 1) {
      const block = content[contentIndex];
      if (isRecord(block) && block.type === "image") return block;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getGeminiProviderError(response: Response) {
  const fallback = `Gemini image provider request failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const providerError = isRecord(payload.error) ? payload.error : null;
    const message = providerError && typeof providerError.message === "string" ? providerError.message.trim() : "";
    if (!message) return fallback;

    return `Gemini image provider request failed with status ${response.status}: ${message.slice(0, 500)}`;
  } catch {
    return fallback;
  }
}

export class MockDigitalHumanImageProvider implements DigitalHumanImageProvider {
  readonly providerKey = "mock" as const;
  readonly providerName = "Local Preview";
  readonly model = "local-svg-preview";
  readonly sendsImageExternally = false;

  async generate(input: {
    sourceImage: Buffer;
    sourceMimeType: string;
    sourceFileName: string;
    prompt: string;
  }): Promise<DigitalHumanImageProviderResult> {
    const source = `data:${input.sourceMimeType};base64,${input.sourceImage.toString("base64")}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#22d3ee"/><stop offset="1" stop-color="#f43f5e"/></linearGradient><filter id="grade"><feColorMatrix type="matrix" values="1.05 0 0 0 0 0 1.02 0 0 0 0 0 1.08 0 0 0 0 0 1 0"/></filter></defs><rect width="1024" height="1024" fill="#09090b"/><image href="${source}" x="32" y="32" width="960" height="960" preserveAspectRatio="xMidYMid slice" filter="url(#grade)"/><rect x="20" y="20" width="984" height="984" rx="20" fill="none" stroke="url(#frame)" stroke-width="16"/><path d="M70 914h330" stroke="#fff" stroke-opacity=".75" stroke-width="4"/><circle cx="930" cy="94" r="12" fill="#22d3ee"/></svg>`;

    return {
      buffer: Buffer.from(svg),
      mimeType: "image/svg+xml",
      extension: ".svg",
      provider: this.providerKey,
      model: this.model
    };
  }
}

export class OpenAIDigitalHumanImageProvider implements DigitalHumanImageProvider {
  readonly providerKey = "openai" as const;
  readonly providerName = "OpenAI Image";
  readonly sendsImageExternally = true;

  constructor(
    private readonly apiKey: string,
    readonly model: string
  ) {}

  async generate(input: {
    sourceImage: Buffer;
    sourceMimeType: string;
    sourceFileName: string;
    prompt: string;
  }): Promise<DigitalHumanImageProviderResult> {
    const client = new OpenAI({ apiKey: this.apiKey });
    const response = await client.images.edit({
      model: this.model,
      image: await toFile(input.sourceImage, input.sourceFileName, { type: input.sourceMimeType }),
      prompt: input.prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png"
    });
    const encoded = response.data?.[0]?.b64_json;

    if (!encoded) throw new Error("OpenAI image provider returned no generated image.");

    return {
      buffer: Buffer.from(encoded, "base64"),
      mimeType: "image/png",
      extension: ".png",
      provider: this.providerKey,
      model: this.model
    };
  }
}

export function createDigitalHumanImageProvider(source: EnvSource = process.env): DigitalHumanImageProvider {
  const env = getEnv(source);
  if (env.digitalHumanImageProvider === "gemini" && env.geminiApiKey) {
    return new GeminiDigitalHumanImageProvider(env.geminiApiKey, env.digitalHumanImageModel);
  }
  if (env.digitalHumanImageProvider === "openai" && env.openaiApiKey) {
    return new OpenAIDigitalHumanImageProvider(env.openaiApiKey, env.digitalHumanImageModel);
  }
  return new MockDigitalHumanImageProvider();
}
