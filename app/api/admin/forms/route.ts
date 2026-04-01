// app/api/admin/forms/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_forms", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const forms = await prisma.formType.findMany({
    where: { seasonId: season.id },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { name: "asc" },
  })
  return ok(forms)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["WAIVER", "MEDICAL", "PERMISSION", "CODE_OF_CONDUCT", "TRAVEL", "PHOTO_RELEASE", "CLUB_CONTRACT", "OTHER"]).default("OTHER"),
  description: z.string().max(500).optional(),
  isRequired: z.boolean().default(true),
  requiresUpload: z.boolean().default(false),
  dueAt: z.string().datetime().optional(),
})

export const POST = withPermission("create_forms", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const form = await prisma.formType.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(form, 201)
})
