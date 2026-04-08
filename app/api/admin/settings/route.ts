// app/api/admin/settings/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { getClubDomainConfig, syncPrimaryClubDomain } from "@/lib/db"

export const dynamic = "force-dynamic"

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  schoolDomain: z
    .string()
    .regex(/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/)
    .toLowerCase()
    .optional(),
  schoolName: z.string().max(100).optional(),
})

export const PATCH = withPermission("edit_club_settings", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const club = await prisma.club.update({
    where: { id: user.clubId },
    data: parsed.data,
    select: { id: true, name: true, schoolDomain: true, schoolName: true, slug: true },
  })

  if (parsed.data.schoolDomain) {
    await syncPrimaryClubDomain(user.clubId, parsed.data.schoolDomain, {
      label: parsed.data.schoolName,
    })
  }

  return ok(club)
})

export const GET = withPermission("view_club_settings", async (_req, _ctx, user) => {
  const [club, domainConfig] = await Promise.all([
    prisma.club.findUnique({
      where: { id: user.clubId },
      select: {
        id: true,
        name: true,
        schoolDomain: true,
        schoolName: true,
        slug: true,
      },
    }),
    getClubDomainConfig(user.clubId),
  ])
  if (!club) return ok(null)

  return ok({
    ...club,
    emailDomains: domainConfig?.emailDomains ?? [],
  })
})
