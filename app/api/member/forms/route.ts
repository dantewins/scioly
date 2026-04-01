// app/api/member/forms/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withMemberAuth, ok, err } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — list all required forms and the member's submission status
export const GET = withMemberAuth(async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return ok([])

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return ok([])

  const formTypes = await prisma.formType.findMany({
    where: { seasonId: season.id },
    include: {
      submissions: {
        where: { memberSeasonId: ms.id },
        select: { id: true, status: true, submittedAt: true, fileUrl: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })

  return ok(formTypes)
})

const submitSchema = z.object({
  formTypeId: z.string(),
  acknowledgement: z.boolean().optional(),
  fileUrl: z.string().url().optional(),
})

// PATCH — acknowledge or provide URL for a form submission
export const PATCH = withMemberAuth(async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return err("Invalid.", 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return err("Not a member this season.", 403)

  const formType = await prisma.formType.findFirst({
    where: { id: parsed.data.formTypeId, seasonId: season.id },
  })
  if (!formType) return err("Form type not found.", 404)

  const submission = await prisma.formSubmission.upsert({
    where: { formTypeId_memberSeasonId: { formTypeId: parsed.data.formTypeId, memberSeasonId: ms.id } },
    create: {
      formTypeId: parsed.data.formTypeId,
      memberSeasonId: ms.id,
      acknowledgement: parsed.data.acknowledgement ?? false,
      fileUrl: parsed.data.fileUrl,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    update: {
      acknowledgement: parsed.data.acknowledgement ?? false,
      fileUrl: parsed.data.fileUrl,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  })
  return ok(submission)
})
