// app/api/admin/hour-categories/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_hours", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const categories = await prisma.hourCategory.findMany({
    where: { seasonId: season.id },
    include: { _count: { select: { hourEntries: true } } },
    orderBy: { name: "asc" },
  })
  return ok(categories)
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  requiredHours: z.number().min(0).max(999).optional(),
  // Per-entry cap (the schema column exists; expose it via the API).
  maxHoursPerEntry: z.number().min(0.25).max(24).optional(),
  requiresApproval: z.boolean().default(true),
  proofInstructions: z.string().max(500).optional(),
})

export const POST = withPermission("edit_hours", async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const existing = await prisma.hourCategory.findUnique({
    where: { seasonId_name: { seasonId: season.id, name: parsed.data.name } },
  })
  if (existing) return err("A category with this name already exists.", 409)

  const category = await prisma.hourCategory.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(category, 201)
})
