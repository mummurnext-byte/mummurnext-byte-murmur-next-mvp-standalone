export function getEnv() {
  return {
    localFileStorageDir: process.env.LOCAL_FILE_STORAGE_DIR ?? "./uploads",
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 104857600)
  };
}
