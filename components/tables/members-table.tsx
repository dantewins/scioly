"use client"

import * as React from "react"
import {
  IconArrowLeft,
  IconDots,
  IconLoader2,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconUserOff,
  IconUserCheck,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { PageHeader } from "@/components/page-header"

const summarySchemaMember = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  grade: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  membershipStatus: z.string().optional().default("ACTIVE"),
  statusChangedAt: z.string().optional().default(""),
  joinedAt: z.string().optional().default(""),
  eventCount: z.number().optional().default(0),
  teamLabel: z.string().nullable().optional(),
  teamEvent: z.string().nullable().optional(),
})

const teamAssignmentSchema = z.object({
  id: z.string(),
  role: z.string(),
  seatNumber: z.number().nullable().optional(),
  teamId: z.string(),
  teamLabel: z.string(),
  teamStatus: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  competitionName: z.string().nullable().optional(),
})

const eventEnrollmentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  status: z.string(),
  preferenceRank: z.number().nullable().optional(),
  partnerPreference: z.string().optional().default("NA"),
  partnerNames: z.string().optional().default(""),
})

const detailSchemaMember = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional().default(""),
  grade: z.string().optional().default(""),
  shirtSize: z.string().optional().default(""),
  isReturning: z.boolean().optional().default(false),
  canTravel: z.boolean().optional().default(false),
  membershipStatus: z.string().optional().default("ACTIVE"),
  statusChangedAt: z.string().optional().default(""),
  statusReason: z.string().optional().default(""),
  joinedAt: z.string().optional().default(""),
  eventEnrollments: z.array(eventEnrollmentSchema).optional().default([]),
  teamAssignments: z.array(teamAssignmentSchema).optional().default([]),
})

type MemberSummary = z.infer<typeof summarySchemaMember>
type MemberDetail = z.infer<typeof detailSchemaMember>
type StatusFilter = "all" | "ACTIVE" | "INACTIVE" | "ALUMNI"

function MemberStatusBadge({ value }: { value: string | undefined }) {
  if (value === "ACTIVE") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
        Active
      </Badge>
    )
  }
  if (value === "INACTIVE") return <Badge variant="secondary">Inactive</Badge>
  if (value === "ALUMNI") return <Badge variant="outline">Alumni</Badge>
  return <Badge variant="secondary">{value}</Badge>
}

