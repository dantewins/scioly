import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const competitionRosterSelect = {
  id: true,
  label: true,
  division: true,
  notes: true,
  seasonRosterId: true,
  assignments: {
    orderBy: [{ schedule: { timeSlot: "asc" } }, { event: { sortOrder: "asc" } }],
    select: {
      id: true,
      room: true,
      block: true,
      entryLabel: true,
      status: true,
      notes: true,
      placement: true,
      scoreEarned: true,
      scorePossible: true,
      medalNotes: true,
      resultRecordedAt: true,
      event: { select: { id: true, name: true, code: true } },
      schedule: {
        select: {
          id: true,
          timeSlot: true,
          slotLabel: true,
          room: true,
          startsAt: true,
          endsAt: true,
        },
      },
      slot: {
        select: {
          id: true,
          label: true,
          room: true,
          startsAt: true,
          endsAt: true,
        },
      },
      participants: {
        orderBy: [
          { role: "asc" },
          { memberSeason: { user: { lastName: "asc" } } },
          { memberSeason: { user: { firstName: "asc" } } },
        ],
        select: {
          id: true,
          role: true,
          seatNumber: true,
          memberSeason: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CompetitionRosterSelect

export type CompetitionRosterRecord = Prisma.CompetitionRosterGetPayload<{
  select: typeof competitionRosterSelect
}>

function isMissingCompetitionOntologyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  return (
    error.message.includes("CompetitionRoster") ||
    error.message.includes("CompetitionEventAssignment") ||
    error.message.includes("CompetitionAssignmentParticipant")
  )
}

export async function listCanonicalCompetitionRosters(
  competitionId: string,
): Promise<CompetitionRosterRecord[]> {
  try {
    return await prisma.competitionRoster.findMany({
      where: { competitionId },
      select: competitionRosterSelect,
      orderBy: { label: "asc" },
    })
  } catch (error) {
    if (isMissingCompetitionOntologyError(error)) {
      return []
    }

    throw error
  }
}

export async function getCanonicalCompetitionRoster(
  rosterId: string,
): Promise<CompetitionRosterRecord | null> {
  try {
    return await prisma.competitionRoster.findUnique({
      where: { id: rosterId },
      select: competitionRosterSelect,
    })
  } catch (error) {
    if (isMissingCompetitionOntologyError(error)) {
      return null
    }

    throw error
  }
}
