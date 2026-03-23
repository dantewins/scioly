import { NextResponse } from "next/server"
import { MembershipStatus, UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

const ALLOWED_ROLES = new Set<UserRole>([
  UserRole.WEBSITE_OWNER,
  UserRole.ADMIN,
  UserRole.BOARD_MEMBER,
])

function formatDate(value: Date | null) {
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

async function getActiveSeason(clubId: string) {
  return prisma.season.findFirst({
    where: { clubId, isActive: true },
    select: { id: true },
    orderBy: { startsAt: "desc" },
  })
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

    const activeSeason = await getActiveSeason(currentUser.clubId)

    if (!activeSeason) {
      return NextResponse.json(id ? null : [])
    }

    if (id) {
      const applicant = await prisma.memberSeason.findFirst({
        where: {
          id,
          seasonId: activeSeason.id,
          applicationSubmittedAt: { not: null },
        },
        select: {
          id: true,
          isReturning: true,
          shirtSize: true,
          membershipStatus: true,
          statusChangedAt: true,
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
            orderBy: { preferenceRank: "asc" },
            select: {
              preferenceRank: true,
              partnerNames: true,
              partnerPreference: true,
              event: { select: { name: true } },
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

      return NextResponse.json({
        id: applicant.id,
        userId: applicant.user.id,
        name: `${applicant.user.firstName} ${applicant.user.lastName}`.trim(),
        email: applicant.user.email,
        phone: applicant.user.phone ?? "",
        grade: applicant.user.gradeLevel ? String(applicant.user.gradeLevel) : "",
        gradeLevel: applicant.user.gradeLevel ? String(applicant.user.gradeLevel) : "",
        shirtSize: applicant.shirtSize ?? "",
        returning: applicant.isReturning ? "Returning" : "New",
        membershipStatus: applicant.membershipStatus,
        statusChangedAt: formatDate(applicant.statusChangedAt),

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
        submittedAt: formatDate(applicant.applicationSubmittedAt),
      })
    }

    const applicants = await prisma.memberSeason.findMany({
      where: {
        seasonId: activeSeason.id,
        applicationSubmittedAt: { not: null },
      },
      select: {
        id: true,
        isReturning: true,
        membershipStatus: true,
        statusChangedAt: true,
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
      orderBy: { applicationSubmittedAt: "desc" },
    })

    return NextResponse.json(
      applicants.map((applicant) => ({
        id: applicant.id,
        userId: applicant.user.id,
        name: `${applicant.user.firstName} ${applicant.user.lastName}`.trim(),
        email: applicant.user.email,
        grade: applicant.user.gradeLevel ? String(applicant.user.gradeLevel) : "",
        phone: applicant.user.phone ?? "",
        returning: applicant.isReturning ? "Returning" : "New",
        membershipStatus: applicant.membershipStatus,
        statusChangedAt: formatDate(applicant.statusChangedAt),
        submittedAt: formatDate(applicant.applicationSubmittedAt),
      }))
    )
  } catch (error) {
    console.error("Failed to fetch applicants:", error)
    return NextResponse.json(
      { message: "Failed to fetch applicants." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    }

    if (!ALLOWED_ROLES.has(currentUser.role)) {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 })
    }

    const body = await request.json() as {
      id: string
      action: "approve" | "reject" | "edit"
      reason?: string
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      gradeLevel?: string
      shirtSize?: string
      isReturning?: boolean
      whyJoin?: string
      contributionIdeas?: string
      awards?: string
      previousEvents?: string
      scienceClasses?: string
      mathClasses?: string
      questions?: string
    }

    const { id, action, reason } = body

    if (!id || !action) {
      return NextResponse.json(
        { message: "Missing id or action." },
        { status: 400 }
      )
    }

    const activeSeason = await getActiveSeason(currentUser.clubId)

    if (!activeSeason) {
      return NextResponse.json(
        { message: "No active season found." },
        { status: 400 }
      )
    }

    const existing = await prisma.memberSeason.findFirst({
      where: {
        id,
        seasonId: activeSeason.id,
        applicationSubmittedAt: { not: null },
      },
      select: { id: true, userId: true, membershipStatus: true },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Applicant not found." },
        { status: 404 }
      )
    }

    const now = new Date()

    if (action === "approve") {
      await prisma.$transaction([
        prisma.memberSeason.update({
          where: { id },
          data: {
            membershipStatus: MembershipStatus.ACTIVE,
            statusChangedAt: now,
            ...(reason !== undefined && { statusReason: reason }),
          },
        }),
        prisma.user.update({
          where: { id: existing.userId },
          data: { role: UserRole.MEMBER },
        }),
      ])

      return NextResponse.json({ success: true, membershipStatus: "ACTIVE" })
    }

    if (action === "reject") {
      await prisma.memberSeason.update({
        where: { id },
        data: {
          membershipStatus: MembershipStatus.REMOVED,
          statusChangedAt: now,
          ...(reason !== undefined && { statusReason: reason }),
        },
      })

      return NextResponse.json({ success: true, membershipStatus: "REMOVED" })
    }

    if (action === "edit") {
      const {
        firstName,
        lastName,
        email,
        phone,
        gradeLevel,
        shirtSize,
        isReturning,
        whyJoin,
        contributionIdeas,
        awards,
        previousEvents,
        scienceClasses,
        mathClasses,
        questions,
      } = body

      await prisma.$transaction([
        prisma.user.update({
          where: { id: existing.userId },
          data: {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(email !== undefined && { email }),
            ...(phone !== undefined && { phone }),
            ...(gradeLevel !== undefined && {
              gradeLevel: gradeLevel ? parseInt(gradeLevel, 10) : null,
            }),
          },
        }),
        prisma.memberSeason.update({
          where: { id },
          data: {
            ...(shirtSize !== undefined && { shirtSize }),
            ...(isReturning !== undefined && { isReturning }),
            ...(whyJoin !== undefined && { whyJoin }),
            ...(contributionIdeas !== undefined && { contributionIdeas }),
            ...(awards !== undefined && { awards }),
            ...(previousEvents !== undefined && { previousEvents }),
            ...(scienceClasses !== undefined && { scienceClasses }),
            ...(mathClasses !== undefined && { mathClasses }),
            ...(questions !== undefined && { questions }),
          },
        }),
      ])

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ message: "Invalid action." }, { status: 400 })
  } catch (error) {
    console.error("Failed to update applicant:", error)
    return NextResponse.json(
      { message: "Failed to update applicant." },
      { status: 500 }
    )
  }
}
