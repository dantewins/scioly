import path from "node:path"

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
])

const SAFE_NAME = /[^a-zA-Z0-9._-]/g

export function isAllowedUploadMime(mimeType: string): boolean {
  return ALLOWED_UPLOAD_MIME.has(mimeType)
}

export function normalizeAssetKind(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "UPLOAD"
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 64) : "UPLOAD"
}

export function safeUploadFileName(fileName: string): string {
  return (fileName || "upload").replace(SAFE_NAME, "_").slice(0, 100)
}

export function buildLocalStorageKey(clubId: string, assetId: string, fileName: string): string {
  const ext = path.extname(fileName) || ""
  return path.join(clubId, `${assetId}${ext}`)
}

export function getAssetDownloadUrl(assetId: string): string {
  return `/api/uploads/${assetId}`
}

export function getUploadRoot(): string {
  return path.join(process.cwd(), ".data", "uploads")
}

export function getUploadPath(storageKey: string): string {
  const root = getUploadRoot()
  const resolved = path.resolve(root, storageKey)
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error("INVALID_STORAGE_KEY")
  }
  return resolved
}
