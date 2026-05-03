// prisma/seed-large.ts
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { adminPermissions, boardMemberPermissions, memberPermissions } from "../lib/permissions"
import { syncCompetitionEventsForCompetition } from "../lib/competition-event-sync"

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  console.error("DATABASE_URL is not set.")
  process.exit(1)
}

function isLikelyProd(url: string): boolean {
  const prodHosts = ["vercel.app", "neon.tech", "supabase", "railway.app"]
  const safeMarkers = ["dev", "local", "staging", "test"]
  const lower = url.toLowerCase()
  if (!prodHosts.some((h) => lower.includes(h))) return false
  return !safeMarkers.some((m) => lower.includes(m))
}

if (isLikelyProd(dbUrl) && !process.argv.includes("--force")) {
  console.error(
    "DATABASE_URL looks like production. Refusing to seed. Pass --force to override.",
  )
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Casey", "Morgan", "Taylor", "Riley", "Quinn",
  "Harper", "Avery", "Drew", "Reese", "Skyler", "Parker", "Blake", "Cameron",
  "Dakota", "Elliot", "Frankie", "Gray", "Hayden", "Indie", "Jess", "Kendall",
  "Logan", "Maddox", "Noa", "Oakley", "Phoenix", "Rowan", "Sage", "Toby",
  "Aria", "Bea", "Cleo", "Devin", "Eden", "Fin", "Gem", "Halle",
  "Iris", "Jolie", "Kai", "Luna", "Milo", "Nova", "Otto", "Piper",
]
const LAST_NAMES = [
  "Rivera", "Smith", "Lee", "Patel", "Nguyen", "Garcia", "Kim", "Brown",
  "Davis", "Lopez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas",
  "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Harris",
  "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Perez",
  "Hall", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Hill",
  "Flores", "Green", "Adams", "Nelson", "Baker", "Carter", "Mitchell",
  "Roberts", "Phillips", "Campbell", "Ortega",
]
const EVENT_NAMES = [
  { name: "Anatomy & Physiology", code: "ANP" },
  { name: "Astronomy", code: "AST" },
  { name: "Bridge", code: "BRG" },
  { name: "Chemistry Lab", code: "CLB" },
  { name: "Codebusters", code: "COD" },
  { name: "Detector Building", code: "DET" },
  { name: "Disease Detectives", code: "DIS" },
  { name: "Dynamic Planet", code: "DPN" },
  { name: "Ecology", code: "ECO" },
  { name: "Electric Vehicle", code: "EVL" },
  { name: "Entomology", code: "ENT" },
  { name: "Experimental Design", code: "EXP" },
  { name: "Forensics", code: "FOR" },
  { name: "Fossils", code: "FOS" },
  { name: "Geologic Mapping", code: "GEO" },
  { name: "Helicopter", code: "HEL" },
  { name: "It's About Time", code: "TIM" },
  { name: "Materials Science", code: "MAT" },
  { name: "Microbe Mission", code: "MIC" },
  { name: "Optics", code: "OPT" },
  { name: "Robot Tour", code: "ROB" },
  { name: "Wind Power", code: "WND" },
  { name: "Write It Do It", code: "WID" },
]

