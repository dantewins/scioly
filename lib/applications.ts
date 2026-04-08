import { prisma } from "@/lib/prisma"

export type ApplicantReviewRecord = {
  id: string
  applicationId: string | null
  memberSeasonId: string
  applicationSubmittedAt: string | null
  user: {
    id: string | null
    firstName: string
    lastName: string
    email: string
    gradeLevel: number | null
    phone: string | null
  }
  eventChoices: {
    event: {
      id: string
      name: string
      code: string | null
    }
  }[]
  isReturning: boolean
  canTravel: boolean
  whyJoin: string | null
  contributionIdeas: string | null
  previousEvents: string | null
  scienceClasses: string | null
  mathClasses: string | null
  questions: string | null
}

export async function listPendingApplicants(
  clubId: string,
  seasonId: string,
): Promise<ApplicantReviewRecord[]> {
  const applications = await prisma.membershipApplication.findMany({
    where: {
      clubId,
      seasonId,
      status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
      memberSeasonId: { not: null },
    },
    select: {
      id: true,
      memberSeasonId: true,
      submittedAt: true,
      firstName: true,
      lastName: true,
      email: true,
      gradeLevel: true,
      phone: true,
      isReturning: true,
      canTravel: true,
      whyJoin: true,
      contributionIdeas: true,
      previousEvents: true,
      scienceClasses: true,
      mathClasses: true,
      questions: true,
      user: {
        select: {
          id: true,
        },
      },
      eventChoices: {
        orderBy: { preferenceRank: "asc" },
        select: {
          event: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  })

  return applications
    .filter((application): application is typeof application & { memberSeasonId: string } => Boolean(application.memberSeasonId))
    .map((application) => ({
      id: application.memberSeasonId,
      applicationId: application.id,
      memberSeasonId: application.memberSeasonId,
      applicationSubmittedAt: application.submittedAt.toISOString(),
      user: {
        id: application.user?.id ?? null,
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        gradeLevel: application.gradeLevel ?? null,
        phone: application.phone ?? null,
      },
      eventChoices: application.eventChoices,
      isReturning: application.isReturning,
      canTravel: application.canTravel,
      whyJoin: application.whyJoin ?? null,
      contributionIdeas: application.contributionIdeas ?? null,
      previousEvents: application.previousEvents ?? null,
      scienceClasses: application.scienceClasses ?? null,
      mathClasses: application.mathClasses ?? null,
      questions: application.questions ?? null,
    }))
}
