import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  EventEnrollmentStatus,
  MembershipStatus,
  PartnerPreference,
  PrismaClient,
  UserRole,
} from "@prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const EVENTS = [
  "Anatomy and Physiology",
  "Astronomy",
  "Boomilever",
  "Bungee Drop",
  "Chemistry Lab",
  "Circuit Lab",
  "Codebusters",
  "Designer Genes",
  "Disease Detectives",
  "Dynamic Planet",
  "Electric Vehicle",
  "Engineering CAD",
  "Entomology",
  "Experimental Design",
  "Forensics",
  "Helicopter",
  "Hovercraft",
  "Machines",
  "Materials Science",
  "Remote Sensing",
  "Robot Tour",
  "Rocks and Minerals",
  "Water Quality",
]

const INVITATIONAL_SLOTS = [
  {
    timeSlot: 1,
    slotLabel: "8:00–9:00 AM",
    events: ["Anatomy and Physiology", "Astronomy", "Codebusters", "Rocks and Minerals"],
  },
  {
    timeSlot: 2,
    slotLabel: "9:15–10:15 AM",
    events: ["Chemistry Lab", "Disease Detectives", "Forensics", "Boomilever"],
  },
  {
    timeSlot: 3,
    slotLabel: "10:30–11:30 AM",
    events: ["Designer Genes", "Dynamic Planet", "Experimental Design", "Helicopter"],
  },
  {
    timeSlot: 4,
    slotLabel: "11:45 AM–12:45 PM",
    events: ["Circuit Lab", "Entomology", "Water Quality", "Bungee Drop"],
  },
  {
    timeSlot: 5,
    slotLabel: "1:00–2:00 PM",
    events: ["Engineering CAD", "Materials Science", "Remote Sensing", "Hovercraft"],
  },
  {
    timeSlot: 6,
    slotLabel: "2:15–3:15 PM",
    events: ["Electric Vehicle", "Machines", "Robot Tour"],
  },
]

const REGIONAL_SLOTS = [
  {
    timeSlot: 1,
    slotLabel: "8:00–9:00 AM",
    events: ["Anatomy and Physiology", "Circuit Lab", "Engineering CAD", "Electric Vehicle"],
  },
  {
    timeSlot: 2,
    slotLabel: "9:15–10:15 AM",
    events: ["Astronomy", "Chemistry Lab", "Disease Detectives", "Machines"],
  },
  {
    timeSlot: 3,
    slotLabel: "10:30–11:30 AM",
    events: ["Dynamic Planet", "Entomology", "Experimental Design", "Boomilever"],
  },
  {
    timeSlot: 4,
    slotLabel: "11:45 AM–12:45 PM",
    events: ["Forensics", "Designer Genes", "Materials Science", "Robot Tour"],
  },
  {
    timeSlot: 5,
    slotLabel: "1:00–2:00 PM",
    events: ["Rocks and Minerals", "Water Quality", "Codebusters", "Bungee Drop"],
  },
  {
    timeSlot: 6,
    slotLabel: "2:15–3:15 PM",
    events: ["Remote Sensing", "Helicopter", "Hovercraft"],
  },
]

