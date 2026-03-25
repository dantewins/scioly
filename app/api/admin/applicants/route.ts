import { MembershipStatus, UserRole } from "@prisma/client"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { formatDate, extractUploadedFileName } from "@/lib/format"
import { sendPasswordSetupEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")?.trim()

    const activeSeason = await getActiveSeason(currentUser.clubId)

    if (!activeSeason) {
      return ok(id ? null : [])
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
        return err("Applicant not found.", 404)
      }

      return ok({
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

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)))
    const status = searchParams.get("status")?.trim() ?? "all"
    const search = searchParams.get("search")?.trim() ?? ""

    const baseWhere = {
      seasonId: activeSeason.id,
      applicationSubmittedAt: { not: null },
      ...(status !== "all" && { membershipStatus: status as MembershipStatus }),
      ...(search && {
        OR: [
          { user: { firstName: { contains: search, mode: "insensitive" as const } } },
          { user: { lastName: { contains: search, mode: "insensitive" as const } } },
          { user: { email: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    }

    const [total, applicants] = await Promise.all([
      prisma.memberSeason.count({ where: baseWhere }),
      prisma.memberSeason.findMany({
        where: baseWhere,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return ok({
      items: applicants.map((applicant) => ({
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
      })),
      total,
    })
  },
  "fetch applicants"
)

export const PATCH = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
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
      return err("Missing id or action.", 400)
    }

    const activeSeason = await getActiveSeason(currentUser.clubId)

    if (!activeSeason) {
      return err("No active season found.", 400)
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
      return err("Applicant not found.", 404)
    }

    const now = new Date()

    if (action === "approve") {
      const [, approvedUser] = await prisma.$transaction([
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
          select: { email: true, firstName: true, passwordHash: true },
        }),
      ])

      // If the user has no password yet, create a setup token and email them.
      if (!approvedUser.passwordHash) {
        const setupToken = await prisma.passwordSetupToken.create({
          data: {
            userId: existing.userId,
            expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          },
        })
        try {
          await sendPasswordSetupEmail(approvedUser.email, setupToken.token, approvedUser.firstName)
        } catch (emailError) {
          console.error("Failed to send password setup email:", emailError)
          // Non-fatal — approval still succeeds
        }
      }

      return ok({ success: true, membershipStatus: "ACTIVE" })
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

      return ok({ success: true, membershipStatus: "REMOVED" })
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

      return ok({ success: true })
    }

    return err("Invalid action.", 400)
  },
  "update applicant"
)
