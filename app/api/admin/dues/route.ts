// app/api/admin/dues/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAnyPermission, withPermission, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import { sendInvoiceIssuedEmail } from "@/lib/email"
import { formatZodError } from "@/lib/zod-errors"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_finances", async (req, _ctx, user) => {
  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  const url = new URL(req.url)
  const status = url.searchParams.get("status") ?? undefined

  const invoices = await prisma.duesInvoice.findMany({
    where: {
      seasonId: season.id,
      ...(status && { status: status as "OPEN" | "PAID" | "OVERDUE" }),
    },
    include: {
      memberSeason: {
        select: {
          id: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      payments: { select: { id: true, amountCents: true, method: true, paidAt: true } },
    },
    orderBy: { issuedAt: "desc" },
  })
  return ok(invoices)
})

const createSchema = z.object({
  memberSeasonId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  amountCents: z.number().int().min(1),
  dueAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

export const POST = withAnyPermission(["create_finances", "edit_finances"], async (req, _ctx, user) => {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(formatZodError(parsed.error), 400)

  const season = await getActiveSeason(user.clubId)
  if (!season) return err("No active season.", 400)

  // Verify memberSeason belongs to this club
  const ms = await prisma.memberSeason.findFirst({
    where: { id: parsed.data.memberSeasonId, season: { clubId: user.clubId } },
    select: {
      id: true,
      user: { select: { email: true, firstName: true } },
    },
  })
  if (!ms) return err("Member season not found.", 404)

  const invoice = await prisma.duesInvoice.create({
    data: {
      seasonId: season.id,
      ...parsed.data,
      status: "OPEN",
    },
  })

  try {
    await sendInvoiceIssuedEmail(
      ms.user.email,
      ms.user.firstName,
      invoice.title,
      invoice.amountCents,
      invoice.dueAt,
    )
  } catch (e) {
    console.error("[dues:create] Email send failed:", e)
  }

  return ok(invoice, 201)
})