const MEMBERS: {
  firstName: string
  lastName: string
  email: string
  grade: number
  status: MembershipStatus
  events: { name: string; rank: number; skill: number; partnerPref?: PartnerPreference; partnerName?: string }[]
}[] = [
    {
      firstName: "Alex",
      lastName: "Chen",
      email: "alex.chen@student.ppchs.edu",
      grade: 9,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Anatomy and Physiology", rank: 1, skill: 9 },
        { name: "Disease Detectives", rank: 2, skill: 8 },
        { name: "Designer Genes", rank: 3, skill: 7 },
        { name: "Forensics", rank: 4, skill: 6 },
        { name: "Water Quality", rank: 5, skill: 5 },
      ],
    },
    {
      firstName: "Maya",
      lastName: "Patel",
      email: "maya.patel@student.ppchs.edu",
      grade: 9,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Astronomy", rank: 1, skill: 9, partnerPref: PartnerPreference.RECOMMENDED, partnerName: "Jordan Williams" },
        { name: "Codebusters", rank: 2, skill: 8 },
        { name: "Dynamic Planet", rank: 3, skill: 7 },
        { name: "Remote Sensing", rank: 4, skill: 8 },
        { name: "Experimental Design", rank: 5, skill: 6 },
      ],
    },
    {
      firstName: "Jordan",
      lastName: "Williams",
      email: "jordan.williams@student.ppchs.edu",
      grade: 9,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Astronomy", rank: 1, skill: 8, partnerPref: PartnerPreference.RECOMMENDED, partnerName: "Maya Patel" },
        { name: "Rocks and Minerals", rank: 2, skill: 9 },
        { name: "Entomology", rank: 3, skill: 7 },
        { name: "Remote Sensing", rank: 4, skill: 6 },
        { name: "Dynamic Planet", rank: 5, skill: 7 },
      ],
    },
    {
      firstName: "Sam",
      lastName: "Rivera",
      email: "sam.rivera@student.ppchs.edu",
      grade: 9,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Forensics", rank: 1, skill: 8 },
        { name: "Experimental Design", rank: 2, skill: 9 },
        { name: "Anatomy and Physiology", rank: 3, skill: 7 },
        { name: "Water Quality", rank: 4, skill: 7 },
        { name: "Disease Detectives", rank: 5, skill: 6 },
      ],
    },
    {
      firstName: "Casey",
      lastName: "Thompson",
      email: "casey.thompson@student.ppchs.edu",
      grade: 9,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Boomilever", rank: 1, skill: 7 },
        { name: "Helicopter", rank: 2, skill: 8 },
        { name: "Bungee Drop", rank: 3, skill: 7 },
        { name: "Machines", rank: 4, skill: 6 },
        { name: "Robot Tour", rank: 5, skill: 5 },
      ],
    },
    {
      firstName: "Taylor",
      lastName: "Kim",
      email: "taylor.kim@student.ppchs.edu",
      grade: 10,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Chemistry Lab", rank: 1, skill: 9 },
        { name: "Materials Science", rank: 2, skill: 9 },
        { name: "Circuit Lab", rank: 3, skill: 8 },
        { name: "Codebusters", rank: 4, skill: 7 },
        { name: "Experimental Design", rank: 5, skill: 8 },
      ],
    },
    {
      firstName: "Morgan",
      lastName: "Davis",
      email: "morgan.davis@student.ppchs.edu",
      grade: 10,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Anatomy and Physiology", rank: 1, skill: 10, partnerPref: PartnerPreference.MANDATORY, partnerName: "Alex Chen" },
        { name: "Disease Detectives", rank: 2, skill: 9 },
        { name: "Entomology", rank: 3, skill: 8 },
        { name: "Water Quality", rank: 4, skill: 7 },
        { name: "Rocks and Minerals", rank: 5, skill: 6 },
      ],
    },
    {
      firstName: "Riley",
      lastName: "Johnson",
      email: "riley.johnson@student.ppchs.edu",
      grade: 10,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Codebusters", rank: 1, skill: 9 },
        { name: "Engineering CAD", rank: 2, skill: 8 },
        { name: "Astronomy", rank: 3, skill: 7 },
        { name: "Circuit Lab", rank: 4, skill: 8 },
        { name: "Remote Sensing", rank: 5, skill: 6 },
      ],
    },
    {
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan.lee@student.ppchs.edu",
      grade: 10,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Dynamic Planet", rank: 1, skill: 10 },
        { name: "Rocks and Minerals", rank: 2, skill: 9 },
        { name: "Experimental Design", rank: 3, skill: 8 },
        { name: "Entomology", rank: 4, skill: 7 },
        { name: "Remote Sensing", rank: 5, skill: 7 },
      ],
    },
    {
      firstName: "Blake",
      lastName: "Martinez",
      email: "blake.martinez@student.ppchs.edu",
      grade: 10,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Helicopter", rank: 1, skill: 9 },
        { name: "Electric Vehicle", rank: 2, skill: 8 },
        { name: "Robot Tour", rank: 3, skill: 9 },
        { name: "Hovercraft", rank: 4, skill: 7 },
        { name: "Boomilever", rank: 5, skill: 6 },
      ],
    },
    {
      firstName: "Drew",
      lastName: "Anderson",
      email: "drew.anderson@student.ppchs.edu",
      grade: 11,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Circuit Lab", rank: 1, skill: 10 },
        { name: "Chemistry Lab", rank: 2, skill: 9 },
        { name: "Engineering CAD", rank: 3, skill: 8 },
        { name: "Materials Science", rank: 4, skill: 9 },
        { name: "Codebusters", rank: 5, skill: 7 },
      ],
    },
    {
      firstName: "Avery",
      lastName: "Wilson",
      email: "avery.wilson@student.ppchs.edu",
      grade: 11,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Forensics", rank: 1, skill: 9 },
        { name: "Designer Genes", rank: 2, skill: 9 },
        { name: "Disease Detectives", rank: 3, skill: 8 },
        { name: "Anatomy and Physiology", rank: 4, skill: 7 },
        { name: "Water Quality", rank: 5, skill: 8 },
      ],
    },
    {
      firstName: "Cameron",
      lastName: "Brown",
      email: "cameron.brown@student.ppchs.edu",
      grade: 11,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Experimental Design", rank: 1, skill: 10 },
        { name: "Dynamic Planet", rank: 2, skill: 8 },
        { name: "Rocks and Minerals", rank: 3, skill: 9 },
        { name: "Entomology", rank: 4, skill: 8 },
        { name: "Materials Science", rank: 5, skill: 7 },
      ],
    },
    {
      firstName: "Quinn",
      lastName: "Garcia",
      email: "quinn.garcia@student.ppchs.edu",
      grade: 11,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Bungee Drop", rank: 1, skill: 9 },
        { name: "Machines", rank: 2, skill: 8 },
        { name: "Electric Vehicle", rank: 3, skill: 7 },
        { name: "Hovercraft", rank: 4, skill: 9 },
        { name: "Robot Tour", rank: 5, skill: 6 },
      ],
    },
    {
      firstName: "Peyton",
      lastName: "Harris",
      email: "peyton.harris@student.ppchs.edu",
      grade: 11,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Water Quality", rank: 1, skill: 9 },
        { name: "Entomology", rank: 2, skill: 8 },
        { name: "Disease Detectives", rank: 3, skill: 9 },
        { name: "Anatomy and Physiology", rank: 4, skill: 8 },
        { name: "Designer Genes", rank: 5, skill: 7 },
      ],
    },
    {
      firstName: "Alex",
      lastName: "Rodriguez",
      email: "alex.rodriguez@student.ppchs.edu",
      grade: 12,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Astronomy", rank: 1, skill: 10 },
        { name: "Dynamic Planet", rank: 2, skill: 9 },
        { name: "Remote Sensing", rank: 3, skill: 9 },
        { name: "Codebusters", rank: 4, skill: 8 },
        { name: "Rocks and Minerals", rank: 5, skill: 8 },
      ],
    },
    {
      firstName: "Morgan",
      lastName: "White",
      email: "morgan.white@student.ppchs.edu",
      grade: 12,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Chemistry Lab", rank: 1, skill: 10 },
        { name: "Materials Science", rank: 2, skill: 10 },
        { name: "Forensics", rank: 3, skill: 9 },
        { name: "Disease Detectives", rank: 4, skill: 8 },
        { name: "Water Quality", rank: 5, skill: 9 },
      ],
    },
    {
      firstName: "Jordan",
      lastName: "Clark",
      email: "jordan.clark@student.ppchs.edu",
      grade: 12,
      status: MembershipStatus.ACTIVE,
      events: [
        { name: "Robot Tour", rank: 1, skill: 10 },
        { name: "Electric Vehicle", rank: 2, skill: 10 },
        { name: "Helicopter", rank: 3, skill: 9 },
        { name: "Boomilever", rank: 4, skill: 8 },
        { name: "Engineering CAD", rank: 5, skill: 9 },
      ],
    },
    {
      firstName: "Taylor",
      lastName: "Lewis",
      email: "taylor.lewis@student.ppchs.edu",
      grade: 12,
      status: MembershipStatus.INACTIVE,
      events: [
        { name: "Codebusters", rank: 1, skill: 8 },
        { name: "Circuit Lab", rank: 2, skill: 7 },
        { name: "Engineering CAD", rank: 3, skill: 6 },
        { name: "Astronomy", rank: 4, skill: 7 },
        { name: "Remote Sensing", rank: 5, skill: 5 },
      ],
    },
    {
      firstName: "Casey",
      lastName: "Robinson",
      email: "casey.robinson@student.ppchs.edu",
      grade: 12,
      status: MembershipStatus.INACTIVE,
      events: [
        { name: "Hovercraft", rank: 1, skill: 7 },
        { name: "Machines", rank: 2, skill: 6 },
        { name: "Bungee Drop", rank: 3, skill: 7 },
        { name: "Robot Tour", rank: 4, skill: 5 },
        { name: "Electric Vehicle", rank: 5, skill: 6 },
      ],
    },
  ]

