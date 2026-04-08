// prisma/seed.ts
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { adminPermissions, boardMemberPermissions, memberPermissions } from "../lib/permissions"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Clean slate
  await prisma.club.deleteMany()

  const passwordHash = await bcrypt.hash("password123", 12)

  // Create club
  const club = await prisma.club.create({
    data: {
      name: "MAST Science Olympiad",
      slug: "mast-scioly",
      schoolName: "Maritime and Science Technology Academy",
      schoolDomain: "mast.edu",
    },
  })

  await prisma.clubEmailDomain.create({
    data: {
      clubId: club.id,
      domain: "mast.edu",
      isPrimary: true,
      isActive: true,
    },
  })

  // Create WEBSITE_OWNER
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

  // Create a regular member
  const member = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "member@mast.edu",
      passwordHash,
      role: "MEMBER",
      firstName: "Jordan",
      lastName: "Smith",
    },
  })

  // Default club roles
  const [, , memberRole] = await Promise.all([
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
        description: "Can view, create, and edit most content. Cannot delete.",
        permissions: boardMemberPermissions(),
      },
    }),
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Member",
        description: "View access plus ability to submit hours and attempt practice assessments.",
        permissions: memberPermissions(),
      },
    }),
  ])

  // Active season
  const season = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "2025\u20132026 Season",
      schoolYear: "2025-2026",
      startsAt: new Date("2025-09-01"),
      endsAt: new Date("2026-06-01"),
      isActive: true,
    },
  })

  // MemberSeason for owner
  await prisma.memberSeason.create({
    data: {
      userId: owner.id,
      seasonId: season.id,
      membershipStatus: "ACTIVE",
    },
  })

  // MemberSeason for member + assign Member role
  const ms = await prisma.memberSeason.create({
    data: {
      userId: member.id,
      seasonId: season.id,
      membershipStatus: "ACTIVE",
    },
  })

  await prisma.memberRole.create({
    data: { memberSeasonId: ms.id, clubRoleId: memberRole.id },
  })

  // Sample Science Olympiad events
  const eventNames = [
    { name: "Anatomy & Physiology", code: "ANP" },
    { name: "Astronomy", code: "AST" },
    { name: "Chemistry Lab", code: "CLB" },
    { name: "Codebusters", code: "COD" },
    { name: "Disease Detectives", code: "DIS" },
    { name: "Dynamic Planet", code: "DPN" },
  ]

  await prisma.event.createMany({
    data: eventNames.map(({ name, code }, i) => ({
      seasonId: season.id,
      name,
      code,
      minParticipants: 2,
      maxParticipants: 2,
      sortOrder: i,
    })),
  })

  // Sample competition
  await prisma.competition.create({
    data: {
      seasonId: season.id,
      name: "Spring Invitational 2026",
      type: "INVITATIONAL",
      location: "MAST Academy",
      startsAt: new Date("2026-04-15"),
      isPublished: true,
    },
  })

  // Hour category
  await prisma.hourCategory.create({
    data: {
      seasonId: season.id,
      name: "Study Sessions",
      description: "Independent or group study for Science Olympiad events.",
      requiresApproval: false,
    },
  })

  console.log("Seed complete.")
  console.log("  WEBSITE_OWNER: owner@mast.edu / password123")
  console.log("  Member:        member@mast.edu / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
