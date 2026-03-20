import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

const ALLOWED_ROLES = new Set<UserRole>([
  UserRole.WEBSITE_OWNER,
  UserRole.ADMIN,
  UserRole.BOARD_MEMBER,
])

function formatSubmittedAt(value: Date | null) {
  if (!value) return ""
  return value.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function extractUploadedFileName(notes: string | null | undefined) {
  if (!notes) return ""
  const match = notes.match(/^Uploaded file:\s(.+?)\s\(/)
  return match?.[1] ?? ""
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    }

    if (!ALLOWED_ROLES.has(currentUser.role)) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")?.trim()

    const activeSeason = await prisma.season.findFirst({
      where: {
        clubId: currentUser.clubId,
        isActive: true,
      },
      select: {
        id: true,
      },
      orderBy: {
        startsAt: "desc",
      },
    })

    if (!activeSeason) {
      return NextResponse.json(id ? null : [])
    }

    if (id) {
      const applicant = await prisma.memberSeason.findFirst({
        where: {
          id,
          seasonId: activeSeason.id,
          applicationSubmittedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          isReturning: true,
          shirtSize: true,
          whyJoin: true,
          contributionIdeas: true,
          awards: true,
          previousEvents: true,
          scienceClasses: true,
          mathClasses: true,
          questions: true,
          focusPageFileUrl: true,
          notes: true,
          applicationSubmittedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              gradeLevel: true,
              phone: true,
            },
          },
          eventEnrollments: {
            orderBy: {
              preferenceRank: "asc",
            },
            select: {
              preferenceRank: true,
              partnerNames: true,
              partnerPreference: true,
              event: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      if (!applicant) {
        return NextResponse.json(
          { message: "Applicant not found." },
          { status: 404 }
        )
      }

      const formattedApplicant = {
        id: applicant.id,
        userId: applicant.user.id,
        name: `${applicant.user.firstName} ${applicant.user.lastName}`.trim(),
        email: applicant.user.email,
        phone: applicant.user.phone ?? "",
        grade: applicant.user.gradeLevel
          ? String(applicant.user.gradeLevel)
          : "",
        gradeLevel: applicant.user.gradeLevel
          ? String(applicant.user.gradeLevel)
          : "",
        shirtSize: applicant.shirtSize ?? "",
        returning: applicant.isReturning ? "Returning" : "New",

        whyJoin: applicant.whyJoin ?? "",
        contributionIdeas: applicant.contributionIdeas ?? "",
        awards: applicant.awards ?? "",
        previousEvents: applicant.previousEvents ?? "",
        scienceClasses: applicant.scienceClasses ?? "",
        mathClasses: applicant.mathClasses ?? "",
        questions: applicant.questions ?? "",

        topEvents: applicant.eventEnrollments.map((enrollment) => ({
          eventName: enrollment.event?.name ?? "",
          partnerNames: enrollment.partnerNames ?? "",
          partnerPreference: enrollment.partnerPreference ?? "NA",
        })),

        focusPageFileUrl: applicant.focusPageFileUrl ?? "",
        focusPageFileName: extractUploadedFileName(applicant.notes),
        submittedAt: formatSubmittedAt(applicant.applicationSubmittedAt),
      }

      return NextResponse.json(formattedApplicant)
    }

    const applicants = await prisma.memberSeason.findMany({
      where: {
        seasonId: activeSeason.id,
        applicationSubmittedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        isReturning: true,
        applicationSubmittedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            gradeLevel: true,
            phone: true,
          },
        },
      },
      orderBy: {
        applicationSubmittedAt: "desc",
      },
    })

    const formattedApplicants = applicants.map((applicant) => ({
      id: applicant.id,
      userId: applicant.user.id,
      name: `${applicant.user.firstName} ${applicant.user.lastName}`.trim(),
      email: applicant.user.email,
      grade: applicant.user.gradeLevel
        ? String(applicant.user.gradeLevel)
        : "",
      phone: applicant.user.phone ?? "",
      returning: applicant.isReturning ? "Returning" : "New",
    }))

    return NextResponse.json(formattedApplicants)
  } catch (error) {
    console.error("Failed to fetch applicants:", error)

    return NextResponse.json(
      { message: "Failed to fetch applicants." },
      { status: 500 }
    )
  }
}