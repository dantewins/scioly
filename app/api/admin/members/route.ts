import { MembershipStatus } from "@prisma/client"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { formatDate } from "@/lib/format"

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
      const member = await prisma.memberSeason.findFirst({
        where: {
          id,
          seasonId: activeSeason.id,
          membershipStatus: { in: [MembershipStatus.ACTIVE, MembershipStatus.INACTIVE, MembershipStatus.ALUMNI] },
        },
        select: {
          id: true,
          membershipStatus: true,
          statusChangedAt: true,
          statusReason: true,
          isReturning: true,
          shirtSize: true,
          canTravel: true,
          joinedAt: true,
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
            select: {
              id: true,
              status: true,
              preferenceRank: true,
              partnerPreference: true,
              partnerNames: true,
              event: { select: { id: true, name: true } },
            },
            orderBy: { preferenceRank: "asc" },
          },
          teamAssignments: {
            select: {
              id: true,
              role: true,
              seatNumber: true,
              team: {
                select: {
                  id: true,
                  label: true,
                  status: true,
                  event: { select: { id: true, name: true } },
                  competition: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      })

      if (!member) {
        return err("Member not found.", 404)
      }

      return ok({
        id: member.id,
        userId: member.user.id,
        name: `${member.user.firstName} ${member.user.lastName}`.trim(),
        email: member.user.email,
        phone: member.user.phone ?? "",
        grade: member.user.gradeLevel ? String(member.user.gradeLevel) : "",
        shirtSize: member.shirtSize ?? "",
        isReturning: member.isReturning,
        canTravel: member.canTravel,
        membershipStatus: member.membershipStatus,
        statusChangedAt: formatDate(member.statusChangedAt),
        statusReason: member.statusReason ?? "",
        joinedAt: formatDate(member.joinedAt),
        eventEnrollments: member.eventEnrollments.map(e => ({
          id: e.id,
          eventId: e.event.id,
          eventName: e.event.name,
          status: e.status,
          preferenceRank: e.preferenceRank,
          partnerPreference: e.partnerPreference,
          partnerNames: e.partnerNames ?? "",
        })),
        teamAssignments: member.teamAssignments.map(t => ({
          id: t.id,
          role: t.role,
          seatNumber: t.seatNumber,
          teamId: t.team.id,
          teamLabel: t.team.label,
          teamStatus: t.team.status,
          eventId: t.team.event.id,
          eventName: t.team.event.name,
          competitionName: t.team.competition?.name ?? null,
        })),
      })
    }

    const members = await prisma.memberSeason.findMany({
      where: {
        seasonId: activeSeason.id,
        membershipStatus: { in: [MembershipStatus.ACTIVE, MembershipStatus.INACTIVE, MembershipStatus.ALUMNI] },
      },
      select: {
        id: true,
        membershipStatus: true,
        statusChangedAt: true,
        isReturning: true,
        joinedAt: true,
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
          select: { id: true },
        },
        teamAssignments: {
          select: {
            team: {
              select: {
                label: true,
                event: { select: { name: true } },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { joinedAt: "desc" },
    })

    return ok(
      members.map(m => ({
        id: m.id,
        userId: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`.trim(),
        email: m.user.email,
        grade: m.user.gradeLevel ? String(m.user.gradeLevel) : "",
        phone: m.user.phone ?? "",
        membershipStatus: m.membershipStatus,
        statusChangedAt: formatDate(m.statusChangedAt),
        joinedAt: formatDate(m.joinedAt),
        eventCount: m.eventEnrollments.length,
        teamLabel: m.teamAssignments[0]?.team.label ?? null,
        teamEvent: m.teamAssignments[0]?.team.event.name ?? null,
      }))
    )
  },
  "fetch members"
)

export const PATCH = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const body = await request.json() as {
      id: string
      action: "edit" | "deactivate" | "reactivate" | "assign-team"
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      gradeLevel?: string
      shirtSize?: string
      isReturning?: boolean
      canTravel?: boolean
      teamId?: string | null
      role?: string
    }

    const { id, action } = body

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
        membershipStatus: { in: [MembershipStatus.ACTIVE, MembershipStatus.INACTIVE, MembershipStatus.ALUMNI] },
      },
      select: { id: true, userId: true, membershipStatus: true },
    })

    if (!existing) {
      return err("Member not found.", 404)
    }

    const now = new Date()

    if (action === "deactivate") {
      await prisma.memberSeason.update({
        where: { id },
        data: { membershipStatus: MembershipStatus.INACTIVE, statusChangedAt: now },
      })
      return ok({ success: true, membershipStatus: "INACTIVE" })
    }

    if (action === "reactivate") {
      await prisma.memberSeason.update({
        where: { id },
        data: { membershipStatus: MembershipStatus.ACTIVE, statusChangedAt: now },
      })
      return ok({ success: true, membershipStatus: "ACTIVE" })
    }

    if (action === "edit") {
      const { firstName, lastName, email, phone, gradeLevel, shirtSize, isReturning, canTravel } = body

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
            ...(canTravel !== undefined && { canTravel }),
          },
        }),
      ])

      return ok({ success: true })
    }

    if (action === "assign-team") {
      const { teamId, role } = body

      if (!teamId) {
        await prisma.teamAssignment.deleteMany({ where: { memberSeasonId: id } })
        return ok({ success: true })
      }

      const existingAssignment = await prisma.teamAssignment.findFirst({
        where: { memberSeasonId: id },
        select: { id: true },
      })

      if (existingAssignment) {
        await prisma.teamAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            teamId,
            role: (role as "MEMBER" | "CAPTAIN" | "ALTERNATE") ?? "MEMBER",
          },
        })
      } else {
        await prisma.teamAssignment.create({
          data: {
            teamId,
            memberSeasonId: id,
            role: (role as "MEMBER" | "CAPTAIN" | "ALTERNATE") ?? "MEMBER",
          },
        })
      }

      return ok({ success: true })
    }

    return err("Invalid action.", 400)
  },
  "update member"
)
