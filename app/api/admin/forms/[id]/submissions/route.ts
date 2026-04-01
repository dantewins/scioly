// app/api/admin/forms/[id]/submissions/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission(
  "view_forms",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: formTypeId } = await ctx.params
    const season = await getActiveSeason(user.clubId)
    if (!season) return err("No active season.", 400)

    const submissions = await prisma.formSubmission.findMany({
      where: {
        formTypeId,
        memberSeason: { seasonId: season.id, user: { clubId: user.clubId } },
      },
      include: {
        memberSeason: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
    })
    return ok(submissions)
  },
)

const reviewSchema = z.object({
  submissionId: z.string(),
  action: z.enum(["verify", "reject"]),
  rejectionReason: z.string().optional(),
})

export const PATCH = withPermission(
  "edit_forms",
  async (req, _ctx, user) => {
    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) return err("Invalid.", 400)

    const { submissionId, action, rejectionReason } = parsed.data

    const sub = await prisma.formSubmission.findFirst({
      where: { id: submissionId, memberSeason: { season: { clubId: user.clubId } } },
    })
    if (!sub) return err("Submission not found.", 404)

    const updated = await prisma.formSubmission.update({
      where: { id: submissionId },
      data:
        action === "verify"
          ? { status: "VERIFIED", verifiedAt: new Date(), verifiedById: user.id, rejectionReason: null }
          : { status: "REJECTED", rejectionReason: rejectionReason ?? "No reason." },
    })
    return ok(updated)
  },
)
