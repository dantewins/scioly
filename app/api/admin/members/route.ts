// app/api/admin/members/route.ts
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_members", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const search = url.searchParams.get("q") ?? ""
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit = 50
  const skip = (page - 1) * limit

  const where = {
    seasonId: season.id,
    membershipStatus: { notIn: ["PENDING" as const] },
    user: {
      clubId: user.clubId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  }

  const [total, members] = await prisma.$transaction([
    prisma.memberSeason.count({ where }),
    prisma.memberSeason.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, gradeLevel: true, role: true,
          },
        },
        roles: { include: { clubRole: { select: { id: true, name: true } } } },
      },
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    }),
  ])

  return ok({ members, total, page, limit })
})
