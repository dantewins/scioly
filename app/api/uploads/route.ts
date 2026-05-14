// app/api/uploads/route.ts
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { withActiveMemberAuth, ok, err } from "@/lib/api"
import {
  MAX_UPLOAD_BYTES,
  buildLocalStorageKey,
  getAssetDownloadUrl,
  getUploadPath,
  isAllowedUploadMime,
  normalizeAssetKind,
  safeUploadFileName,
} from "@/lib/assets"
import { assertSeasonBelongsToClub, getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withActiveMemberAuth(async (req, _ctx, user) => {
  const form = await req.formData().catch(() => null)
  if (!form) return err("Expected multipart/form-data.", 400)

  const file = form.get("file")
  if (!(file instanceof File)) return err("Missing file.", 400)
  if (file.size === 0) return err("Empty file.", 400)
  if (file.size > MAX_UPLOAD_BYTES) {
    return err(`File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`, 413)
  }
  if (!isAllowedUploadMime(file.type)) {
    return err(`Unsupported file type: ${file.type || "unknown"}.`, 415)
  }

  const seasonIdRaw = form.get("seasonId")
  const requestedSeasonId =
    typeof seasonIdRaw === "string" && seasonIdRaw.length > 0 ? seasonIdRaw : null
  const season = requestedSeasonId
    ? await assertSeasonBelongsToClub(requestedSeasonId, user.clubId)
    : await getActiveSeason(user.clubId)
  if (!season) return err("Season not found.", 404)

  const kind = normalizeAssetKind(form.get("kind"))
  const safeOriginal = safeUploadFileName(file.name)

  // Create the Asset row first so we have a stable id for the on-disk filename.
  const asset = await prisma.asset.create({
    data: {
      clubId: user.clubId,
      seasonId: season.id,
      uploadedById: user.id,
      kind,
      fileName: safeOriginal,
      mimeType: file.type,
      sizeBytes: file.size,
      storageProvider: "local",
    },
  })

  const storageKey = buildLocalStorageKey(user.clubId, asset.id, safeOriginal)
  const onDisk = getUploadPath(storageKey)
  await mkdir(path.dirname(onDisk), { recursive: true })
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(onDisk, buf)

  const publicUrl = getAssetDownloadUrl(asset.id)
  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { storageKey, publicUrl },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      publicUrl: true,
      kind: true,
      createdAt: true,
    },
  })

  return ok(updated, 201)
})
