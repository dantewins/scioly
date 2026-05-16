import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { err, ok } from "@/lib/api"

export const dynamic = "force-dynamic"

// POST — applicant withdraws their pending application themselves.
// Only works on a SUBMITTED or UNDER_REVIEW application.
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return err("Unauthorized.", 401)
    if (user.role !== UserRole.APPLICANT) {
      return err("Only pending applicants can withdraw.", 403)
    }

    const application = await prisma.membershipApplication.findFirst({
      where: {
        userId: user.id,
        clubId: user.clubId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
      },
      orderBy: { submittedAt: "desc" },
      select: { id: true, memberSeasonId: true },
    })

    if (!application) {
      return err("No pending application to withdraw.", 404)
    }

    const now = new Date()
    await prisma.$transaction(async (tx) => {
      await tx.membershipApplication.update({
        where: { id: application.id },
        data: {
          status: "WITHDRAWN",
          reviewedAt: now,
          decisionNotes: "Withdrawn by applicant.",
        },
      })

      if (application.memberSeasonId) {
        await tx.memberSeason.update({
          where: { id: application.memberSeasonId },
          data: {
            membershipStatus: "REMOVED",
            statusChangedAt: now,
            statusReason: "Withdrawn by applicant.",
          },
        })
      }
    })

    // Clear session — applicant no longer needs to be logged in.
    const response = ok({ ok: true }) as ReturnType<typeof NextResponse.json>
    response.cookies.set("app_session", "", { maxAge: 0, path: "/" })
    return response
  } catch (e) {
    console.error("[applicant:withdraw]", e)
    return err("Failed to withdraw.", 500)
  }
}
