// app/dashboard/finances/page.tsx
import { redirect } from "next/navigation"
import { IconWallet } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { canView, canCreate } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { getActiveSeason } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { FinancesView } from "./finances-view"

export const dynamic = "force-dynamic"

export default async function FinancesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!canView(user.permissions, "finances")) redirect("/dashboard")

  const season = await getActiveSeason(user.clubId)
  const [invoices, members] = season ? await Promise.all([
    prisma.duesInvoice.findMany({
      where: { seasonId: season.id },
      include: {
        memberSeason: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        payments: { select: { id: true, amountCents: true, method: true, paidAt: true, referenceNumber: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.memberSeason.findMany({
      where: { seasonId: season.id, membershipStatus: "ACTIVE", user: { clubId: user.clubId } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ user: { lastName: "asc" } }],
    }),
  ]) : [[], []]

  const totalOwed = invoices
    .filter((i) => ["OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((s, i) => s + (i.amountCents - i.amountPaidCents), 0)

  return (
    <div className="flex flex-col gap-6 py-4 lg:px-6 md:py-6 sm:px-4 px-0">
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
          canCreate={canCreate(user.permissions, "finances")}
          canEdit={canView(user.permissions, "finances")}
        />
      )}
    </div>
  )
}
