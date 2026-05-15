"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  IconCheck, IconX, IconClock,
} from "@tabler/icons-react"
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { formatDateOnly } from "@/lib/format"
import { apiCall } from "@/lib/api-client"
import type { ApplicantReviewRecord } from "@/lib/applications"
import { DenyApplicationDialog } from "@/features/applications/components/deny-application-dialog"

interface Props {
  initialApplicants: ApplicantReviewRecord[]
  canManage: boolean
}

type BulkAction = "approve" | "deny" | "waitlist"

interface BulkResponse {
  ok: number
  failed: number
  failures: Array<{ memberSeasonId: string; error?: string }>
}

export function ApplicantsTable({ initialApplicants, canManage }: Props) {
  const [applicants, setApplicants] = useState<ApplicantReviewRecord[]>(initialApplicants)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Single-target deny + bulk deny share the same dialog
  const [denyTarget, setDenyTarget] = useState<"bulk" | { id: string } | null>(null)
  const [denyReason, setDenyReason] = useState("")

  const allIds = useMemo(() => applicants.map((a) => a.id), [applicants])

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === allIds.length && allIds.length > 0 ? new Set() : new Set(allIds),
    )
  }

  async function runBulk(action: BulkAction, ids: string[], reason?: string) {
    if (ids.length === 0) return
    setLoading(true)
    try {
      const result = await apiCall<BulkResponse>("/api/admin/applicants", {
        method: "PATCH",
        body: JSON.stringify({
          memberSeasonIds: ids,
          action,
          ...(reason ? { reason } : {}),
        }),
      })
      const okSet = new Set(ids.filter((id) => !result.failures.some((f) => f.memberSeasonId === id)))
      setApplicants((current) => current.filter((a) => !okSet.has(a.id)))
      setSelectedIds((current) => {
        const next = new Set(current)
        for (const id of okSet) next.delete(id)
        return next
      })

      const verbMap: Record<BulkAction, string> = {
        approve: "approved",
        deny: "denied",
        waitlist: "waitlisted",
      }
      const verb = verbMap[action]
      if (result.failed > 0) {
        toast.warning(`${result.ok} ${verb}, ${result.failed} failed`)
      } else if (result.ok === 1) {
        toast.success(`Application ${verb}.`)
      } else {
        toast.success(`${result.ok} applications ${verb}.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed.")
    } finally {
      setLoading(false)
      setDenyTarget(null)
      setDenyReason("")
    }
  }

  function handleApprove(id: string) {
    void runBulk("approve", [id])
  }

  function handleWaitlist(id: string) {
    void runBulk("waitlist", [id])
  }

  function handleDenyConfirm() {
    if (denyTarget === "bulk") {
      void runBulk("deny", [...selectedIds], denyReason)
    } else if (denyTarget && "id" in denyTarget) {
      void runBulk("deny", [denyTarget.id], denyReason)
    }
  }

  const columns: ColumnDef<ApplicantReviewRecord>[] = [
    ...(canManage ? [{
      id: "select",
      header: () => (
        <Checkbox
          checked={selectedIds.size > 0 && selectedIds.size === allIds.length}
          onCheckedChange={toggleAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: { row: { original: ApplicantReviewRecord } }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleOne(row.original.id)}
          aria-label={`Select ${row.original.user.firstName}`}
        />
      ),
    }] : []),
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
          {row.original.eventChoices.slice(0, 3).map((e) => (
            <Badge key={e.event.id} variant="outline" className="text-xs font-normal">
              {e.event.code ?? e.event.name}
            </Badge>
          ))}
          {row.original.eventChoices.length > 3 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{row.original.eventChoices.length - 3} more
            </Badge>
          )}
          {row.original.eventChoices.length === 0 && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      ),
    },
    ...(canManage ? [{
      id: "actions",
      header: "",
      cell: ({ row }: { row: { original: ApplicantReviewRecord } }) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="xs"
            variant="outline"
            className="text-[var(--success)] border-[color-mix(in_oklch,var(--success),transparent_75%)] hover:bg-[var(--success-soft)]"
            onClick={() => handleApprove(row.original.id)}
            disabled={loading}
          >
            <IconCheck className="size-3.5 mr-1" />Approve
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-muted-foreground"
            onClick={() => handleWaitlist(row.original.id)}
            disabled={loading}
          >
            <IconClock className="size-3.5 mr-1" />Waitlist
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => { setDenyTarget({ id: row.original.id }); setDenyReason("") }}
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
      {/* Bulk action bar */}
      {canManage && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-azure-200/60 bg-azure-50/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} of {applicants.length} selected
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="text-[var(--success)] border-[color-mix(in_oklch,var(--success),transparent_75%)] hover:bg-[var(--success-soft)]"
              onClick={() => runBulk("approve", [...selectedIds])}
              disabled={loading}
            >
              <IconCheck className="mr-1.5 size-[15px]" />
              Approve {selectedIds.size}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runBulk("waitlist", [...selectedIds])}
              disabled={loading}
            >
              <IconClock className="mr-1.5 size-[15px]" />
              Waitlist {selectedIds.size}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => { setDenyTarget("bulk"); setDenyReason("") }}
              disabled={loading}
            >
              <IconX className="mr-1.5 size-[15px]" />
              Deny {selectedIds.size}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={loading}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--radius)] border border-border/80 bg-card shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)]">
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

      {/* Deny dialog (shared by single + bulk) */}
      <DenyApplicationDialog
        open={denyTarget !== null}
        reason={denyReason}
        loading={loading}
        onReasonChange={setDenyReason}
        onConfirm={handleDenyConfirm}
        onCancel={() => { setDenyTarget(null); setDenyReason("") }}
      />
    </div>
  )
}
