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

async function getActiveSeason(clubId: string) {
  return prisma.season.findFirst({
    where: { clubId, isActive: true },
    select: { id: true },
    orderBy: { startsAt: "desc" },
  })
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
    if (!ALLOWED_ROLES.has(currentUser.role)) return NextResponse.json({ message: "Forbidden." }, { status: 403 })

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return NextResponse.json({ message: "No active season." }, { status: 400 })

    const body = await request.json() as {
      action: "assign" | "unassign" | "create" | "auto-assign" | "delete"
      competitionId?: string
      eventId?: string
      memberSeasonId?: string
      role?: string
      teamId?: string
      assignmentId?: string
      label?: string
    }

    const { action } = body

    if (action === "assign") {
      const { competitionId, eventId, memberSeasonId, role } = body
      if (!competitionId || !eventId || !memberSeasonId) {
        return NextResponse.json({ message: "Missing required fields." }, { status: 400 })
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { maxParticipants: true },
      })

      let team = await prisma.team.findFirst({
        where: { eventId, competitionId, seasonId: activeSeason.id },
        select: { id: true, assignments: { select: { id: true } } },
      })

      if (!team) {
        team = await prisma.team.create({
          data: {
            seasonId: activeSeason.id,
            eventId,
            competitionId,
            label: "A",
            status: "ACTIVE",
          },
          select: { id: true, assignments: { select: { id: true } } },
        })
      }

      if (event && team.assignments.length >= event.maxParticipants) {
        return NextResponse.json({ message: "Team is already full." }, { status: 409 })
      }

      const conflictSlot = await prisma.eventSchedule.findUnique({
        where: { competitionId_eventId: { competitionId, eventId } },
        select: { timeSlot: true },
      })

      if (conflictSlot) {
        const conflictingAssignment = await prisma.teamAssignment.findFirst({
          where: {
            memberSeasonId,
            team: {
              competitionId,
              event: {
                eventSchedules: {
                  some: {
                    competitionId,
                    timeSlot: conflictSlot.timeSlot,
                    eventId: { not: eventId },
                  },
                },
              },
            },
          },
        })

        if (conflictingAssignment) {
          return NextResponse.json(
            { message: "Member already assigned to another event in the same time slot." },
            { status: 409 }
          )
        }
      }

      const existing = await prisma.teamAssignment.findFirst({
        where: { teamId: team.id, memberSeasonId },
      })

      if (existing) {
        return NextResponse.json({ message: "Member already on this team." }, { status: 409 })
      }

      const assignment = await prisma.teamAssignment.create({
        data: {
          teamId: team.id,
          memberSeasonId,
          role: (role as "MEMBER" | "CAPTAIN" | "ALTERNATE") ?? "MEMBER",
        },
        select: { id: true, teamId: true },
      })

      return NextResponse.json({ success: true, assignmentId: assignment.id, teamId: assignment.teamId })
    }

    if (action === "unassign") {
      const { assignmentId } = body
      if (!assignmentId) return NextResponse.json({ message: "Missing assignmentId." }, { status: 400 })

      await prisma.teamAssignment.delete({ where: { id: assignmentId } })
      return NextResponse.json({ success: true })
    }

    if (action === "create") {
      const { competitionId, eventId, label } = body
      if (!competitionId || !eventId) return NextResponse.json({ message: "Missing fields." }, { status: 400 })

      const team = await prisma.team.create({
        data: {
          seasonId: activeSeason.id,
          eventId,
          competitionId,
          label: label ?? "A",
          status: "DRAFT",
        },
        select: { id: true },
      })

      return NextResponse.json({ success: true, teamId: team.id })
    }

    if (action === "delete") {
      const { teamId } = body
      if (!teamId) return NextResponse.json({ message: "Missing teamId." }, { status: 400 })

      await prisma.teamAssignment.deleteMany({ where: { teamId } })
      await prisma.team.delete({ where: { id: teamId } })
      return NextResponse.json({ success: true })
    }

    if (action === "auto-assign") {
      const { competitionId } = body
      if (!competitionId) return NextResponse.json({ message: "Missing competitionId." }, { status: 400 })

      const schedules = await prisma.eventSchedule.findMany({
        where: { competitionId },
        select: {
          timeSlot: true,
          slotLabel: true,
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
              maxParticipants: true,
              sortOrder: true,
            },
          },
        },
        orderBy: [{ timeSlot: "asc" }, { event: { sortOrder: "asc" } }],
      })

      const allMembers = await prisma.memberSeason.findMany({
        where: { seasonId: activeSeason.id, membershipStatus: "ACTIVE" },
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
          eventEnrollments: {
            select: { eventId: true, skillRating: true, preferenceRank: true },
          },
        },
      })

      const assignedInSlot = new Map<string, Set<number>>()
      for (const m of allMembers) {
        assignedInSlot.set(m.id, new Set())
      }

      const existingAssignments = await prisma.teamAssignment.findMany({
        where: { team: { competitionId } },
        select: {
          memberSeasonId: true,
          team: {
            select: {
              event: {
                select: {
                  eventSchedules: {
                    where: { competitionId },
                    select: { timeSlot: true },
                  },
                },
              },
            },
          },
        },
      })

      for (const ea of existingAssignments) {
        const slot = ea.team.event.eventSchedules[0]?.timeSlot
        if (slot != null) {
          assignedInSlot.get(ea.memberSeasonId)?.add(slot)
        }
      }

      await prisma.teamAssignment.deleteMany({ where: { team: { competitionId } } })

      for (const m of allMembers) {
        assignedInSlot.set(m.id, new Set())
      }

      let teamsCreated = 0
      let membersAssigned = 0

      const slotGroups = new Map<number, typeof schedules>()
      for (const s of schedules) {
        if (!slotGroups.has(s.timeSlot)) slotGroups.set(s.timeSlot, [])
        slotGroups.get(s.timeSlot)!.push(s)
      }

      for (const [timeSlot, slotEvents] of Array.from(slotGroups.entries()).sort(([a], [b]) => a - b)) {
        for (const schedule of slotEvents) {
          const { event } = schedule

          let team = await prisma.team.findFirst({
            where: { seasonId: activeSeason.id, eventId: event.id, competitionId },
            select: { id: true },
          })

          if (!team) {
            team = await prisma.team.create({
              data: {
                seasonId: activeSeason.id,
                eventId: event.id,
                competitionId,
                label: "A",
                status: "ACTIVE",
              },
              select: { id: true },
            })
            teamsCreated++
          }

          const candidates = allMembers
            .filter(m => {
              const slots = assignedInSlot.get(m.id)
              if (!slots) return false
              if (slots.has(timeSlot)) return false
              return m.eventEnrollments.some(e => e.eventId === event.id)
            })
            .map(m => {
              const enrollment = m.eventEnrollments.find(e => e.eventId === event.id)!
              return {
                id: m.id,
                skillRating: enrollment.skillRating ?? 0,
                preferenceRank: enrollment.preferenceRank ?? 999,
              }
            })
            .sort((a, b) => {
              if (b.skillRating !== a.skillRating) return b.skillRating - a.skillRating
              return a.preferenceRank - b.preferenceRank
            })
            .slice(0, event.maxParticipants)

          for (const candidate of candidates) {
            await prisma.teamAssignment.create({
              data: { teamId: team.id, memberSeasonId: candidate.id, role: "MEMBER" },
            })
            assignedInSlot.get(candidate.id)?.add(timeSlot)
            membersAssigned++
          }
        }
      }

      return NextResponse.json({ success: true, teamsCreated, membersAssigned })
    }

    return NextResponse.json({ message: "Invalid action." }, { status: 400 })
  } catch (error) {
    console.error("Failed to manage team:", error)
    return NextResponse.json({ message: "Failed to manage team." }, { status: 500 })
  }
}
