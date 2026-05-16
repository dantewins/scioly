// Notifications are *derived* from existing event data plus a per-user
// `User.notificationsLastReadAt` timestamp. No separate Notification model —
// items below lastReadAt are "read", above are "unread", and the bell shows
// the unread count.

import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"

export interface MemberNotification {
  id: string
  type:
    | "HOUR_APPROVED"
    | "HOUR_REJECTED"
    | "FORM_VERIFIED"
    | "FORM_REJECTED"
    | "INVOICE_ISSUED"
    | "ANNOUNCEMENT"
    | "COMPETITION_RESULT"
  title: string
  body: string | null
  link: string
  occurredAt: string
  isRead: boolean
}

// Look-back window — we don't surface arbitrarily old events even on a
// fresh-eyed user. 30 days is the longest a "you have an unread notification"
// would feel honest.
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export async function getMemberNotifications(
  userId: string,
  clubId: string,
  limit = 25,
): Promise<{ notifications: MemberNotification[]; unreadCount: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationsLastReadAt: true },
  })
  if (!user) return { notifications: [], unreadCount: 0 }

  const since = new Date(Date.now() - WINDOW_MS)
  const lastRead = user.notificationsLastReadAt

  const season = await getActiveSeason(clubId)
  if (!season) return { notifications: [], unreadCount: 0 }
  const ms = await getMemberSeason(userId, clubId)
  if (!ms) return { notifications: [], unreadCount: 0 }

  const [hourReviews, formReviews, invoicesIssued, announcements, resultsRecorded] = await Promise.all([
    // Hour entries reviewed (approved or rejected) in the window.
    prisma.hourEntry.findMany({
      where: {
        memberSeasonId: ms.id,
        status: { in: ["APPROVED", "REJECTED"] },
        OR: [
          { approvedAt: { gt: since } },
          // REJECTED entries don't carry a dedicated timestamp; updatedAt is
          // the next-best signal.
          { AND: [{ status: "REJECTED" }, { updatedAt: { gt: since } }] },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        totalHours: true,
        approvedAt: true,
        updatedAt: true,
        rejectionReason: true,
      },
      take: limit,
    }),
    prisma.formSubmission.findMany({
      where: {
        memberSeasonId: ms.id,
        status: { in: ["VERIFIED", "REJECTED"] },
        updatedAt: { gt: since },
      },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        verifiedAt: true,
        updatedAt: true,
        formType: { select: { id: true, name: true } },
      },
      take: limit,
    }),
    prisma.duesInvoice.findMany({
      where: {
        memberSeasonId: ms.id,
        issuedAt: { gt: since },
      },
      select: { id: true, title: true, amountCents: true, issuedAt: true },
      take: limit,
    }),
    prisma.announcement.findMany({
      where: {
        seasonId: season.id,
        publishedAt: { not: null, gt: since },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, title: true, body: true, publishedAt: true },
      take: limit,
    }),
    // Competition results recorded for an assignment that this member is on.
    prisma.competitionEventAssignment.findMany({
      where: {
        resultRecordedAt: { gt: since },
        participants: { some: { memberSeasonId: ms.id } },
      },
      select: {
        id: true,
        placement: true,
        scoreEarned: true,
        scorePossible: true,
        resultRecordedAt: true,
        event: { select: { name: true } },
        competitionRoster: { select: { competition: { select: { id: true, name: true } } } },
      },
      take: limit,
    }),
  ])

  const notifications: MemberNotification[] = []

  for (const h of hourReviews) {
    const isApproved = h.status === "APPROVED"
    const occurredAt = (isApproved ? h.approvedAt : h.updatedAt)?.toISOString() ?? new Date().toISOString()
    notifications.push({
      id: `hour:${h.id}`,
      type: isApproved ? "HOUR_APPROVED" : "HOUR_REJECTED",
      title: `Hours ${isApproved ? "approved" : "rejected"}: ${h.title}`,
      body: isApproved
        ? `${Number(h.totalHours).toFixed(1)} hours approved.`
        : h.rejectionReason || "Your entry was rejected.",
      link: "/dashboard/hours",
      occurredAt,
      isRead: lastRead !== null && new Date(occurredAt) <= lastRead,
    })
  }

  for (const f of formReviews) {
    const isVerified = f.status === "VERIFIED"
    const occurredAt = (isVerified ? f.verifiedAt : f.updatedAt)?.toISOString() ?? new Date().toISOString()
    notifications.push({
      id: `form:${f.id}`,
      type: isVerified ? "FORM_VERIFIED" : "FORM_REJECTED",
      title: `Form ${isVerified ? "verified" : "rejected"}: ${f.formType.name}`,
      body: isVerified ? null : f.rejectionReason || "Your submission was rejected.",
      link: "/dashboard/forms",
      occurredAt,
      isRead: lastRead !== null && new Date(occurredAt) <= lastRead,
    })
  }

  for (const inv of invoicesIssued) {
    notifications.push({
      id: `invoice:${inv.id}`,
      type: "INVOICE_ISSUED",
      title: `New invoice: ${inv.title}`,
      body: `$${(inv.amountCents / 100).toFixed(2)} due.`,
      link: "/dashboard/finances",
      occurredAt: inv.issuedAt.toISOString(),
      isRead: lastRead !== null && inv.issuedAt <= lastRead,
    })
  }

  for (const a of announcements) {
    if (!a.publishedAt) continue
    notifications.push({
      id: `announcement:${a.id}`,
      type: "ANNOUNCEMENT",
      title: a.title,
      body: a.body.length > 140 ? a.body.slice(0, 140) + "…" : a.body,
      link: "/dashboard",
      occurredAt: a.publishedAt.toISOString(),
      isRead: lastRead !== null && a.publishedAt <= lastRead,
    })
  }

  for (const r of resultsRecorded) {
    if (!r.resultRecordedAt) continue
    const placement = r.placement
    const scoreStr =
      r.scoreEarned !== null && r.scorePossible !== null
        ? `${Number(r.scoreEarned)}/${Number(r.scorePossible)}`
        : null
    const placementStr = placement !== null ? `${placement}${ordinalSuffix(placement)} place` : "Result recorded"
    notifications.push({
      id: `result:${r.id}`,
      type: "COMPETITION_RESULT",
      title: `${placementStr} in ${r.event.name}`,
      body: [r.competitionRoster.competition.name, scoreStr].filter(Boolean).join(" · ") || null,
      link: `/dashboard/competitions/${r.competitionRoster.competition.id}`,
      occurredAt: r.resultRecordedAt.toISOString(),
      isRead: lastRead !== null && r.resultRecordedAt <= lastRead,
    })
  }

  notifications.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))

  const limited = notifications.slice(0, limit)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return { notifications: limited, unreadCount }
}

function ordinalSuffix(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  if (lastTwo >= 11 && lastTwo <= 13) return "th"
  if (last === 1) return "st"
  if (last === 2) return "nd"
  if (last === 3) return "rd"
  return "th"
}
