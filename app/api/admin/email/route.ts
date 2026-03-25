import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"
import {
  sendHoursWarningEmail,
  sendDuesReminderEmail,
  sendFormReminderEmail,
} from "@/lib/email"

export const dynamic = "force-dynamic"

export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const body = await request.json() as {
      action: "hours-warning" | "dues-reminder" | "forms-reminder"
      memberSeasonIds: string[]
    }

    const { action, memberSeasonIds } = body

    if (!action || !Array.isArray(memberSeasonIds) || memberSeasonIds.length === 0) {
      return err("action and memberSeasonIds are required.", 400)
    }

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    const members = await prisma.memberSeason.findMany({
      where: {
        id: { in: memberSeasonIds },
        seasonId: activeSeason.id,
      },
      select: {
        id: true,
        expectedHours: true,
        user: { select: { email: true, firstName: true } },
        hourEntries: {
          where: { status: "APPROVED" },
          select: { totalHours: true },
        },
        invoices: {
          where: { status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
          select: { title: true, amountCents: true, amountPaidCents: true, dueAt: true },
          take: 1,
          orderBy: { dueAt: "asc" },
        },
        formSubmissions: {
          where: { status: { in: ["NOT_STARTED", "REJECTED"] } },
          select: {
            formType: { select: { name: true, dueAt: true } },
          },
          take: 1,
        },
      },
    })

    const results: { id: string; sent: boolean; error?: string }[] = []

    for (const member of members) {
      try {
        if (action === "hours-warning") {
          const earned = member.hourEntries.reduce(
            (sum, e) => sum + Number(e.totalHours),
            0
          )
          const required = member.expectedHours ? Number(member.expectedHours) : 0
          await sendHoursWarningEmail(
            member.user.email,
            member.user.firstName,
            earned,
            required
          )
        } else if (action === "dues-reminder") {
          const invoice = member.invoices[0]
          if (invoice) {
            const remaining = invoice.amountCents - invoice.amountPaidCents
            await sendDuesReminderEmail(
              member.user.email,
              member.user.firstName,
              invoice.title,
              remaining,
              invoice.dueAt
            )
          }
        } else if (action === "forms-reminder") {
          const submission = member.formSubmissions[0]
          if (submission) {
            await sendFormReminderEmail(
              member.user.email,
              member.user.firstName,
              submission.formType.name,
              submission.formType.dueAt
            )
          }
        }
        results.push({ id: member.id, sent: true })
      } catch (e) {
        results.push({ id: member.id, sent: false, error: String(e) })
      }
    }

    return ok({ results })
  },
  "send admin emails"
)
