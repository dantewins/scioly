import { readFile } from "node:fs/promises"
import { NextResponse } from "next/server"
import { withActiveMemberAuth, err } from "@/lib/api"
import { getUploadPath } from "@/lib/assets"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withActiveMemberAuth(
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params

    const asset = await prisma.asset.findFirst({
      where: { id, clubId: user.clubId },
      select: {
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        storageKey: true,
        storageProvider: true,
      },
    })

    if (!asset || asset.storageProvider !== "local" || !asset.storageKey) {
      return err("Asset not found.", 404)
    }

    try {
      const bytes = await readFile(getUploadPath(asset.storageKey))
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": asset.mimeType ?? "application/octet-stream",
          "Content-Length": String(asset.sizeBytes ?? bytes.byteLength),
          "Content-Disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"`,
          "X-Content-Type-Options": "nosniff",
        },
      })
    } catch {
      return err("Asset not found.", 404)
    }
  },
)
