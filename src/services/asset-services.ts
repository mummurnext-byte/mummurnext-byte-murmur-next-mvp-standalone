import type { MusicProviderKey } from "@/services/music-provider";
import type { VideoProviderKey } from "@/services/video-provider";

export const acceptedMusicMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a"
]);
export const acceptedMusicExtensions = new Set([".mp3", ".wav", ".m4a"]);

export const acceptedVideoMimeTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
export const acceptedVideoExtensions = new Set([".mp4", ".mov", ".webm"]);

export type StoredFileMetadata = {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  checksumSha256: string;
  storageKey: string;
};

export function assertMusicFile(file: { name: string; type?: string }) {
  const extension = extensionOf(file.name);

  if (!acceptedMusicExtensions.has(extension)) {
    throw new Error("Music asset must be an mp3, wav, or m4a file.");
  }

  if (file.type && !acceptedMusicMimeTypes.has(file.type)) {
    throw new Error("Music asset has an unsupported audio MIME type.");
  }
}

export function assertVideoFile(file: { name: string; type?: string }) {
  const extension = extensionOf(file.name);

  if (!acceptedVideoExtensions.has(extension)) {
    throw new Error("Video asset must be an mp4, mov, or webm file.");
  }

  if (file.type && !acceptedVideoMimeTypes.has(file.type)) {
    throw new Error("Video asset has an unsupported video MIME type.");
  }
}

export function buildMusicAssetMetadata(savedFile: StoredFileMetadata, provider: MusicProviderKey) {
  return {
    fileAssetId: savedFile.id,
    originalName: savedFile.originalName,
    mimeType: savedFile.mimeType,
    byteSize: savedFile.byteSize,
    checksumSha256: savedFile.checksumSha256,
    storageKey: savedFile.storageKey,
    workflow: "manual_upload",
    musicProvider: provider
  };
}

export function buildVideoAssetMetadata(
  savedFile: StoredFileMetadata,
  provider: VideoProviderKey,
  musicAssetId: string
) {
  return {
    fileAssetId: savedFile.id,
    originalName: savedFile.originalName,
    mimeType: savedFile.mimeType,
    byteSize: savedFile.byteSize,
    checksumSha256: savedFile.checksumSha256,
    storageKey: savedFile.storageKey,
    workflow: "manual_upload",
    videoProvider: provider,
    sourceMusicAssetId: musicAssetId
  };
}

function extensionOf(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}