const APPLICANTS: {
  firstName: string
  lastName: string
  email: string
  grade: number
  status: MembershipStatus
  isReturning: boolean
}[] = [
    { firstName: "Jamie", lastName: "Torres", email: "jamie.torres@student.ppchs.edu", grade: 9, status: MembershipStatus.PENDING, isReturning: false },
    { firstName: "Skyler", lastName: "Nguyen", email: "skyler.nguyen@student.ppchs.edu", grade: 10, status: MembershipStatus.PENDING, isReturning: false },
    { firstName: "Avery", lastName: "Brooks", email: "avery.brooks@student.ppchs.edu", grade: 9, status: MembershipStatus.PENDING, isReturning: false },
    { firstName: "Reese", lastName: "Evans", email: "reese.evans@student.ppchs.edu", grade: 11, status: MembershipStatus.PENDING, isReturning: true },
    { firstName: "Parker", lastName: "Scott", email: "parker.scott@student.ppchs.edu", grade: 10, status: MembershipStatus.ACTIVE, isReturning: false },
    { firstName: "Dylan", lastName: "Foster", email: "dylan.foster@student.ppchs.edu", grade: 9, status: MembershipStatus.ACTIVE, isReturning: false },
    { firstName: "Sage", lastName: "Powell", email: "sage.powell@student.ppchs.edu", grade: 10, status: MembershipStatus.REMOVED, isReturning: false },
    { firstName: "Finley", lastName: "Hughes", email: "finley.hughes@student.ppchs.edu", grade: 11, status: MembershipStatus.REMOVED, isReturning: true },
  ]

