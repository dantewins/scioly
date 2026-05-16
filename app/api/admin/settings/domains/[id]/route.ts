import { err, ok, withPermission } from "@/lib/api"
import {
  deactivateClubEmailDomain,
  listActiveClubEmailDomains,
  setPrimaryClubEmailDomain,
  updateClubEmailDomain,
} from "@/lib/db"
import { normalizeDomain } from "@/lib/email-domains"
import { z } from "zod"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  domain: z
    .string()
    .regex(/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/)
    .transform((value) => normalizeDomain(value))
    .optional(),
  isPrimary: z.boolean().optional(),
})

export const PATCH = withPermission(
  "edit_club_settings",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params
    const body = await req.json().catch(() => null).catch(() => ({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return err(formatZodError(parsed.error), 400)
    }

    try {
      if (parsed.data.domain) {
        await updateClubEmailDomain(user.clubId, id, parsed.data.domain)
      }

      if (parsed.data.isPrimary) {
        await setPrimaryClubEmailDomain(user.clubId, id)
      }
    } catch (error) {
      if (error instanceof Error && error.message === "DOMAIN_NOT_FOUND") {
        return err("Email domain not found.", 404)
      }

      console.error("[settings/domains:patch]", error)
      return err("Failed to update email domain.", 500)
    }

    const emailDomains = await listActiveClubEmailDomains(user.clubId)
    return ok(emailDomains)
  },
)

export const DELETE = withPermission(
  "edit_club_settings",
  async (_req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id } = await ctx.params

    try {
      await deactivateClubEmailDomain(user.clubId, id)
    } catch (error) {
      if (error instanceof Error && error.message === "DOMAIN_NOT_FOUND") {
        return err("Email domain not found.", 404)
      }

      if (error instanceof Error && error.message === "PRIMARY_DOMAIN_DELETE_BLOCKED") {
        return err("Set another domain as primary before removing this one.", 400)
      }

      console.error("[settings/domains:delete]", error)
      return err("Failed to remove email domain.", 500)
    }

    const emailDomains = await listActiveClubEmailDomains(user.clubId)
    return ok(emailDomains)
  },
)
