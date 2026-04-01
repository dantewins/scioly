import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import {
  sendHoursWarningEmail,
  sendDuesReminderEmail,
  sendFormReminderEmail,
} from "@/lib/email"

export const dynamic = "force-dynamic"

const schema = z.object({
  action: z.enum(["hours-warning", "dues-reminder", "forms-reminder"]),
  memberSeasonIds: z.array(z.string()).min(1).max(100),
})

export const POST = withPermission("edit_members", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? "Invalid input.", 400)

  const { action, memberSeasonIds } = parsed.data
  let sent = 0,
    failed = 0

  for (const msId of memberSeasonIds) {
    try {
      if (action === "hours-warning") {
        const ms = await prisma.memberSeason.findFirst({
          where: { id: msId, season: { clubId: user.clubId } },
          select: {
            expectedHours: true,
            user: { select: { email: true, firstName: true } },
            hourEntries: {
              where: { status: "APPROVED" },
              select: { totalHours: true },
            },
          },
        })
        if (!ms) {
          failed++
          continue
        }

        const earnedHours = ms.hourEntries.reduce(
          (sum, e) => sum + Number(e.totalHours),
          0,
        )
        const requiredHours = Number(ms.expectedHours ?? 0)

        await sendHoursWarningEmail(
          ms.user.email,
          ms.user.firstName,
          earnedHours,
          requiredHours,
        )
      } else if (action === "dues-reminder") {
        const ms = await prisma.memberSeason.findFirst({
          where: { id: msId, season: { clubId: user.clubId } },
          select: {
            user: { select: { email: true, firstName: true } },
            invoices: {
              where: {
                status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] },
              },
              select: {
                title: true,
                amountCents: true,
                amountPaidCents: true,
                dueAt: true,
              },
            },
          },
        })
        if (!ms || ms.invoices.length === 0) {
          failed++
          continue
        }

        // Send one email per outstanding invoice
        for (const invoice of ms.invoices) {
          const amountDueCents = invoice.amountCents - invoice.amountPaidCents
          await sendDuesReminderEmail(
            ms.user.email,
            ms.user.firstName,
            invoice.title,
            amountDueCents,
            invoice.dueAt,
          )
        }
      } else {
        // forms-reminder
        const ms = await prisma.memberSeason.findFirst({
          where: { id: msId, season: { clubId: user.clubId } },
          select: {
            user: { select: { email: true, firstName: true } },
            formSubmissions: {
              where: {
                status: { in: ["NOT_STARTED", "REJECTED"] },
                formType: { isRequired: true },
              },
              select: {
                formType: { select: { name: true, dueAt: true } },
              },
            },
          },
        })
        if (!ms || ms.formSubmissions.length === 0) {
          failed++
          continue
        }

        // Send one email per pending required form
        for (const sub of ms.formSubmissions) {
          await sendFormReminderEmail(
            ms.user.email,
            ms.user.firstName,
            sub.formType.name,
            sub.formType.dueAt,
          )
        }
      }

      sent++
    } catch {
      failed++
    }
  }

  return ok({ sent, failed })
})
