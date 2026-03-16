import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

const SCIOLY_DIV_C_EVENTS = [
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

async function main() {
    const ownerEmail = "kimdanny0603@gmail.com"
    const plainPassword = "Musung0603!"

    // Change these if you want a different season label/date range.
    const seasonName = "2026 Science Olympiad"
    const schoolYear = "2025-2026"
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

    // Make sure this is the only active season for the club
    await prisma.season.updateMany({
        where: {
            clubId: club.id,
            isActive: true,
            schoolYear: { not: schoolYear },
        },
        data: {
            isActive: false,
        },
    })

    const season = await prisma.season.upsert({
        where: {
            clubId_schoolYear: {
                clubId: club.id,
                schoolYear,
            },
        },
        update: {
            name: seasonName,
            startsAt: seasonStartsAt,
            endsAt: seasonEndsAt,
            isActive: true,
        },
        create: {
            clubId: club.id,
            name: seasonName,
            schoolYear,
            startsAt: seasonStartsAt,
            endsAt: seasonEndsAt,
            isActive: true,
        },
    })

    for (const [index, eventName] of SCIOLY_DIV_C_EVENTS.entries()) {
        await prisma.event.upsert({
            where: {
                seasonId_name: {
                    seasonId: season.id,
                    name: eventName,
                },
            },
            update: {
                sortOrder: index + 1,
                isTrialEvent: false,
                minParticipants: 1,
                maxParticipants: 2,
            },
            create: {
                seasonId: season.id,
                name: eventName,
                sortOrder: index + 1,
                isTrialEvent: false,
                minParticipants: 1,
                maxParticipants: 2,
            },
        })
    }

    console.log("Created/updated owner:")
    console.log({
        id: owner.id,
        email: owner.email,
        role: owner.role,
        clubId: owner.clubId,
    })

    console.log("Created/updated active season:")
    console.log({
        id: season.id,
        name: season.name,
        schoolYear: season.schoolYear,
        isActive: season.isActive,
    })

    console.log(`Seeded ${SCIOLY_DIV_C_EVENTS.length} events for ${season.schoolYear}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })