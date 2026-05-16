import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { formatZodError } from "@/lib/zod-errors"
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
  if (!parsed.success) {
    return err(formatZodError(parsed.error), 400)
  }

  const { action, memberSeasonIds } = parsed.data

  const results = await Promise.allSettled(
    memberSeasonIds.map(async (memberSeasonId) => {
      if (action === "hours-warning") {
        const memberSeason = await prisma.memberSeason.findFirst({
          where: { id: memberSeasonId, season: { clubId: user.clubId } },
          select: {
            expectedHours: true,
            user: { select: { email: true, firstName: true } },
            hourEntries: {
              where: { status: "APPROVED" },
              select: { totalHours: true },
            },
          },
        })
        if (!memberSeason) return false

        const earnedHours = memberSeason.hourEntries.reduce(
          (sum, entry) => sum + Number(entry.totalHours),
          0,
        )
        const requiredHours = Number(memberSeason.expectedHours ?? 0)

        await sendHoursWarningEmail(
          memberSeason.user.email,
          memberSeason.user.firstName,
          earnedHours,
          requiredHours,
        )
        return true
      }

      if (action === "dues-reminder") {
        const memberSeason = await prisma.memberSeason.findFirst({
          where: { id: memberSeasonId, season: { clubId: user.clubId } },
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
        if (!memberSeason || memberSeason.invoices.length === 0) return false

        await Promise.all(
          memberSeason.invoices.map((invoice) =>
            sendDuesReminderEmail(
              memberSeason.user.email,
              memberSeason.user.firstName,
              invoice.title,
              invoice.amountCents - invoice.amountPaidCents,
              invoice.dueAt,
            ),
          ),
        )
        return true
      }

      const memberSeason = await prisma.memberSeason.findFirst({
        where: { id: memberSeasonId, season: { clubId: user.clubId } },
        select: {
          user: { select: { email: true, firstName: true } },
          season: {
            select: {
              formTypes: {
                where: { isRequired: true },
                select: { id: true, name: true, dueAt: true },
              },
            },
          },
          formSubmissions: {
            select: { formTypeId: true, status: true },
          },
        },
      })
      if (!memberSeason) return false

      const submissionByFormTypeId = new Map(
        memberSeason.formSubmissions.map((submission) => [submission.formTypeId, submission.status]),
      )
      const pendingForms = memberSeason.season.formTypes.filter((formType) => {
        const status = submissionByFormTypeId.get(formType.id)
        return !status || !["SUBMITTED", "VERIFIED"].includes(status)
      })
      if (pendingForms.length === 0) return false

      await Promise.all(
        pendingForms.map((formType) =>
          sendFormReminderEmail(
            memberSeason.user.email,
            memberSeason.user.firstName,
            formType.name,
            formType.dueAt,
          ),
        ),
      )
      return true
    }),
  )

  const sent = results.filter(
    (result): result is PromiseFulfilledResult<boolean> =>
      result.status === "fulfilled" && result.value,
  ).length
  const failed = results.length - sent

  return ok({ sent, failed })
})