function EnrollmentStatusBadge({ value }: { value: string }) {
  if (value === "ACTIVE") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-xs">Active</Badge>
  }
  if (value === "WAITLISTED") return <Badge variant="outline" className="text-xs">Waitlisted</Badge>
  if (value === "DROPPED") return <Badge variant="destructive" className="text-xs">Dropped</Badge>
  if (value === "TRYOUT_PENDING") return <Badge variant="secondary" className="text-xs">Tryout</Badge>
  return <Badge variant="secondary" className="text-xs">{value}</Badge>
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  )
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`
  return phone || "—"
}

interface MemberEditFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  gradeLevel: string
  shirtSize: string
  isReturning: boolean
  canTravel: boolean
}

function buildMemberEditForm(m: MemberSummary | MemberDetail): MemberEditFormState {
  const parts = m.name.trim().split(" ")
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    email: m.email,
    phone: m.phone ?? "",
    gradeLevel: m.grade ?? "",
    shirtSize: "shirtSize" in m ? (m.shirtSize ?? "") : "",
    isReturning: "isReturning" in m ? (m.isReturning ?? false) : false,
    canTravel: "canTravel" in m ? (m.canTravel ?? false) : false,
  }
}

const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

const pagedMembersSchema = z.object({
  items: z.array(summarySchemaMember),
  total: z.number(),
})

export function MembersTable() {
  const [data, setData] = React.useState<MemberSummary[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [detailsLoading, setDetailsLoading] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<MemberDetail | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  const [editTarget, setEditTarget] = React.useState<MemberSummary | MemberDetail | null>(null)
  const [editForm, setEditForm] = React.useState<MemberEditFormState | null>(null)
  const [editSaving, setEditSaving] = React.useState(false)

  const [deactivateTarget, setDeactivateTarget] = React.useState<{ id: string; action: "deactivate" | "reactivate" } | null>(null)
  const [deactivateSaving, setDeactivateSaving] = React.useState(false)

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const isMobile = useIsMobile()

  const loadMembers = React.useCallback(async (
    page: number,
    pageSize: number,
    status: StatusFilter,
    search: string,
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(pageSize),
        status,
        search,
      })
      const res = await fetch(`/api/admin/members?${params}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const parsed = pagedMembersSchema.parse(json)
      setData(parsed.items)
      setTotal(parsed.total)
    } catch {
      toast.error("Failed to load members.")
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMemberDetails = React.useCallback(async (id: string) => {
    setDetailsLoading(true)
    try {
      const res = await fetch(`/api/admin/members?id=${id}`, { method: "GET", cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSelectedMember(detailSchemaMember.parse(json))
    } catch {
      toast.error("Failed to load member details.")
      setSelectedMember(null)
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  // Debounce raw search input — debouncedSearch drives the load, not searchQuery directly
  const [debouncedSearch, setDebouncedSearch] = React.useState(searchQuery)
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // When filter or debounced search changes, reset to page 0.
  // Returns the same reference when already at page 0 so React bails out and avoids a re-render.
  React.useEffect(() => {
    setPagination(p => p.pageIndex === 0 ? p : { ...p, pageIndex: 0 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, debouncedSearch])

  // Single load effect — covers initial mount, page navigation, filter changes, and search changes
  React.useEffect(() => {
    void loadMembers(pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch])

  const openEdit = React.useCallback((m: MemberSummary | MemberDetail) => {
    setEditTarget(m)
    setEditForm(buildMemberEditForm(m))
  }, [])

  const saveEdit = React.useCallback(async () => {
    if (!editTarget || !editForm) return
    setEditSaving(true)
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTarget.id, action: "edit", ...editForm }),
      })
      if (!res.ok) throw new Error()
      toast.success("Member updated.")
      setEditTarget(null)
      setEditForm(null)
      await loadMembers(pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch)
      if (selectedMember?.id === editTarget.id) await loadMemberDetails(editTarget.id)
    } catch {
      toast.error("Failed to save changes.")
    } finally {
      setEditSaving(false)
    }
  }, [editTarget, editForm, loadMembers, loadMemberDetails, selectedMember, pagination, statusFilter, debouncedSearch])

  const submitDeactivate = React.useCallback(async () => {
    if (!deactivateTarget) return
    setDeactivateSaving(true)
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deactivateTarget.id, action: deactivateTarget.action }),
      })
      if (!res.ok) throw new Error()
      toast.success(deactivateTarget.action === "deactivate" ? "Member deactivated." : "Member reactivated.")
      setDeactivateTarget(null)
      await loadMembers(pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch)
      if (selectedMember?.id === deactivateTarget.id) await loadMemberDetails(deactivateTarget.id)
    } catch {
      toast.error("Failed to update member status.")
    } finally {
      setDeactivateSaving(false)
    }
  }, [deactivateTarget, loadMembers, loadMemberDetails, selectedMember, pagination, statusFilter, debouncedSearch])


  const columns = React.useMemo<ColumnDef<MemberSummary>[]>(() => [
    {
      accessorKey: "name",
      header: "Member",
      filterFn: (row, _id, filterValue) => {
        const s = String(filterValue ?? "").toLowerCase().trim()
        if (!s) return true
        return (
          row.original.name.toLowerCase().includes(s) ||
          row.original.email.toLowerCase().includes(s)
        )
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <div className="text-sm">{row.original.grade || "—"}</div>,
    },
    {
      id: "team",
      header: "Team",
      cell: ({ row }) => {
        const { teamLabel, teamEvent } = row.original
        if (!teamLabel) return <div className="text-sm text-muted-foreground">—</div>
        return (
          <div>
            <div className="text-sm font-medium">{teamLabel}</div>
            {teamEvent && <div className="text-xs text-muted-foreground">{teamEvent}</div>}
          </div>
        )
      },
    },
    {
      id: "events",
      header: "Events",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.eventCount ?? 0}</div>
      ),
    },
    {
      accessorKey: "membershipStatus",
      header: "Status",
      cell: ({ row }) => <MemberStatusBadge value={row.original.membershipStatus} />,
    },
    {
      id: "actions",
      header: () => null,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-center" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <IconDots className="size-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <IconEdit className="size-4" /> Edit
              </DropdownMenuItem>
              {row.original.membershipStatus === "ACTIVE" ? (
                <DropdownMenuItem
                  onClick={() => setDeactivateTarget({ id: row.original.id, action: "deactivate" })}
                >
                  <IconUserOff className="size-4" /> Deactivate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setDeactivateTarget({ id: row.original.id, action: "reactivate" })}
                >
                  <IconUserCheck className="size-4" /> Reactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [openEdit])

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  if (detailsLoading || selectedMember) {
    return (
      <>
        <div className="space-y-6 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedMember(null)}
          >
            <IconArrowLeft className="size-4" />
            Back to members
          </Button>

          {detailsLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              Loading member...
            </div>
          ) : selectedMember ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div className="rounded-xl border p-6 space-y-4">
                  <h2 className="font-semibold">Event enrollments</h2>
                  <Separator />
                  {selectedMember.eventEnrollments.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedMember.eventEnrollments.map(e => (
                        <div key={e.id} className="rounded-lg border p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">{e.eventName}</div>
                            <EnrollmentStatusBadge value={e.status} />
                          </div>
                          {e.preferenceRank != null && (
                            <div className="text-xs text-muted-foreground">
                              Preference rank: #{e.preferenceRank}
                            </div>
                          )}
                          {e.partnerPreference && e.partnerPreference !== "NA" && (
                            <div className="text-xs text-muted-foreground">
                              Partner: {e.partnerPreference.toLowerCase()}{e.partnerNames ? ` · ${e.partnerNames}` : ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No event enrollments.</p>
                  )}
                </div>

                <div className="rounded-xl border p-6 space-y-4">
                  <h2 className="font-semibold">Team assignments</h2>
                  <Separator />
                  {selectedMember.teamAssignments.length ? (
                    <div className="space-y-3">
                      {selectedMember.teamAssignments.map(t => (
                        <div key={t.id} className="rounded-lg border p-4 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                              Team {t.teamLabel} — {t.eventName}
                            </div>
                            <Badge variant="outline" className="text-xs">{t.role}</Badge>
                          </div>
                          {t.competitionName && (
                            <div className="text-xs text-muted-foreground">{t.competitionName}</div>
                          )}
                          {t.seatNumber != null && (
                            <div className="text-xs text-muted-foreground">Seat #{t.seatNumber}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No team assignments.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-xl border p-4 space-y-4">
                  <div>
                    <div className="text-base font-semibold">{selectedMember.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedMember.email}</div>
                    {selectedMember.phone && (
                      <div className="text-sm text-muted-foreground">
                        {formatPhone(selectedMember.phone)}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2.5">
                    <InfoRow label="Grade" value={selectedMember.grade || "—"} />
                    <InfoRow label="Shirt size" value={selectedMember.shirtSize || "—"} />
                    <InfoRow label="Can travel" value={selectedMember.canTravel ? "Yes" : "No"} />
                    <InfoRow
                      label="Status"
                      value={<MemberStatusBadge value={selectedMember.membershipStatus} />}
                    />
                    <InfoRow label="Joined" value={selectedMember.joinedAt || "—"} />
                    {selectedMember.statusChangedAt && (
                      <InfoRow label="Updated" value={selectedMember.statusChangedAt} />
                    )}
                    {selectedMember.statusReason && (
                      <InfoRow label="Note" value={selectedMember.statusReason} />
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {selectedMember.membershipStatus === "ACTIVE" ? (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setDeactivateTarget({ id: selectedMember.id, action: "deactivate" })}
                      >
                        <IconUserOff className="size-4" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => setDeactivateTarget({ id: selectedMember.id, action: "reactivate" })}
                      >
                        <IconUserCheck className="size-4" />
                        Reactivate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openEdit(selectedMember)}
                    >
                      <IconEdit className="size-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <MemberEditSheet
          target={editTarget}
          form={editForm}
          saving={editSaving}
          onChange={setEditForm}
          onClose={() => { setEditTarget(null); setEditForm(null) }}
          onSave={() => void saveEdit()}
        />
        <DeactivateDialog
          target={deactivateTarget}
          saving={deactivateSaving}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={() => void submitDeactivate()}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4 px-4 lg:px-6">
        <PageHeader title="Members" description="Manage accepted members for the active season.">
          <div className="w-full sm:w-[240px]">
            <Label htmlFor="search-members" className="sr-only">Search</Label>
            <Input
              id="search-members"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-background"
            />
          </div>
        </PageHeader>
        <Tabs
          value={statusFilter}
          onValueChange={v => setStatusFilter(v as StatusFilter)}
        >
          <TabsList variant="line">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="INACTIVE">Inactive</TabsTrigger>
            <TabsTrigger value="ALUMNI">Alumni</TabsTrigger>
          </TabsList>
        </Tabs>
        {isMobile ? (
          <div className="space-y-3">
            {loading ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" />
                Loading members...
              </div>
            ) : data.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No members found.
              </div>
            ) : (
              data.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => void loadMemberDetails(m.id)}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {m.grade && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Grade {m.grade}
                        </span>
                      )}
                      {(m.eventCount ?? 0) > 0 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {m.eventCount} event{m.eventCount === 1 ? "" : "s"}
                        </span>
                      )}
                      <MemberStatusBadge value={m.membershipStatus} />
                    </div>
                  </div>
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <IconDots className="size-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(m)}>
                          <IconEdit className="size-4" /> Edit
                        </DropdownMenuItem>
                        {m.membershipStatus === "ACTIVE" ? (
                          <DropdownMenuItem
                            onClick={() => setDeactivateTarget({ id: m.id, action: "deactivate" })}
                          >
                            <IconUserOff className="size-4" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setDeactivateTarget({ id: m.id, action: "reactivate" })}
                          >
                            <IconUserCheck className="size-4" /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="h-12">
                    {hg.headers.map(header => (
                      <TableHead
                        key={header.id}
                        className={
                          header.id === "membershipStatus" || header.id === "actions"
                            ? "w-px whitespace-nowrap px-4 font-semibold text-foreground"
                            : "px-4 font-semibold text-foreground"
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <IconLoader2 className="size-4 animate-spin" />
                        <span>Loading members...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => void loadMemberDetails(row.original.id)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === "membershipStatus" || cell.column.id === "actions"
                              ? "w-px whitespace-nowrap px-4 py-3"
                              : "px-4 py-3"
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                      No members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-muted-foreground">
            {(() => {
              const { pageIndex, pageSize } = pagination
              const from = total === 0 ? 0 : pageIndex * pageSize + 1
              const to = Math.min((pageIndex + 1) * pageSize, total)
              return `Showing ${from}–${to} of ${total}`
            })()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))}
              disabled={pagination.pageIndex === 0}
            >
              <IconChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
              disabled={(pagination.pageIndex + 1) * pagination.pageSize >= total}
            >
              <IconChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
      <MemberEditSheet
        target={editTarget}
        form={editForm}
        saving={editSaving}
        onChange={setEditForm}
        onClose={() => { setEditTarget(null); setEditForm(null) }}
        onSave={() => void saveEdit()}
      />
      <DeactivateDialog
        target={deactivateTarget}
        saving={deactivateSaving}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void submitDeactivate()}
      />
    </>
  )
}

function DeactivateDialog({
  target,
  saving,
  onClose,
  onConfirm,
}: {
  target: { id: string; action: "deactivate" | "reactivate" } | null
  saving: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {target?.action === "deactivate" ? "Deactivate member" : "Reactivate member"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          {target?.action === "deactivate"
            ? "This member will be marked as inactive. They will lose active member access."
            : "This member will be reactivated and regain active member access."}
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={target?.action === "deactivate" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving && <IconLoader2 className="size-4 animate-spin" />}
            {target?.action === "deactivate" ? "Deactivate" : "Reactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MemberEditSheet({
  target,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  target: MemberSummary | MemberDetail | null
  form: MemberEditFormState | null
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<MemberEditFormState | null>>
  onClose: () => void
  onSave: () => void
}) {
  const setField = (field: keyof MemberEditFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => onChange(f => f ? { ...f, [field]: e.target.value } : f)

  return (
    <Sheet open={!!target} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg gap-0">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Edit member</SheetTitle>
        </SheetHeader>
        {form && (
          <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="mef-first">First name</FieldLabel>
                <Input id="mef-first" value={form.firstName} onChange={setField("firstName")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="mef-last">Last name</FieldLabel>
                <Input id="mef-last" value={form.lastName} onChange={setField("lastName")} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="mef-email">Email</FieldLabel>
              <Input id="mef-email" type="email" value={form.email} onChange={setField("email")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="mef-phone">Phone number</FieldLabel>
                <Input
                  id="mef-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(555) 555-5555"
                  value={form.phone}
                  onChange={setField("phone")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="mef-grade">Grade level</FieldLabel>
                <select
                  id="mef-grade"
                  value={form.gradeLevel}
                  onChange={setField("gradeLevel")}
                  className={selectClassName}
                >
                  <option value="">Select grade</option>
                  {["9", "10", "11", "12"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="mef-shirt">Shirt size</FieldLabel>
              <select
                id="mef-shirt"
                value={form.shirtSize}
                onChange={setField("shirtSize")}
                className={selectClassName}
              >
                <option value="">Select size</option>
                {["XS", "S", "M", "L", "XL"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel>Returning member?</FieldLabel>
              <div className="flex flex-wrap gap-4 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mef-returning"
                    value="yes"
                    checked={form.isReturning === true}
                    onChange={() => onChange(f => f ? { ...f, isReturning: true } : f)}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mef-returning"
                    value="no"
                    checked={form.isReturning === false}
                    onChange={() => onChange(f => f ? { ...f, isReturning: false } : f)}
                  />
                  No
                </label>
              </div>
            </Field>

            <Field>
              <FieldLabel>Can travel?</FieldLabel>
              <div className="flex flex-wrap gap-4 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mef-travel"
                    value="yes"
                    checked={form.canTravel === true}
                    onChange={() => onChange(f => f ? { ...f, canTravel: true } : f)}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mef-travel"
                    value="no"
                    checked={form.canTravel === false}
                    onChange={() => onChange(f => f ? { ...f, canTravel: false } : f)}
                  />
                  No
                </label>
              </div>
            </Field>
          </div>
        )}

        <SheetFooter className="border-t pt-4 flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <IconLoader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
