// app/api/member/forms/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withActiveMemberAuth, ok, err, readJsonBody } from "@/lib/api"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET — list all required forms and the member's submission status
export const GET = withActiveMemberAuth(async (_req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return ok([])

  const ms = await getMemberSeason(user.id, user.clubId)
  if (!ms) return ok([])

  const formTypes = await prisma.formType.findMany({
    where: { seasonId: season.id },
    include: {
      submissions: {
        where: { memberSeasonId: ms.id },
        select: { id: true, status: true, submittedAt: true, fileUrl: true, fileAssetId: true },
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
  fileAssetId: z.string().optional(),
})

// PATCH — acknowledge or provide URL for a form submission
export const PATCH = withActiveMemberAuth(async (req, _ctx, user) => {
  const body = await readJsonBody(req)
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

  const asset = parsed.data.fileAssetId
    ? await prisma.asset.findFirst({
        where: {
          id: parsed.data.fileAssetId,
          clubId: user.clubId,
          seasonId: season.id,
          uploadedById: user.id,
        },
        select: { id: true, publicUrl: true },
      })
    : null

  if (parsed.data.fileAssetId && !asset) {
    return err("Uploaded file not found.", 404)
  }

  const fileUrl = asset?.publicUrl ?? parsed.data.fileUrl
  if (formType.requiresUpload && !fileUrl) {
    return err("This form requires an upload.", 400)
  }

  const submission = await prisma.formSubmission.upsert({
    where: { formTypeId_memberSeasonId: { formTypeId: parsed.data.formTypeId, memberSeasonId: ms.id } },
    create: {
      formTypeId: parsed.data.formTypeId,
      memberSeasonId: ms.id,
      acknowledgement: parsed.data.acknowledgement ?? false,
      fileUrl,
      fileAssetId: asset?.id ?? null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    update: {
      acknowledgement: parsed.data.acknowledgement ?? false,
      fileUrl,
      fileAssetId: asset?.id ?? null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  })
  return ok(submission)
})
