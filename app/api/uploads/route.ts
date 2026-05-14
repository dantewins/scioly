// app/api/uploads/route.ts
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
])

const SAFE_NAME = /[^a-zA-Z0-9._-]/g

export const POST = withMemberAuth(async (req, _ctx, user) => {
  const form = await req.formData().catch(() => null)
  if (!form) return err("Expected multipart/form-data.", 400)

  const file = form.get("file")
  if (!(file instanceof File)) return err("Missing file.", 400)
  if (file.size === 0) return err("Empty file.", 400)
  if (file.size > MAX_BYTES) return err(`File too large (max ${MAX_BYTES / (1024 * 1024)} MB).`, 413)
  if (!ALLOWED_MIME.has(file.type)) {
    return err(`Unsupported file type: ${file.type || "unknown"}.`, 415)
  }

  const kindRaw = form.get("kind")
  const kind = typeof kindRaw === "string" && kindRaw.length > 0 ? kindRaw.slice(0, 64) : "UPLOAD"

  const seasonIdRaw = form.get("seasonId")
  const seasonId = typeof seasonIdRaw === "string" && seasonIdRaw.length > 0 ? seasonIdRaw : null

  const safeOriginal = (file.name || "upload").replace(SAFE_NAME, "_").slice(0, 100)

  // Create the Asset row first so we have a stable id for the on-disk filename.
  const asset = await prisma.asset.create({
    data: {
      clubId: user.clubId,
      seasonId,
      uploadedById: user.id,
      kind,
      fileName: safeOriginal,
      mimeType: file.type,
      sizeBytes: file.size,
      storageProvider: "local",
    },
  })

  const ext = path.extname(safeOriginal) || ""
  const storageKey = `${user.clubId}/${asset.id}${ext}`
  const dir = path.join(process.cwd(), "public", "uploads", user.clubId)
  await mkdir(dir, { recursive: true })
  const onDisk = path.join(dir, `${asset.id}${ext}`)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(onDisk, buf)

  const publicUrl = `/uploads/${storageKey}`
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
