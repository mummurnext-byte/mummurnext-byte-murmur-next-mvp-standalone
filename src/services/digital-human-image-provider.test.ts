import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDigitalHumanImageProvider,
  GeminiDigitalHumanImageProvider,
  MockDigitalHumanImageProvider,
  OpenAIDigitalHumanImageProvider
} from "./digital-human-image-provider";

describe("digital human image provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("falls back to local preview when Gemini has no key", () => {
    expect(createDigitalHumanImageProvider({ DIGITAL_HUMAN_IMAGE_PROVIDER: "gemini" })).toBeInstanceOf(
      MockDigitalHumanImageProvider
    );
  });

  it("selects the official Gemini image provider when configured", () => {
    const provider = createDigitalHumanImageProvider({
      DIGITAL_HUMAN_IMAGE_PROVIDER: "gemini",
      DIGITAL_HUMAN_IMAGE_MODEL: "gemini-3.1-flash-image",
      GEMINI_API_KEY: "test-only-key"
    });

    expect(provider).toBeInstanceOf(GeminiDigitalHumanImageProvider);
    expect(provider.model).toBe("gemini-3.1-flash-image");
    expect(provider.sendsImageExternally).toBe(true);
  });

  it("reuses an explicitly configured Gemini LLM key when the image provider is unset", () => {
    expect(
      createDigitalHumanImageProvider({ LLM_PROVIDER: "gemini", GEMINI_API_KEY: "test-only-key" })
    ).toBeInstanceOf(GeminiDigitalHumanImageProvider);
  });

  it("parses the generated image from the official Gemini response", async () => {
    const generated = Buffer.from("generated-image");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ output_image: { data: generated.toString("base64"), mime_type: "image/png" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiDigitalHumanImageProvider("test-only-key", "gemini-3.1-flash-image");
    const result = await provider.generate({
      sourceImage: Buffer.from("portrait"),
      sourceMimeType: "image/png",
      sourceFileName: "portrait.png",
      prompt: "Create a music artist portrait."
    });

    expect(result.buffer).toEqual(generated);
    expect(result.mimeType).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns a clear Gemini provider error without exposing the response body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive provider details", { status: 403 })));
    const provider = new GeminiDigitalHumanImageProvider("test-only-key", "gemini-3.1-flash-image");

    await expect(
      provider.generate({
        sourceImage: Buffer.from("portrait"),
        sourceMimeType: "image/png",
        sourceFileName: "portrait.png",
        prompt: "Create a music artist portrait."
      })
    ).rejects.toThrow("Gemini image provider request failed with status 403.");
  });

  it("includes the structured Gemini provider message for actionable API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "The selected model does not support image output." } }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    const provider = new GeminiDigitalHumanImageProvider("test-only-key", "gemini-3.1-flash-image");

    await expect(
      provider.generate({
        sourceImage: Buffer.from("portrait"),
        sourceMimeType: "image/png",
        sourceFileName: "portrait.png",
        prompt: "Create a music artist portrait."
      })
    ).rejects.toThrow("The selected model does not support image output.");
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