async function main() {
  const ownerEmail = "kimdanny0603@gmail.com"
  const plainPassword = "Musung0603!"
  const schoolYear = "2025-2026"
  const seasonName = "2026 Science Olympiad"
  const seasonStartsAt = new Date("2025-08-01T00:00:00.000Z")
  const seasonEndsAt = new Date("2026-06-30T23:59:59.999Z")

  const club = await prisma.club.upsert({
    where: { slug: "ppchs-scioly" },
    update: {
      name: "PPCHS Science Olympiad",
      schoolName: "Pembroke Pines Charter High School",
      description: "Main club record",
    },
    create: {
      name: "PPCHS Science Olympiad",
      slug: "ppchs-scioly",
      schoolName: "Pembroke Pines Charter High School",
      description: "Main club record",
    },
  })

  const passwordHash = await bcrypt.hash(plainPassword, 10)

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      clubId: club.id,
      role: UserRole.WEBSITE_OWNER,
      firstName: "Danny",
      lastName: "Kim",
      displayName: "dantewins",
      passwordHash,
    },
    create: {
      clubId: club.id,
      email: ownerEmail,
      passwordHash,
      role: UserRole.WEBSITE_OWNER,
      firstName: "Danny",
      lastName: "Kim",
      displayName: "dantewins",
    },
  })

  await prisma.season.updateMany({
    where: { clubId: club.id, isActive: true, schoolYear: { not: schoolYear } },
    data: { isActive: false },
  })

  const season = await prisma.season.upsert({
    where: { clubId_schoolYear: { clubId: club.id, schoolYear } },
    update: { name: seasonName, startsAt: seasonStartsAt, endsAt: seasonEndsAt, isActive: true },
    create: {
      clubId: club.id,
      name: seasonName,
      schoolYear,
      startsAt: seasonStartsAt,
      endsAt: seasonEndsAt,
      isActive: true,
    },
  })

  const eventMap = new Map<string, string>()
  for (const [index, eventName] of EVENTS.entries()) {
    const ev = await prisma.event.upsert({
      where: { seasonId_name: { seasonId: season.id, name: eventName } },
      update: { sortOrder: index + 1, isTrialEvent: false, minParticipants: 1, maxParticipants: 2 },
      create: {
        seasonId: season.id,
        name: eventName,
        sortOrder: index + 1,
        isTrialEvent: false,
        minParticipants: 1,
        maxParticipants: 2,
      },
    })
    eventMap.set(eventName, ev.id)
  }

  const memberSeasonMap = new Map<string, string>()

  for (const m of MEMBERS) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {
        clubId: club.id,
        role: m.status === MembershipStatus.ACTIVE ? UserRole.MEMBER : UserRole.MEMBER,
        firstName: m.firstName,
        lastName: m.lastName,
        gradeLevel: m.grade,
      },
      create: {
        clubId: club.id,
        email: m.email,
        role: UserRole.MEMBER,
        firstName: m.firstName,
        lastName: m.lastName,
        gradeLevel: m.grade,
        passwordHash: await bcrypt.hash("Password123!", 10),
      },
    })

    const ms = await prisma.memberSeason.upsert({
      where: { userId_seasonId: { userId: user.id, seasonId: season.id } },
      update: {
        membershipStatus: m.status,
        isReturning: m.grade >= 10,
        statusChangedAt: new Date("2025-09-15T10:00:00.000Z"),
      },
      create: {
        userId: user.id,
        seasonId: season.id,
        membershipStatus: m.status,
        isReturning: m.grade >= 10,
        statusChangedAt: new Date("2025-09-15T10:00:00.000Z"),
        applicationSubmittedAt: new Date("2025-09-01T10:00:00.000Z"),
      },
    })

    memberSeasonMap.set(m.email, ms.id)

    for (const ev of m.events) {
      const eventId = eventMap.get(ev.name)
      if (!eventId) continue
      await prisma.eventEnrollment.upsert({
        where: { memberSeasonId_eventId: { memberSeasonId: ms.id, eventId } },
        update: {
          status: EventEnrollmentStatus.ACTIVE,
          preferenceRank: ev.rank,
          skillRating: ev.skill,
          partnerPreference: ev.partnerPref ?? PartnerPreference.NA,
          partnerNames: ev.partnerName ?? null,
        },
        create: {
          memberSeasonId: ms.id,
          eventId,
          status: EventEnrollmentStatus.ACTIVE,
          preferenceRank: ev.rank,
          skillRating: ev.skill,
          partnerPreference: ev.partnerPref ?? PartnerPreference.NA,
          partnerNames: ev.partnerName ?? null,
        },
      })
    }
  }

  const appSubmittedDates = [
    new Date("2025-09-10T09:00:00.000Z"),
    new Date("2025-09-11T14:30:00.000Z"),
    new Date("2025-09-12T11:00:00.000Z"),
    new Date("2025-09-13T16:00:00.000Z"),
    new Date("2025-09-14T08:45:00.000Z"),
    new Date("2025-09-15T13:20:00.000Z"),
    new Date("2025-09-09T10:30:00.000Z"),
    new Date("2025-09-08T15:00:00.000Z"),
  ]

  for (const [i, a] of APPLICANTS.entries()) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {
        clubId: club.id,
        role: a.status === MembershipStatus.ACTIVE ? UserRole.MEMBER : UserRole.APPLICANT,
        firstName: a.firstName,
        lastName: a.lastName,
        gradeLevel: a.grade,
      },
      create: {
        clubId: club.id,
        email: a.email,
        role: a.status === MembershipStatus.ACTIVE ? UserRole.MEMBER : UserRole.APPLICANT,
        firstName: a.firstName,
        lastName: a.lastName,
        gradeLevel: a.grade,
        passwordHash: await bcrypt.hash("Password123!", 10),
      },
    })

    await prisma.memberSeason.upsert({
      where: { userId_seasonId: { userId: user.id, seasonId: season.id } },
      update: {
        membershipStatus: a.status,
        isReturning: a.isReturning,
        applicationSubmittedAt: appSubmittedDates[i],
        ...(a.status !== MembershipStatus.PENDING && {
          statusChangedAt: new Date("2025-09-20T10:00:00.000Z"),
          statusReason: a.status === MembershipStatus.REMOVED ? "Insufficient availability for competitions." : null,
        }),
        whyJoin: "I am passionate about science and want to compete at the highest level.",
        contributionIdeas: "I can bring fresh perspectives and help with study sessions.",
        awards: a.isReturning ? "2024 Regional – 3rd place Anatomy and Physiology (Div B)" : "N/A",
        previousEvents: a.isReturning ? "Anatomy and Physiology, Disease Detectives" : "N/A",
        scienceClasses: "AP Biology, AP Chemistry",
        mathClasses: "AP Calculus BC",
        questions: "",
      },
      create: {
        userId: user.id,
        seasonId: season.id,
        membershipStatus: a.status,
        isReturning: a.isReturning,
        applicationSubmittedAt: appSubmittedDates[i],
        ...(a.status !== MembershipStatus.PENDING && {
          statusChangedAt: new Date("2025-09-20T10:00:00.000Z"),
          statusReason: a.status === MembershipStatus.REMOVED ? "Insufficient availability for competitions." : null,
        }),
        whyJoin: "I am passionate about science and want to compete at the highest level.",
        contributionIdeas: "I can bring fresh perspectives and help with study sessions.",
        awards: a.isReturning ? "2024 Regional – 3rd place Anatomy and Physiology (Div B)" : "N/A",
        previousEvents: a.isReturning ? "Anatomy and Physiology, Disease Detectives" : "N/A",
        scienceClasses: "AP Biology, AP Chemistry",
        mathClasses: "AP Calculus BC",
        questions: "",
      },
    })
  }

  const invitational = await prisma.competition.upsert({
    where: { seasonId_name: { seasonId: season.id, name: "South Broward Invitational" } },
    update: {
      type: "INVITATIONAL",
      location: "South Broward High School",
      startsAt: new Date("2026-01-18T07:00:00.000Z"),
      endsAt: new Date("2026-01-18T17:00:00.000Z"),
      isPublished: true,
    },
    create: {
      seasonId: season.id,
      name: "South Broward Invitational",
      type: "INVITATIONAL",
      location: "South Broward High School",
      startsAt: new Date("2026-01-18T07:00:00.000Z"),
      endsAt: new Date("2026-01-18T17:00:00.000Z"),
      isPublished: true,
    },
  })

  const regional = await prisma.competition.upsert({
    where: { seasonId_name: { seasonId: season.id, name: "Broward Regional" } },
    update: {
      type: "REGIONAL",
      location: "Nova High School",
      startsAt: new Date("2026-02-14T07:00:00.000Z"),
      endsAt: new Date("2026-02-14T17:00:00.000Z"),
      isPublished: true,
    },
    create: {
      seasonId: season.id,
      name: "Broward Regional",
      type: "REGIONAL",
      location: "Nova High School",
      startsAt: new Date("2026-02-14T07:00:00.000Z"),
      endsAt: new Date("2026-02-14T17:00:00.000Z"),
      isPublished: true,
    },
  })

  await prisma.eventSchedule.deleteMany({ where: { competitionId: invitational.id } })
  for (const slot of INVITATIONAL_SLOTS) {
    for (const evName of slot.events) {
      const eventId = eventMap.get(evName)
      if (!eventId) continue
      await prisma.eventSchedule.create({
        data: {
          competitionId: invitational.id,
          eventId,
          timeSlot: slot.timeSlot,
          slotLabel: slot.slotLabel,
        },
      })
    }
  }

  await prisma.eventSchedule.deleteMany({ where: { competitionId: regional.id } })
  for (const slot of REGIONAL_SLOTS) {
    for (const evName of slot.events) {
      const eventId = eventMap.get(evName)
      if (!eventId) continue
      await prisma.eventSchedule.create({
        data: {
          competitionId: regional.id,
          eventId,
          timeSlot: slot.timeSlot,
          slotLabel: slot.slotLabel,
        },
      })
    }
  }

  const sampleTeamEvents = [
    "Anatomy and Physiology",
    "Astronomy",
    "Chemistry Lab",
    "Dynamic Planet",
    "Forensics",
    "Experimental Design",
  ]

  const sampleAssignments: Record<string, string[]> = {
    "Anatomy and Physiology": ["alex.chen@student.ppchs.edu", "morgan.davis@student.ppchs.edu"],
    "Astronomy": ["maya.patel@student.ppchs.edu", "alex.rodriguez@student.ppchs.edu"],
    "Chemistry Lab": ["taylor.kim@student.ppchs.edu", "morgan.white@student.ppchs.edu"],
    "Dynamic Planet": ["jordan.lee@student.ppchs.edu", "cameron.brown@student.ppchs.edu"],
    "Forensics": ["avery.wilson@student.ppchs.edu", "sam.rivera@student.ppchs.edu"],
    "Experimental Design": ["cameron.brown@student.ppchs.edu", "maya.patel@student.ppchs.edu"],
  }

  for (const evName of sampleTeamEvents) {
    const eventId = eventMap.get(evName)
    if (!eventId) continue

    const existingTeam = await prisma.team.findFirst({
      where: { seasonId: season.id, eventId, competitionId: invitational.id },
    })

    const team = existingTeam ?? await prisma.team.create({
      data: {
        seasonId: season.id,
        eventId,
        competitionId: invitational.id,
        label: "A",
        status: "ACTIVE",
      },
    })

    const assignees = sampleAssignments[evName] ?? []
    for (const email of assignees) {
      const msId = memberSeasonMap.get(email)
      if (!msId) continue
      const existing = await prisma.teamAssignment.findFirst({
        where: { teamId: team.id, memberSeasonId: msId },
      })
      if (!existing) {
        await prisma.teamAssignment.create({
          data: { teamId: team.id, memberSeasonId: msId, role: "MEMBER" },
        })
      }
    }
  }

  console.log(`Seeded club: ${club.name}`)
  console.log(`Seeded owner: ${owner.email}`)
  console.log(`Seeded season: ${season.name}`)
  console.log(`Seeded ${EVENTS.length} events`)
  console.log(`Seeded ${MEMBERS.length} members`)
  console.log(`Seeded ${APPLICANTS.length} applicants`)
  console.log(`Seeded competitions: ${invitational.name}, ${regional.name}`)
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
