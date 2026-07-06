import { describe, expect, it } from "vitest";

import {
  assertMusicFile,
  assertVideoFile,
  buildMusicAssetMetadata,
  buildVideoAssetMetadata
} from "./asset-services";

describe("asset services", () => {
  it("validates supported music and video formats", () => {
    expect(() => assertMusicFile({ name: "song.mp3", type: "audio/mpeg" })).not.toThrow();
    expect(() => assertMusicFile({ name: "song.wav", type: "audio/wav" })).not.toThrow();
    expect(() => assertMusicFile({ name: "song.m4a", type: "audio/mp4" })).not.toThrow();
    expect(() => assertVideoFile({ name: "video.mp4", type: "video/mp4" })).not.toThrow();
    expect(() => assertVideoFile({ name: "video.mov", type: "video/quicktime" })).not.toThrow();
    expect(() => assertVideoFile({ name: "video.webm", type: "video/webm" })).not.toThrow();
  });

  it("rejects unsupported formats", () => {
    expect(() => assertMusicFile({ name: "song.flac", type: "audio/flac" })).toThrow(
      "Music asset must be an mp3, wav, or m4a file."
    );
    expect(() => assertVideoFile({ name: "video.avi", type: "video/x-msvideo" })).toThrow(
      "Video asset must be an mp4, mov, or webm file."
    );
  });

  it("builds upload metadata", () => {
    const file = {
      id: "file-1",
      originalName: "asset.mp4",
      mimeType: "video/mp4",
      byteSize: 1000,
      checksumSha256: "checksum",
      storageKey: "2026-07-06/file.mp4"
    };

    expect(buildMusicAssetMetadata(file, "suno_manual")).toMatchObject({
      musicProvider: "suno_manual",
      workflow: "manual_upload"
    });
    expect(buildVideoAssetMetadata(file, "heygen_manual", "music-1")).toMatchObject({
      videoProvider: "heygen_manual",
      sourceMusicAssetId: "music-1",
      workflow: "manual_upload"
    });
  });
});
