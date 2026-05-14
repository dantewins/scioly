// app/dashboard/finances/page.tsx
import { redirect } from "next/navigation"
import { IconWallet } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate, canEdit } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason, getMemberSeason } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/empty-state"
import { FinancesView } from "@/features/finances/components/finances-view"
import { MyFinancesView } from "@/features/finances/components/my-finances-view"


export default async function FinancesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const isAdminViewer = user.role === "WEBSITE_OWNER" || canView(user.permissions, "finances")

  const season = await getActiveSeason(user.clubId)

  if (!isAdminViewer) {
    if (!season) {
      return (
        <div className="layout-page">
          <PageHeader title="My Finances" description="Dues and invoices for the current season." />
          <EmptyState icon={IconWallet} title="No active season" description="There's no active season yet, so there are no invoices to show." />
        </div>
      )
    }
    const memberSeason = await getMemberSeason(user.id, user.clubId)
    const invoices = memberSeason
      ? await prisma.duesInvoice.findMany({
          where: { memberSeasonId: memberSeason.id, seasonId: season.id },
          include: {
            payments: {
              select: { id: true, amountCents: true, method: true, paidAt: true, referenceNumber: true },
              orderBy: { paidAt: "desc" },
            },
          },
          orderBy: [{ status: "asc" }, { issuedAt: "desc" }],
        })
      : []
    const totalOutstanding = invoices
      .filter((i) => i.status !== "PAID" && i.status !== "VOID")
      .reduce((s, i) => s + Math.max(0, i.amountCents - i.amountPaidCents), 0)
    return (
      <div className="layout-page">
        <PageHeader
          title="My Finances"
          kicker={season.name ?? undefined}
          description={
            totalOutstanding > 0
              ? `You have $${(totalOutstanding / 100).toFixed(2)} outstanding.`
              : "All caught up — no outstanding dues."
          }
        />
        <MyFinancesView
          invoices={invoices.map((inv) => ({
            id: inv.id,
            title: inv.title,
            status: inv.status,
            amountCents: inv.amountCents,
            amountPaidCents: inv.amountPaidCents,
            dueAt: inv.dueAt?.toISOString() ?? null,
            issuedAt: inv.issuedAt.toISOString(),
            paidAt: inv.paidAt?.toISOString() ?? null,
            notes: inv.notes ?? null,
            payments: inv.payments.map((p) => ({
              id: p.id,
              amountCents: p.amountCents,
              method: p.method,
              paidAt: p.paidAt.toISOString(),
              referenceNumber: p.referenceNumber ?? null,
            })),
          }))}
        />
      </div>
    )
  }

  const [invoices, members] = season ? await Promise.all([
    prisma.duesInvoice.findMany({
      where: { seasonId: season.id },
      include: {
        memberSeason: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        payments: { select: { id: true, amountCents: true, method: true, paidAt: true, referenceNumber: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.memberSeason.findMany({
      where: { seasonId: season.id, membershipStatus: "ACTIVE", user: { clubId: user.clubId } },
      select: {
        id: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ user: { lastName: "asc" } }],
    }),
  ]) : [[], []]

  const totalOwed = invoices
    .filter((i) => ["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((s, i) => s + (i.amountCents - i.amountPaidCents), 0)

  return (
    <div className="layout-page">
      <PageHeader
        title="Finances"
        description={`$${(totalOwed / 100).toFixed(2)} outstanding across ${invoices.filter((i) => i.status !== "PAID" && i.status !== "VOID").length} invoices`}
      />

      {!season ? (
        <EmptyState icon={IconWallet} title="No active season" />
      ) : (
        <FinancesView
          invoices={invoices.map(inv => ({
            ...inv,
            dueAt: inv.dueAt?.toISOString() ?? null,
            issuedAt: inv.issuedAt.toISOString(),
            payments: inv.payments.map(p => ({
              ...p,
              paidAt: p.paidAt.toISOString(),
            })),
          }))}
          members={members}
          canCreate={canEdit(user.permissions, "finances") || canCreate(user.permissions, "finances")}
          canEdit={canEdit(user.permissions, "finances")}
        />
      )}
    </div>
  )
}
