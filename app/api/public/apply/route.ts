import { NextResponse } from "next/server"
import { UserRole, PartnerPreference } from "@prisma/client"
import { prisma } from "@/lib/prisma";

type EventChoice = {
    eventName: string
    partnerNames: string
    partnerPreference: PartnerPreference
}

const VALID_GRADES = new Set(["9", "10", "11", "12"])
const VALID_SHIRT_SIZES = new Set(["XS", "S", "M", "L", "XL"])

function getString(formData: FormData, key: string) {
    const value = formData.get(key)
    return typeof value === "string" ? value.trim() : ""
}

function normalizePhone(value: string) {
    return value.replace(/\D/g, "").slice(0, 10)
}

function parseBoolean(value: string) {
    return value === "true" || value === "yes" || value === "1"
}

function splitFullName(name: string) {
    const cleaned = name.trim().replace(/\s+/g, " ")
    if (!cleaned) return { firstName: "", lastName: "" }

    const parts = cleaned.split(" ")
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: parts[0] }
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
    }
}

function safeParseTopEvents(raw: string): EventChoice[] | null {
    try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return null

        return parsed.map((item) => ({
            eventName:
                typeof item?.eventName === "string" ? item.eventName.trim() : "",
            partnerNames:
                typeof item?.partnerNames === "string"
                    ? item.partnerNames.trim()
                    : "",
            partnerPreference:
                item?.partnerPreference === "MANDATORY" ||
                    item?.partnerPreference === "RECOMMENDED" ||
                    item?.partnerPreference === "NA"
                    ? item.partnerPreference
                    : "NA",
        }))
    } catch {
        return null
    }
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData()

        const name = getString(formData, "name")
        const email = getString(formData, "email").toLowerCase()
        const gradeLevelRaw = getString(formData, "gradeLevel")
        const phoneRaw = getString(formData, "phone")
        const shirtSize = getString(formData, "shirtSize").toUpperCase()
        const isReturningRaw = getString(formData, "isReturning")

        const whyJoin = getString(formData, "whyJoin")
        const contributionIdeas = getString(formData, "contributionIdeas")
        const awards = getString(formData, "awards")
        const previousEvents = getString(formData, "previousEvents")
        const scienceClasses = getString(formData, "scienceClasses")
        const mathClasses = getString(formData, "mathClasses")
        const questions = getString(formData, "questions")
        const topEventsRaw = getString(formData, "topEvents")

        const focusPageFileEntry = formData.get("focusPageFile")
        const focusPageFile =
            focusPageFileEntry instanceof File && focusPageFileEntry.size > 0
                ? focusPageFileEntry
                : null

        if (!name || !email) {
            return NextResponse.json(
                { error: "Name and email are required." },
                { status: 400 }
            )
        }

        if (!VALID_GRADES.has(gradeLevelRaw)) {
            return NextResponse.json(
                { error: "Grade level must be between 9 and 12." },
                { status: 400 }
            )
        }

        const phone = normalizePhone(phoneRaw)
        if (phone.length !== 10) {
            return NextResponse.json(
                { error: "Phone number must be exactly 10 digits." },
                { status: 400 }
            )
        }

        if (!VALID_SHIRT_SIZES.has(shirtSize)) {
            return NextResponse.json(
                { error: "Please select a valid shirt size." },
                { status: 400 }
            )
        }

        if (!whyJoin || !contributionIdeas) {
            return NextResponse.json(
                { error: "Please complete all required application questions." },
                { status: 400 }
            )
        }

        if (!awards || !previousEvents || !scienceClasses || !mathClasses) {
            return NextResponse.json(
                {
                    error: "Awards, previous events, science classes, and math classes are required.",
                },
                { status: 400 }
            )
        }

        const topEvents = safeParseTopEvents(topEventsRaw)
        if (!topEvents || topEvents.length !== 6) {
            return NextResponse.json(
                { error: "You must submit exactly 6 event choices." },
                { status: 400 }
            )
        }

        const names = topEvents.map((e) => e.eventName)
        if (names.some((name) => !name)) {
            return NextResponse.json(
                { error: "Each event choice must include an event name." },
                { status: 400 }
            )
        }

        if (new Set(names).size !== names.length) {
            return NextResponse.json(
                { error: "All 6 event choices must be different." },
                { status: 400 }
            )
        }

        const missingPartnerNames = topEvents.some(
            (event) =>
                event.partnerPreference !== "NA" && !event.partnerNames.trim()
        )

        if (missingPartnerNames) {
            return NextResponse.json(
                {
                    error: "Partner names are required when partner status is Recommended or Mandatory.",
                },
                { status: 400 }
            )
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 }
            )
        }

        const activeSeason = await prisma.season.findFirst({
            where: { isActive: true },
            orderBy: { startsAt: "desc" },
        })

        console.log(activeSeason);

        if (!activeSeason) {
            return NextResponse.json(
                { error: "No active season found. Please contact an admin." },
                { status: 400 }
            )
        }

        const seasonEvents = await prisma.event.findMany({
            where: {
                seasonId: activeSeason.id,
                name: {
                    in: names,
                },
            },
            select: {
                id: true,
                name: true,
            },
        })

        if (seasonEvents.length !== 6) {
            const foundNames = new Set(seasonEvents.map((event) => event.name))
            const missingNames = names.filter((name) => !foundNames.has(name))

            return NextResponse.json(
                {
                    error: `These events do not exist in the active season: ${missingNames.join(", ")}`,
                },
                { status: 400 }
            )
        }

        const eventMap = new Map(seasonEvents.map((event) => [event.name, event.id]))
        const { firstName, lastName } = splitFullName(name)

        // You still need real file storage for this.
        // For now we are not persisting the uploaded file itself.
        const focusPageFileUrl = null

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    club: {
                        connect: { id: activeSeason.clubId },
                    },
                    email,
                    role: UserRole.APPLICANT,
                    firstName,
                    lastName,
                    gradeLevel: Number(gradeLevelRaw),
                    graduationYear: new Date().getFullYear() - (new Date().getMonth() < 7 ? 1 : 0) + (13 - Number(gradeLevelRaw)),
                    phone,
                },
            })

            const memberSeason = await tx.memberSeason.create({
                data: {
                    user: {
                        connect: { id: user.id },
                    },
                    season: {
                        connect: { id: activeSeason.id },
                    },
                    membershipStatus: "PENDING",
                    isReturning: parseBoolean(isReturningRaw),
                    canTravel: false,
                    shirtSize,
                    whyJoin,
                    contributionIdeas,
                    awards,
                    previousEvents,
                    scienceClasses,
                    mathClasses,
                    questions: questions || null,
                    focusPageFileUrl,
                    applicationSubmittedAt: new Date(),
                    notes: focusPageFile
                        ? `Uploaded file: ${focusPageFile.name} (${focusPageFile.type || "unknown"}, ${focusPageFile.size} bytes)`
                        : null,
                },
            })

            await tx.eventEnrollment.createMany({
                data: topEvents.map((event, index) => ({
                    memberSeasonId: memberSeason.id,
                    eventId: eventMap.get(event.eventName)!,
                    status: "INTERESTED",
                    preferenceRank: index + 1,
                    partnerPreference: event.partnerPreference,
                    partnerNames: event.partnerNames || null,
                })),
            })

            return { user, memberSeason }
        })

        return NextResponse.json(
            {
                message: "Application submitted successfully.",
                userId: result.user.id,
                memberSeasonId: result.memberSeason.id,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("APPLY_ERROR", error)

        return NextResponse.json(
            { error: "Something went wrong while submitting the application." },
            { status: 500 }
        )
    }
}