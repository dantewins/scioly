import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    try {
        const joinCode = req.nextUrl.searchParams.get("joinCode")

        let seasonWhere: { isActive: true; clubId?: string } = { isActive: true }

        if (joinCode) {
            const club = await prisma.club.findUnique({
                where: { joinCode },
                select: { id: true },
            })

            if (!club) {
                return NextResponse.json(
                    { season: null, events: [], error: "Invalid join code." },
                    { status: 200 }
                )
            }

            seasonWhere = { isActive: true, clubId: club.id }
        }

        const activeSeason = await prisma.season.findFirst({
            where: seasonWhere,
            select: {
                id: true,
                name: true,
                schoolYear: true,
            },
            orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        })

        if (!activeSeason) {
            return NextResponse.json(
                { season: null, events: [], error: "No active season found." },
                { status: 200 }
            )
        }

        const events = await prisma.event.findMany({
            where: { seasonId: activeSeason.id },
            select: {
                id: true,
                name: true,
                code: true,
                isTrialEvent: true,
                sortOrder: true,
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })

        return NextResponse.json({ season: activeSeason, events })
    } catch (error) {
        console.error("Failed to fetch events:", error)
        return NextResponse.json(
            { season: null, events: [], error: "Failed to fetch events." },
            { status: 500 }
        )
    }
}
