import { describe, expect, it } from "vitest";

import {
  assertDigitalHumanImageBytes,
  assertDigitalHumanImageDailyLimit,
  assertDigitalHumanImageFile,
  buildDigitalHumanImagePrompt,
  isActiveConsent,
  parseDigitalHumanImageStyle,
  startOfUtcDay
} from "./digital-human-image";

describe("digital human image validation", () => {
  it("accepts supported portrait files with matching content", () => {
    const file = new File([Buffer.from([0xff, 0xd8, 0xff, 0x00])], "portrait.jpg", { type: "image/jpeg" });

    expect(() => assertDigitalHumanImageFile(file)).not.toThrow();
    expect(() => assertDigitalHumanImageBytes(Buffer.from([0xff, 0xd8, 0xff, 0x00]), file.type)).not.toThrow();
  });

  it("rejects extension and content mismatches", () => {
    const file = new File([Buffer.from("not-an-image")], "portrait.png", { type: "image/jpeg" });

    expect(() => assertDigitalHumanImageFile(file)).toThrow(/matching file extension/i);
    expect(() => assertDigitalHumanImageBytes(Buffer.from("not-an-image"), "image/png")).toThrow(/does not match/i);
  });

  it("recognizes active, expired, and deleted consent", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");

    expect(isActiveConsent({ signedAt: new Date("2026-07-01"), expiresAt: null, deletedAt: null }, now)).toBe(true);
    expect(isActiveConsent({ signedAt: new Date("2026-07-01"), expiresAt: new Date("2026-07-10"), deletedAt: null }, now)).toBe(false);
    expect(isActiveConsent({ signedAt: new Date("2026-07-01"), expiresAt: null, deletedAt: new Date("2026-07-10") }, now)).toBe(false);
  });

  it("enforces the image generation daily limit with a clear error", () => {
    expect(() => assertDigitalHumanImageDailyLimit(4, 5)).not.toThrow();
    expect(() => assertDigitalHumanImageDailyLimit(5, 5)).toThrow(/daily limit reached \(5\)/i);
  });

  it("uses UTC day boundaries and safe style fallback", () => {
    expect(startOfUtcDay(new Date("2026-07-19T23:30:00-07:00")).toISOString()).toBe("2026-07-20T00:00:00.000Z");
    expect(parseDigitalHumanImageStyle("cinematic")).toBe("cinematic");
    expect(parseDigitalHumanImageStyle("unknown")).toBe("studio");
  });

  it("builds an identity-preserving portrait prompt", () => {
    const prompt = buildDigitalHumanImagePrompt({
      style: "music_artist",
      visualStyle: "neon pop",
      archetype: "independent singer"
    });

    expect(prompt).toContain("Preserve the person's identity");
    expect(prompt).toContain("neon pop");
    expect(prompt).toContain("independent singer");
    expect(prompt).toContain("Do not add text");
  });
});
