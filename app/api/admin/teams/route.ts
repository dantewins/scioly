import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (_request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    const teams = await prisma.team.findMany({
      where: { seasonId: activeSeason.id, competitionId: { not: null } },
      select: {
        id: true,
        label: true,
        status: true,
        competition: { select: { id: true, name: true, type: true, startsAt: true } },
        event: { select: { name: true } },
        assignments: { select: { id: true } },
      },
      orderBy: [{ competition: { startsAt: "asc" } }, { label: "asc" }, { event: { sortOrder: "asc" } }],
    })

    // Group by competition → then by squad label
    const compMap = new Map<string, {
      competitionId: string
      competitionName: string
      competitionType: string
      squads: Map<string, { eventCount: number; memberCount: number }>
    }>()

    for (const team of teams) {
      if (!team.competition) continue
      const cid = team.competition.id
      if (!compMap.has(cid)) {
        compMap.set(cid, {
          competitionId: cid,
          competitionName: team.competition.name,
          competitionType: team.competition.type,
          squads: new Map(),
        })
      }
      const comp = compMap.get(cid)!
      const label = team.label
      if (!comp.squads.has(label)) {
        comp.squads.set(label, { eventCount: 0, memberCount: 0 })
      }
      const squad = comp.squads.get(label)!
      squad.eventCount++
      squad.memberCount += team.assignments.length
    }

    const result = Array.from(compMap.values()).map(c => ({
      competitionId: c.competitionId,
      competitionName: c.competitionName,
      competitionType: c.competitionType,
      squads: Array.from(c.squads.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, { eventCount, memberCount }]) => ({ label, eventCount, memberCount })),
    }))

    return ok(result)
  },
  "fetch team roster"
)

export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    const body = await request.json() as {
      action: "assign" | "unassign" | "create" | "auto-assign" | "delete" | "reset"
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
      const { competitionId, eventId, memberSeasonId, role, label = "A" } = body
      if (!competitionId || !eventId || !memberSeasonId) {
        return err("Missing required fields.", 400)
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { maxParticipants: true },
      })

      let team = await prisma.team.findFirst({
        where: { eventId, competitionId, seasonId: activeSeason.id, label },
        select: { id: true, assignments: { select: { id: true } } },
      })

      if (!team) {
        team = await prisma.team.create({
          data: {
            seasonId: activeSeason.id,
            eventId,
            competitionId,
            label,
            status: "ACTIVE",
          },
          select: { id: true, assignments: { select: { id: true } } },
        })
      }

      if (event && team.assignments.length >= event.maxParticipants) {
        return err("Team is already full.", 409)
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
          return err("Member already assigned to another event in the same time slot.", 409)
        }
      }

      const existing = await prisma.teamAssignment.findFirst({
        where: { teamId: team.id, memberSeasonId },
      })

      if (existing) {
        return err("Member already on this team.", 409)
      }

      const assignment = await prisma.teamAssignment.create({
        data: {
          teamId: team.id,
          memberSeasonId,
          role: (role as "MEMBER" | "CAPTAIN" | "ALTERNATE") ?? "MEMBER",
        },
        select: { id: true, teamId: true },
      })

      return ok({ success: true, assignmentId: assignment.id, teamId: assignment.teamId })
    }

    if (action === "unassign") {
      const { assignmentId } = body
      if (!assignmentId) return err("Missing assignmentId.", 400)

      await prisma.teamAssignment.delete({ where: { id: assignmentId } })
      return ok({ success: true })
    }

    if (action === "create") {
      const { competitionId, eventId, label } = body
      if (!competitionId || !eventId) return err("Missing fields.", 400)

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

      return ok({ success: true, teamId: team.id })
    }

    if (action === "delete") {
      const { teamId } = body
      if (!teamId) return err("Missing teamId.", 400)

      await prisma.teamAssignment.deleteMany({ where: { teamId } })
      await prisma.team.delete({ where: { id: teamId } })
      return ok({ success: true })
    }

    if (action === "reset") {
      const { competitionId, label } = body
      if (!competitionId) return err("Missing competitionId.", 400)
      await prisma.teamAssignment.deleteMany({
        where: { team: { competitionId, ...(label ? { label } : {}) } },
      })
      return ok({ success: true })
    }

    if (action === "auto-assign") {
      const { competitionId, label = "A" } = body
      if (!competitionId) return err("Missing competitionId.", 400)

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

      // Clear only the current squad's assignments before re-assigning
      await prisma.teamAssignment.deleteMany({ where: { team: { competitionId, label } } })

      // Gather members already on OTHER squads for this competition — exclude them as candidates
      const otherSquadMemberIds = new Set<string>(
        (await prisma.teamAssignment.findMany({
          where: { team: { competitionId, label: { not: label } } },
          select: { memberSeasonId: true },
        })).map(a => a.memberSeasonId)
      )

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
            where: { seasonId: activeSeason.id, eventId: event.id, competitionId, label },
            select: { id: true },
          })

          if (!team) {
            team = await prisma.team.create({
              data: {
                seasonId: activeSeason.id,
                eventId: event.id,
                competitionId,
                label,
                status: "ACTIVE",
              },
              select: { id: true },
            })
            teamsCreated++
          }

          const candidates = allMembers
            .filter(m => {
              if (otherSquadMemberIds.has(m.id)) return false
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

      return ok({ success: true, teamsCreated, membersAssigned })
    }

    return err("Invalid action.", 400)
  },
  "manage team"
)
