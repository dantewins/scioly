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

export async function GET() {
    try {
        const currentUser = await getCurrentUser()

        if (!currentUser) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
        }

        if (!ALLOWED_ROLES.has(currentUser.role)) {
            return NextResponse.json({ message: "Forbidden." }, { status: 403 })
        }

        const activeSeason = await prisma.season.findFirst({
            where: {
                clubId: currentUser.clubId,
                isActive: true,
            },
            select: {
                id: true,
            },
            orderBy: {
                startsAt: "desc",
            },
        })

        if (!activeSeason) {
            return NextResponse.json([])
        }

        const applicants = await prisma.memberSeason.findMany({
            where: {
                seasonId: activeSeason.id,
                applicationSubmittedAt: {
                    not: null,
                },
            },
            select: {
                id: true,
                isReturning: true,
                applicationSubmittedAt: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        gradeLevel: true,
                        phone: true,
                    },
                },
            },
            orderBy: {
                applicationSubmittedAt: "desc",
            },
        })

        const formattedApplicants = applicants.map((applicant) => ({
            id: applicant.id,
            userId: applicant.user.id,
            name: `${applicant.user.firstName} ${applicant.user.lastName}`.trim(),
            email: applicant.user.email,
            grade: applicant.user.gradeLevel ? String(applicant.user.gradeLevel) : "",
            phone: applicant.user.phone ?? "",
            returning: applicant.isReturning ? "Returning" : "New",
        }))

        return NextResponse.json(formattedApplicants)
    } catch (error) {
        console.error("Failed to fetch applicants:", error)

        return NextResponse.json(
            { message: "Failed to fetch applicants." },
            { status: 500 }
        )
    }
}