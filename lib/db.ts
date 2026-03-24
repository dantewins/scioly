import { prisma } from "@/lib/prisma"

export async function getActiveSeason(clubId: string): Promise<{ id: string } | null> {
  return prisma.season.findFirst({
    where: { clubId, isActive: true },
    select: { id: true },
    orderBy: { startsAt: "desc" },
  })
}

export async function getMemberSeason(
  userId: string,
  clubId: string,
): Promise<{ id: string } | null> {
  const activeSeason = await getActiveSeason(clubId)
  if (!activeSeason) return null
  return prisma.memberSeason.findUnique({
    where: { userId_seasonId: { userId, seasonId: activeSeason.id } },
    select: { id: true },
  })
}
