import { prisma } from "@/lib/prisma"

export async function getActiveSeason(clubId: string): Promise<{ id: string } | null> {
  return prisma.season.findFirst({
    where: { clubId, isActive: true },
    select: { id: true },
    orderBy: { startsAt: "desc" },
  })
}
