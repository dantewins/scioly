"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  IconCheck, IconX,
} from "@tabler/icons-react"
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { formatDateOnly } from "@/lib/format"
import { DenyApplicationDialog } from "@/components/dialogs/deny-application-dialog"

type Applicant = {
  id: string
  membershipStatus: string
  applicationSubmittedAt: string | null
  user: { id: string; firstName: string; lastName: string; email: string; gradeLevel: number | null; phone: string | null }
  eventEnrollments: { event: { id: string; name: string; code: string | null } }[]
}

interface Props {
  initialApplicants: Applicant[]
  canManage: boolean
}

export function ApplicantsTable({ initialApplicants, canManage }: Props) {
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants)
  const [loading, setLoading] = useState(false)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState("")

  async function handleApprove(memberSeasonId: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberSeasonId, action: "approve" }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.message ?? "Failed to approve.")
        return
      }
      setApplicants((a) => a.filter((x) => x.id !== memberSeasonId))
      toast.success("Applicant approved and welcome email sent.")
    } finally { setLoading(false) }
  }

  async function handleDeny(memberSeasonId: string, reason: string) {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberSeasonId, action: "deny", reason }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.message ?? "Failed to deny.")
        return
      }
      setApplicants((a) => a.filter((x) => x.id !== memberSeasonId))
      setDenyingId(null)
      setDenyReason("")
      toast.success("Application denied.")
    } finally { setLoading(false) }
  }

  const columns: ColumnDef<Applicant>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.user.firstName} {row.original.user.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.original.user.email}</p>
        </div>
      ),
    },
    {
      id: "grade",
      header: "Grade",
      cell: ({ row }) => row.original.user.gradeLevel ?? "—",
    },
    {
      id: "applied",
      header: "Applied",
      cell: ({ row }) => row.original.applicationSubmittedAt
        ? formatDateOnly(new Date(row.original.applicationSubmittedAt))
        : "—",
    },
    {
      id: "events",
      header: "Event Choices",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.eventEnrollments.slice(0, 3).map((e) => (
            <Badge key={e.event.id} variant="outline" className="text-xs font-normal">
              {e.event.code ?? e.event.name}
            </Badge>
          ))}
          {row.original.eventEnrollments.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{row.original.eventEnrollments.length - 3} more
            </Badge>
          )}
          {row.original.eventEnrollments.length === 0 && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      ),
    },
    ...(canManage ? [{
      id: "actions",
      header: "",
      cell: ({ row }: { row: { original: Applicant } }) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => handleApprove(row.original.id)}
            disabled={loading}
          >
            <IconCheck className="size-3.5 mr-1" />Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => { setDenyingId(row.original.id); setDenyReason("") }}
            disabled={loading}
          >
            <IconX className="size-3.5 mr-1" />Deny
          </Button>
        </div>
      ),
    }] : []),
  ]

  const table = useReactTable({
    data: applicants,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  No applicants.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Deny dialog */}
      <DenyApplicationDialog
        open={!!denyingId}
        reason={denyReason}
        loading={loading}
        onReasonChange={setDenyReason}
        onConfirm={() => denyingId && handleDeny(denyingId, denyReason)}
        onCancel={() => { setDenyingId(null); setDenyReason("") }}
      />
    </div>
  )
}
