import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SAMPLE_ASSIGNMENTS: Record<string, string[]> = {
  "Anatomy and Physiology": ["alex.chen@student.ppchs.edu", "morgan.davis@student.ppchs.edu"],
  "Astronomy": ["maya.patel@student.ppchs.edu", "alex.rodriguez@student.ppchs.edu"],
  "Chemistry Lab": ["taylor.kim@student.ppchs.edu", "morgan.white@student.ppchs.edu"],
  "Dynamic Planet": ["jordan.lee@student.ppchs.edu", "cameron.brown@student.ppchs.edu"],
  "Forensics": ["avery.wilson@student.ppchs.edu", "sam.rivera@student.ppchs.edu"],
  "Experimental Design": ["cameron.brown@student.ppchs.edu", "maya.patel@student.ppchs.edu"],
}

async function main() {
  const competition = await prisma.competition.findFirst({
    where: { name: "South Broward Invitational" },
    include: { teams: { include: { assignments: true } } },
  })

  if (!competition) {
    console.error("South Broward Invitational not found")
    process.exit(1)
  }

  const teamIds = competition.teams.map((t) => t.id)

  await prisma.teamAssignment.deleteMany({ where: { teamId: { in: teamIds } } })
  await prisma.team.deleteMany({ where: { id: { in: teamIds } } })

  console.log(`Deleted ${teamIds.length} teams and all their assignments`)

  const users = await prisma.user.findMany({
    where: { email: { in: Object.values(SAMPLE_ASSIGNMENTS).flat() } },
    include: { seasonMemberships: { where: { seasonId: competition.seasonId } } },
  })

  const memberSeasonMap = new Map<string, string>()
  for (const u of users) {
    if (u.seasonMemberships[0]) memberSeasonMap.set(u.email, u.seasonMemberships[0].id)
  }

  const events = await prisma.event.findMany({
    where: { seasonId: competition.seasonId, name: { in: Object.keys(SAMPLE_ASSIGNMENTS) } },
  })

  const eventMap = new Map(events.map((e) => [e.name, e.id]))

  let teamsCreated = 0
  let assignmentsCreated = 0

  for (const [eventName, emails] of Object.entries(SAMPLE_ASSIGNMENTS)) {
    const eventId = eventMap.get(eventName)
    if (!eventId) {
      console.warn(`Event not found: ${eventName}`)
      continue
    }

    const team = await prisma.team.create({
      data: {
        seasonId: competition.seasonId,
        eventId,
        competitionId: competition.id,
        label: "A",
        status: "ACTIVE",
      },
    })
    teamsCreated++

    for (const email of emails) {
      const msId = memberSeasonMap.get(email)
      if (!msId) {
        console.warn(`MemberSeason not found for: ${email}`)
        continue
      }
      await prisma.teamAssignment.create({
        data: { teamId: team.id, memberSeasonId: msId, role: "MEMBER" },
      })
      assignmentsCreated++
    }
  }

  console.log(`Created ${teamsCreated} teams, ${assignmentsCreated} assignments`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