async function main() {
  console.log("Seeding LARGE database...")

  // Clean slate (cascades from Club)
  await prisma.club.deleteMany()

  const passwordHash = await bcrypt.hash("password123", 12)

  const club = await prisma.club.create({
    data: {
      name: "MAST Science Olympiad",
      slug: "mast-scioly",
      schoolName: "Maritime and Science Technology Academy",
      schoolDomain: "mast.edu",
    },
  })

  await prisma.clubEmailDomain.create({
    data: { clubId: club.id, domain: "mast.edu", isPrimary: true, isActive: true },
  })

  const currentSeason = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "2025–2026 Season",
      schoolYear: "2025-2026",
      startsAt: new Date("2025-09-01"),
      endsAt: new Date("2026-06-01"),
      isActive: true,
    },
  })

  const priorSeason = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "2024–2025 Season",
      schoolYear: "2024-2025",
      startsAt: new Date("2024-09-01"),
      endsAt: new Date("2025-06-01"),
      isActive: false,
    },
  })

  await prisma.event.createMany({
    data: EVENT_NAMES.map((e, i) => ({
      seasonId: currentSeason.id,
      name: e.name,
      code: e.code,
      minParticipants: 2,
      maxParticipants: 2,
      sortOrder: i,
    })),
  })

  await prisma.event.createMany({
    data: EVENT_NAMES.slice(0, 10).map((e, i) => ({
      seasonId: priorSeason.id,
      name: e.name,
      code: e.code,
      minParticipants: 2,
      maxParticipants: 2,
      sortOrder: i,
    })),
  })

  const [adminRole, boardRole, memberRole] = await Promise.all([
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Admin",
        description: "Full access to all club management features.",
        permissions: adminPermissions(),
      },
    }),
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Board Member",
        description: "Can view, create, and edit most content.",
        permissions: boardMemberPermissions(),
      },
    }),
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Member",
        description: "View access plus submit hours and attempt practice.",
        permissions: memberPermissions(),
      },
    }),
  ])

  // Owner
  const owner = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "owner@mast.edu",
      passwordHash,
      role: "WEBSITE_OWNER",
      firstName: "Alex",
      lastName: "Rivera",
    },
  })
  const ownerMs = await prisma.memberSeason.create({
    data: { userId: owner.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
  })
  await prisma.memberRole.create({
    data: { memberSeasonId: ownerMs.id, clubRoleId: adminRole.id },
  })

  // Board user
  const boardUser = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "board@mast.edu",
      passwordHash,
      role: "MEMBER",
      firstName: "Jordan",
      lastName: "Smith",
    },
  })
  const boardMs = await prisma.memberSeason.create({
    data: { userId: boardUser.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
  })
  await prisma.memberRole.create({
    data: { memberSeasonId: boardMs.id, clubRoleId: boardRole.id },
  })

  // Default Member (matches small-seed credentials)
  const member = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "member@mast.edu",
      passwordHash,
      role: "MEMBER",
      firstName: "Casey",
      lastName: "Lee",
    },
  })
  const memberMs = await prisma.memberSeason.create({
    data: { userId: member.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
  })
  await prisma.memberRole.create({
    data: { memberSeasonId: memberMs.id, clubRoleId: memberRole.id },
  })

  // 47 more members (total 50: 1 owner, 1 board, 48 members)
  const memberSeasonRefs: { id: string; userId: string }[] = [
    { id: memberMs.id, userId: member.id },
  ]
  for (let i = 0; i < 47; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length]
    const ln = LAST_NAMES[i % LAST_NAMES.length]
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@mast.edu`
    const u = await prisma.user.create({
      data: {
        clubId: club.id,
        email,
        passwordHash,
        role: "MEMBER",
        firstName: fn,
        lastName: ln,
      },
    })
    const ms = await prisma.memberSeason.create({
      data: { userId: u.id, seasonId: currentSeason.id, membershipStatus: "ACTIVE" },
    })
    await prisma.memberRole.create({
      data: { memberSeasonId: ms.id, clubRoleId: memberRole.id },
    })
    memberSeasonRefs.push({ id: ms.id, userId: u.id })
  }

  // 30 prior-season memberships (alumni)
  for (const m of memberSeasonRefs.slice(0, 30)) {
    await prisma.memberSeason.create({
      data: { userId: m.userId, seasonId: priorSeason.id, membershipStatus: "ALUMNI" },
    })
  }

  // 5 competitions: 3 past, 1 ongoing-ish, 1 upcoming
  const competitionData = [
    { name: "Fall Invitational 2025", startsAt: "2025-10-15" },
    { name: "Winter Tournament 2025", startsAt: "2025-12-10" },
    { name: "MIT Invitational", startsAt: "2026-01-20" },
    { name: "Spring Regional", startsAt: "2026-04-30" },
    { name: "State Championship", startsAt: "2026-05-15" },
  ]
  for (const c of competitionData) {
    const comp = await prisma.competition.create({
      data: {
        seasonId: currentSeason.id,
        name: c.name,
        type: "INVITATIONAL",
        location: "TBD",
        startsAt: new Date(c.startsAt),
        isPublished: true,
      },
    })
    await syncCompetitionEventsForCompetition(comp.id, prisma)
  }

  // Hour categories
  const hourCats = await Promise.all([
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Study Sessions",
        description: "Independent or group study.",
        requiresApproval: false,
      },
    }),
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Practice Tests",
        description: "Working through practice exams.",
        requiresApproval: true,
      },
    }),
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Build Time",
        description: "Time spent building/testing.",
        requiresApproval: true,
      },
    }),
    prisma.hourCategory.create({
      data: {
        seasonId: currentSeason.id,
        name: "Volunteer Work",
        description: "Outreach and tournament help.",
        requiresApproval: true,
      },
    }),
  ])

  // 200 hour entries
  const hourStatusCycle: Array<"PENDING" | "APPROVED" | "REJECTED"> = [
    "PENDING", "APPROVED", "APPROVED", "REJECTED",
  ]
  for (let i = 0; i < 200; i++) {
    const ms = memberSeasonRefs[i % memberSeasonRefs.length]
    const cat = hourCats[i % hourCats.length]
    const status = hourStatusCycle[i % hourStatusCycle.length]
    await prisma.hourEntry.create({
      data: {
        memberSeasonId: ms.id,
        categoryId: cat.id,
        title: `Session #${i + 1}`,
        description: "Auto-seeded entry.",
        totalHours: ((i % 4) + 1) * 0.5,
        status,
        approvedAt: status === "APPROVED" ? new Date() : null,
        approvedById: status === "APPROVED" ? owner.id : null,
        rejectionReason: status === "REJECTED" ? "Insufficient detail." : null,
      },
    })
  }

  // 10 assessments × 3 parts × 5 prompts
  const eventsForAssessments = await prisma.event.findMany({
    where: { seasonId: currentSeason.id },
    take: 10,
    orderBy: { sortOrder: "asc" },
  })
  for (const ev of eventsForAssessments) {
    const a = await prisma.assessment.create({
      data: {
        seasonId: currentSeason.id,
        eventId: ev.id,
        title: `${ev.name} Practice 1`,
        format: "TEST",
        isPublished: true,
      },
    })
    for (let p = 0; p < 3; p++) {
      const part = await prisma.assessmentPart.create({
        data: {
          assessmentId: a.id,
          title: `Section ${p + 1}`,
          type: "SECTION",
          sortOrder: p,
        },
      })
      for (let q = 0; q < 5; q++) {
        await prisma.assessmentPrompt.create({
          data: {
            assessmentId: a.id,
            partId: part.id,
            promptNumber: p * 5 + q + 1,
            responseType: "SHORT_TEXT",
            pointsPossible: 1,
            answerKeyText: `Sample answer ${p}.${q}`,
            isRequired: true,
          },
        })
      }
    }
  }

  // 30 attempts × ~15 responses
  const allAssessments = await prisma.assessment.findMany({
    where: { seasonId: currentSeason.id },
    include: { prompts: true },
  })
  for (let i = 0; i < 30; i++) {
    const ms = memberSeasonRefs[i % memberSeasonRefs.length]
    const a = allAssessments[i % allAssessments.length]
    const att = await prisma.assessmentAttempt.create({
      data: {
        assessmentId: a.id,
        memberSeasonId: ms.id,
        status: "SCORED",
        scoreEarned: 12,
        scorePossible: 15,
        submittedAt: new Date(),
        gradedAt: new Date(),
      },
    })
    for (const prompt of a.prompts) {
      const correct = (i + prompt.promptNumber) % 3 !== 0
      await prisma.assessmentResponse.create({
        data: {
          attemptId: att.id,
          promptId: prompt.id,
          responseText: "Sample response.",
          isCorrect: correct,
          pointsAwarded: correct ? 1 : 0,
        },
      })
    }
  }

  // 3 form types × 30 submissions each
  const formTypes = await Promise.all([
    prisma.formType.create({
      data: {
        seasonId: currentSeason.id,
        name: "Photo Release",
        category: "PHOTO_RELEASE",
        isRequired: true,
      },
    }),
    prisma.formType.create({
      data: {
        seasonId: currentSeason.id,
        name: "Travel Waiver",
        category: "TRAVEL",
        isRequired: true,
      },
    }),
    prisma.formType.create({
      data: {
        seasonId: currentSeason.id,
        name: "Code of Conduct",
        category: "CODE_OF_CONDUCT",
        isRequired: true,
      },
    }),
  ])
  const subStatusCycle: Array<"NOT_STARTED" | "SUBMITTED" | "VERIFIED"> = [
    "NOT_STARTED", "SUBMITTED", "VERIFIED",
  ]
  for (const ft of formTypes) {
    for (let i = 0; i < 30; i++) {
      const ms = memberSeasonRefs[i % memberSeasonRefs.length]
      const status = subStatusCycle[i % subStatusCycle.length]
      await prisma.formSubmission.create({
        data: {
          formTypeId: ft.id,
          memberSeasonId: ms.id,
          status,
          acknowledgement: i % 2 === 0,
          submittedAt: status !== "NOT_STARTED" ? new Date() : null,
          verifiedAt: status === "VERIFIED" ? new Date() : null,
        },
      })
    }
  }

  // 15 membership applications
  const appStatusCycle: Array<
    "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "WAITLISTED" | "DENIED"
  > = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "WAITLISTED", "DENIED"]
  for (let i = 0; i < 15; i++) {
    const fn = FIRST_NAMES[(48 + i) % FIRST_NAMES.length]
    const ln = LAST_NAMES[(48 + i) % LAST_NAMES.length]
    await prisma.membershipApplication.create({
      data: {
        clubId: club.id,
        seasonId: currentSeason.id,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}.applicant${i + 1}@mast.edu`,
        gradeLevel: 9 + (i % 4),
        whyJoin: "Excited to join the team.",
        status: appStatusCycle[i % appStatusCycle.length],
      },
    })
  }

  // Finance account + 40 entries
  const financeAccount = await prisma.financeAccount.create({
    data: {
      clubId: club.id,
      seasonId: currentSeason.id,
      name: "Main Account",
      type: "CHECKING",
      isDefault: true,
    },
  })
  const directionCycle: Array<"CREDIT" | "DEBIT"> = ["CREDIT", "DEBIT"]
  const categoryCycle: Array<
    | "DUES" | "DONATION" | "FUNDRAISER" | "REGISTRATION"
    | "TRAVEL" | "SUPPLIES" | "REIMBURSEMENT" | "OTHER"
  > = [
    "DUES", "DONATION", "FUNDRAISER", "REGISTRATION",
    "TRAVEL", "SUPPLIES", "REIMBURSEMENT", "OTHER",
  ]
  for (let i = 0; i < 40; i++) {
    await prisma.financeEntry.create({
      data: {
        clubId: club.id,
        seasonId: currentSeason.id,
        accountId: financeAccount.id,
        direction: directionCycle[i % 2],
        category: categoryCycle[i % categoryCycle.length],
        amountCents: (i + 1) * 1000,
        title: `Entry ${i + 1}`,
        occurredAt: new Date(2026, 0, 1 + (i % 28)),
      },
    })
  }

  console.log("LARGE seed complete.")
  console.log("  Owner:  owner@mast.edu / password123")
  console.log("  Board:  board@mast.edu / password123")
  console.log("  Member: member@mast.edu / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
