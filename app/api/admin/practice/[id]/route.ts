import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

async function resolveTest(testId: string, clubId: string) {
  return prisma.practiceTest.findFirst({
    where: { id: testId, season: { clubId } },
  })
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  pdfUrl: z.string().url().optional(),
  timeLimitMinutes: z.number().int().min(1).max(300).nullable().optional(),
  eventId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const PATCH = withPermission(
  "edit_practice",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

    const test = await resolveTest(id, user.clubId)
    if (!test) return err("Test not found.", 404)

    const updated = await prisma.practiceTest.update({
      where: { id },
      data: parsed.data,
    })
    return ok(updated)
  },
)

export const DELETE = withPermission(
  "delete_practice",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const test = await resolveTest(id, user.clubId)
    if (!test) return err("Test not found.", 404)

    await prisma.practiceTest.delete({ where: { id } })
    return ok({ ok: true })
  },
)
