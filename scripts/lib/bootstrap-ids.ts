// scripts/lib/bootstrap-ids.ts
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import type { DynamicId } from "./route-config"

export type IdMap = Record<DynamicId, string | null>

export async function bootstrapIds(): Promise<IdMap> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })
  try {
    const [comp, ms, assess, attempt] = await Promise.all([
      prisma.competition.findFirst({
        orderBy: { startsAt: "asc" },
        select: { id: true },
      }),
      prisma.memberSeason.findFirst({
        orderBy: { joinedAt: "asc" },
        select: { id: true },
      }),
      prisma.assessment.findFirst({
        where: { isPublished: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
      prisma.assessmentAttempt.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
    ])
    return {
      firstCompetitionId: comp?.id ?? null,
      firstMemberSeasonId: ms?.id ?? null,
      firstAssessmentId: assess?.id ?? null,
      firstAttemptId: attempt?.id ?? null,
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Returns the resolved path, or null if any placeholder couldn't be filled.
export function resolvePath(path: string, ids: IdMap): string | null {
  let missing = false
  const resolved = path.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = ids[key as DynamicId]
    if (!value) {
      missing = true
      return ""
    }
    return value
  })
  return missing ? null : resolved
}
