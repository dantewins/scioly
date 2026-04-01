import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_practice", async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const tests = await prisma.practiceTest.findMany({
    where: { seasonId: season.id },
    include: {
      event: { select: { id: true, name: true } },
      answerKey: { select: { id: true } },
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return ok(tests)
})

const createSchema = z.object({
  title: z.string().min(1).max(200),
  pdfUrl: z.string().url(),
  timeLimitMinutes: z.number().int().min(1).max(300).optional(),
  eventId: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const POST = withPermission("create_practice", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Verify event belongs to this season if provided
  if (parsed.data.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: parsed.data.eventId, seasonId: season.id },
    })
    if (!event) return err("Event not found.", 404)
  }

  const test = await prisma.practiceTest.create({
    data: { seasonId: season.id, ...parsed.data },
  })
  return ok(test, 201)
})
