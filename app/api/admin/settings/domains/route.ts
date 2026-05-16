import { z } from "zod"
import { err, ok, withPermission } from "@/lib/api"
import { createClubEmailDomain, listActiveClubEmailDomains } from "@/lib/db"
import { normalizeDomain } from "@/lib/email-domains"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  domain: z
    .string()
    .regex(/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/)
    .transform((value) => normalizeDomain(value)),
  isPrimary: z.boolean().optional(),
})

export const GET = withPermission("view_club_settings", async (_req, _ctx, user) => {
  const emailDomains = await listActiveClubEmailDomains(user.clubId)
  return ok(emailDomains)
})

export const POST = withPermission("edit_club_settings", async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  try {
    await createClubEmailDomain(user.clubId, parsed.data.domain, {
      isPrimary: parsed.data.isPrimary,
    })
  } catch (error) {
    console.error("[settings/domains:post]", error)
    return err("Failed to save email domain.", 500)
  }

  const emailDomains = await listActiveClubEmailDomains(user.clubId)
  return ok(emailDomains, 201)
})
