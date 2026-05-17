// app/api/admin/forms/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAnyPermission, withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { formatZodError } from "@/lib/zod-errors"

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

export const POST = withAnyPermission(["create_forms", "edit_forms"], async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Pre-check unique seasonId+name so P2002 doesn't bubble to a 500.
  const existing = await prisma.formType.findUnique({
    where: { seasonId_name: { seasonId: season.id, name: parsed.data.name } },
  })
  if (existing) return err("A form type with this name already exists.", 409)

  const form = await prisma.formType.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(form, 201)
})
