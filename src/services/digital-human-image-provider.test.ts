import { describe, expect, it } from "vitest";

import {
  createDigitalHumanImageProvider,
  MockDigitalHumanImageProvider,
  OpenAIDigitalHumanImageProvider
} from "./digital-human-image-provider";

describe("digital human image provider", () => {
  it("uses the local provider by default", () => {
    expect(createDigitalHumanImageProvider({})).toBeInstanceOf(MockDigitalHumanImageProvider);
  });

  it("falls back to local preview when OpenAI has no key", () => {
    expect(createDigitalHumanImageProvider({ DIGITAL_HUMAN_IMAGE_PROVIDER: "openai" })).toBeInstanceOf(
      MockDigitalHumanImageProvider
    );
  });

  it("selects the official OpenAI image provider when configured", () => {
    const provider = createDigitalHumanImageProvider({
      DIGITAL_HUMAN_IMAGE_PROVIDER: "openai",
      DIGITAL_HUMAN_IMAGE_MODEL: "gpt-image-2",
      OPENAI_API_KEY: "test-only-key"
    });

    expect(provider).toBeInstanceOf(OpenAIDigitalHumanImageProvider);
    expect(provider.model).toBe("gpt-image-2");
    expect(provider.sendsImageExternally).toBe(true);
  });

  it("creates a local preview without an external image call", async () => {
    const provider = new MockDigitalHumanImageProvider();
    const result = await provider.generate({
      sourceImage: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      sourceMimeType: "image/jpeg",
      sourceFileName: "portrait.jpg",
      prompt: "test"
    });

    expect(provider.sendsImageExternally).toBe(false);
    expect(result.mimeType).toBe("image/svg+xml");
    expect(result.buffer.toString()).toContain("data:image/jpeg;base64,");
  });
});
