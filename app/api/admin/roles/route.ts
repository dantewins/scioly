// app/api/admin/roles/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAnyPermission, withPermission, ok, err } from "@/lib/api"
import { clearCurrentUserCache } from "@/lib/auth"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_roles", async (_req, _ctx, user) => {
  const roles = await prisma.clubRole.findMany({
    where: { clubId: user.clubId },
    orderBy: { name: "asc" },
  })
  return ok(roles)
})

const createSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  permissions: z.record(z.string(), z.boolean()).default({}),
})

export const POST = withAnyPermission(["create_roles", "edit_roles"], async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const existing = await prisma.clubRole.findUnique({
    where: { clubId_name: { clubId: user.clubId, name: parsed.data.name } },
  })
  if (existing) return err("A role with this name already exists.", 409)

  const role = await prisma.clubRole.create({
    data: { clubId: user.clubId, ...parsed.data },
  })
  clearCurrentUserCache()
  return ok(role, 201)
})
