"use client"

import * as React from "react"
import {
  IconArrowLeft,
  IconDots,
  IconLoader2,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconCircleCheck,
  IconBan,
} from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/page-header"

const summarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  grade: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  returning: z.enum(["Returning", "New"]).optional(),
  membershipStatus: z.string().optional().default("PENDING"),
  statusChangedAt: z.string().optional().default(""),
  submittedAt: z.string().optional().default(""),
})

const eventChoiceSchema = z.object({
  eventName: z.string().optional().default(""),
  partnerNames: z.string().optional().default(""),
  partnerPreference: z
    .enum(["MANDATORY", "RECOMMENDED", "NA"])
    .optional()
    .default("NA"),
})

const detailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional().default(""),
  grade: z.string().optional().default(""),
  gradeLevel: z.string().optional().default(""),
  shirtSize: z.string().optional().default(""),
  returning: z.enum(["Returning", "New"]).optional(),
  isReturning: z.union([z.boolean(), z.string()]).optional(),
  membershipStatus: z.string().optional().default("PENDING"),
  statusChangedAt: z.string().optional().default(""),

  whyJoin: z.string().optional().default(""),
  contributionIdeas: z.string().optional().default(""),
  topEvents: z.array(eventChoiceSchema).optional().default([]),
  awards: z.string().optional().default(""),
  previousEvents: z.string().optional().default(""),
  scienceClasses: z.string().optional().default(""),
  mathClasses: z.string().optional().default(""),
  questions: z.string().optional().default(""),

  focusPageFileUrl: z.string().optional().default(""),
  focusPageFileName: z.string().optional().default(""),
  submittedAt: z.string().optional().default(""),
})

type ApplicantSummary = z.infer<typeof summarySchema>
type ApplicantDetail = z.infer<typeof detailSchema>
type StatusFilter = "all" | "PENDING" | "ACTIVE" | "REMOVED"

function ReturningBadge({ value }: { value: "Returning" | "New" | undefined }) {
  if (value === "Returning") return <Badge variant="outline">Returning</Badge>
  return <Badge variant="secondary">New</Badge>
}

function StatusBadge({ value }: { value: string | undefined }) {
  if (value === "ACTIVE") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
        Approved
      </Badge>
    )
  }
  if (value === "REMOVED") return <Badge variant="destructive">Rejected</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

function normalizeReturning(applicant: ApplicantDetail | ApplicantSummary) {
  if ("returning" in applicant && applicant.returning) return applicant.returning
  if ("isReturning" in applicant) {
    const v = applicant.isReturning
    if (v === true || v === "true" || v === "yes" || v === "Returning")
      return "Returning" as const
  }
  return "New" as const
}

function getGradeLabel(applicant: ApplicantDetail | ApplicantSummary) {
  if ("gradeLevel" in applicant && applicant.gradeLevel) return applicant.gradeLevel
  return applicant.grade || "—"
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`
  return phone || "—"
}

function formatPartnerPreference(value: string | undefined) {
  if (!value || value.toUpperCase() === "NA") return "NA"
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function ResponseItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  )
}

interface EditFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  gradeLevel: string
  shirtSize: string
  isReturning: boolean
  whyJoin: string
  contributionIdeas: string
  awards: string
  previousEvents: string
  scienceClasses: string
  mathClasses: string
  questions: string
}

function buildEditForm(a: ApplicantSummary | ApplicantDetail): EditFormState {
  const parts = a.name.trim().split(" ")
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    email: a.email,
    phone: a.phone ?? "",
    gradeLevel: a.grade ?? "",
    shirtSize: "shirtSize" in a ? (a.shirtSize ?? "") : "",
    isReturning: normalizeReturning(a) === "Returning",
    whyJoin: "whyJoin" in a ? (a.whyJoin ?? "") : "",
    contributionIdeas: "contributionIdeas" in a ? (a.contributionIdeas ?? "") : "",
    awards: "awards" in a ? (a.awards ?? "") : "",
    previousEvents: "previousEvents" in a ? (a.previousEvents ?? "") : "",
    scienceClasses: "scienceClasses" in a ? (a.scienceClasses ?? "") : "",
    mathClasses: "mathClasses" in a ? (a.mathClasses ?? "") : "",
    questions: "questions" in a ? (a.questions ?? "") : "",
  }
}

const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

const textareaClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y"

const pagedApplicantsSchema = z.object({
  items: z.array(summarySchema),
  total: z.number(),
})

export function ApplicantsTable() {
  const isMobile = useIsMobile()
  const [data, setData] = React.useState<ApplicantSummary[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [detailsLoading, setDetailsLoading] = React.useState(false)
  const [selectedApplicant, setSelectedApplicant] = React.useState<ApplicantDetail | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  const [editTarget, setEditTarget] = React.useState<ApplicantSummary | ApplicantDetail | null>(null)
  const [editForm, setEditForm] = React.useState<EditFormState | null>(null)
  const [editSaving, setEditSaving] = React.useState(false)

  const [actionTarget, setActionTarget] = React.useState<{ id: string; action: "approve" | "reject" } | null>(null)
  const [actionReason, setActionReason] = React.useState("")
  const [actionSaving, setActionSaving] = React.useState(false)

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const loadApplicants = React.useCallback(async (
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
      const res = await fetch(`/api/admin/applicants?${params}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const parsed = pagedApplicantsSchema.parse(json)
      setData(parsed.items)
      setTotal(parsed.total)
    } catch {
      toast.error("Failed to load applicants.")
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadApplicantDetails = React.useCallback(async (id: string) => {
    setDetailsLoading(true)
    try {
      const res = await fetch(`/api/admin/applicants?id=${id}`, { method: "GET", cache: "no-store" })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSelectedApplicant(detailSchema.parse(json))
    } catch {
      toast.error("Failed to load applicant details.")
      setSelectedApplicant(null)
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
    void loadApplicants(pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch])

  const submitAction = React.useCallback(async () => {
    if (!actionTarget) return
    setActionSaving(true)
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: actionTarget.id, action: actionTarget.action, reason: actionReason }),
      })
      if (!res.ok) throw new Error()
      toast.success(actionTarget.action === "approve" ? "Applicant approved." : "Applicant rejected.")
      setActionTarget(null)
      setActionReason("")
      await loadApplicants(pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch)
      if (selectedApplicant?.id === actionTarget.id) await loadApplicantDetails(actionTarget.id)
    } catch {
      toast.error(actionTarget.action === "approve" ? "Failed to approve applicant." : "Failed to reject applicant.")
    } finally {
      setActionSaving(false)
    }
  }, [actionTarget, actionReason, loadApplicants, loadApplicantDetails, selectedApplicant, pagination, statusFilter, debouncedSearch])

  const openEdit = React.useCallback((a: ApplicantSummary | ApplicantDetail) => {
    setEditTarget(a)
    setEditForm(buildEditForm(a))
  }, [])

  const saveEdit = React.useCallback(async () => {
    if (!editTarget || !editForm) return
    setEditSaving(true)
    try {
      const res = await fetch("/api/admin/applicants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTarget.id, action: "edit", ...editForm }),
      })
      if (!res.ok) throw new Error()
      toast.success("Applicant updated.")
      setEditTarget(null)
      setEditForm(null)
      await loadApplicants(pagination.pageIndex, pagination.pageSize, statusFilter, debouncedSearch)
      if (selectedApplicant?.id === editTarget.id) await loadApplicantDetails(editTarget.id)
    } catch {
      toast.error("Failed to save changes.")
    } finally {
      setEditSaving(false)
    }
  }, [editTarget, editForm, loadApplicants, loadApplicantDetails, selectedApplicant, pagination, statusFilter, debouncedSearch])

  const openAction = React.useCallback((id: string, action: "approve" | "reject") => {
    setActionReason("")
    setActionTarget({ id, action })
  }, [])

  const columns = React.useMemo<ColumnDef<ApplicantSummary>[]>(() => [
    {
      accessorKey: "name",
      header: "Applicant",
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
      cell: ({ row }) => <div className="text-sm">{getGradeLabel(row.original)}</div>,
    },
    {
      accessorKey: "returning",
      header: "Type",
      cell: ({ row }) => <ReturningBadge value={normalizeReturning(row.original)} />,
    },
    {
      accessorKey: "membershipStatus",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.original.membershipStatus} />,
    },
    {
      accessorKey: "submittedAt",
      header: "Submitted",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">{row.original.submittedAt || "—"}</div>
      ),
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
              <DropdownMenuItem
                onClick={() => openAction(row.original.id, "approve")}
                disabled={row.original.membershipStatus === "ACTIVE"}
              >
                <IconCircleCheck className="size-4" /> Accept
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openAction(row.original.id, "reject")}
                disabled={row.original.membershipStatus === "REMOVED"}
              >
                <IconBan className="size-4" /> Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [openAction, openEdit])

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  if (detailsLoading || selectedApplicant) {
    return (
      <>
        <div className="space-y-6 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedApplicant(null)}
          >
            <IconArrowLeft className="size-4" />
            Back to applicants
          </Button>

          {detailsLoading ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              Loading application...
            </div>
          ) : selectedApplicant ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div className="rounded-xl border p-6 space-y-5">
                  <h2 className="font-semibold">Written responses</h2>
                  <Separator />
                  <ResponseItem
                    label="Why do you want to join Science Olympiad?"
                    value={selectedApplicant.whyJoin}
                  />
                  <ResponseItem
                    label="What new ideas do you have and how will you contribute?"
                    value={selectedApplicant.contributionIdeas}
                  />
                  <ResponseItem
                    label="Division B and Division C awards"
                    value={selectedApplicant.awards}
                  />
                  <ResponseItem
                    label="Previously competed events"
                    value={selectedApplicant.previousEvents}
                  />
                  <ResponseItem
                    label="Science classes taken or currently taking"
                    value={selectedApplicant.scienceClasses}
                  />
                  <ResponseItem
                    label="Math classes taken or currently taking"
                    value={selectedApplicant.mathClasses}
                  />
                  <ResponseItem label="Questions" value={selectedApplicant.questions} />
                </div>

                <div className="rounded-xl border p-6 space-y-4">
                  <h2 className="font-semibold">Top 6 event choices</h2>
                  <Separator />
                  {selectedApplicant.topEvents.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedApplicant.topEvents.map((choice, i) => (
                        <div key={`${choice.eventName}-${i}`} className="rounded-lg border p-4 space-y-2">
                          <div className="text-sm font-semibold text-muted-foreground">
                            Choice #{i + 1}
                          </div>
                          <div className="text-sm font-medium">{choice.eventName || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            Partner preference: {formatPartnerPreference(choice.partnerPreference)}
                            {choice.partnerNames ? ` · ${choice.partnerNames}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No event choices available.</p>
                  )}
                </div>
              </div>
              <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                <div className="rounded-xl border p-4 space-y-4">
                  <div>
                    <div className="text-base font-semibold">{selectedApplicant.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedApplicant.email}</div>
                    {selectedApplicant.phone && (
                      <div className="text-sm text-muted-foreground">
                        {formatPhone(selectedApplicant.phone)}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2.5">
                    <InfoRow label="Grade" value={getGradeLabel(selectedApplicant)} />
                    <InfoRow label="Shirt size" value={selectedApplicant.shirtSize || "—"} />
                    <InfoRow
                      label="Type"
                      value={<ReturningBadge value={normalizeReturning(selectedApplicant)} />}
                    />
                    <InfoRow
                      label="Status"
                      value={<StatusBadge value={selectedApplicant.membershipStatus} />}
                    />
                    <InfoRow label="Submitted" value={selectedApplicant.submittedAt || "—"} />
                    {selectedApplicant.statusChangedAt && (
                      <InfoRow label="Updated" value={selectedApplicant.statusChangedAt} />
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      disabled={selectedApplicant.membershipStatus === "ACTIVE"}
                      onClick={() => openAction(selectedApplicant.id, "approve")}
                    >
                      <IconCircleCheck className="size-4" />
                      Accept
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={selectedApplicant.membershipStatus === "REMOVED"}
                      onClick={() => openAction(selectedApplicant.id, "reject")}
                    >
                      <IconBan className="size-4" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openEdit(selectedApplicant)}
                    >
                      <IconEdit className="size-4" />
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border p-4 space-y-3">
                  <div className="text-sm font-semibold">Attachments</div>
                  {selectedApplicant.focusPageFileUrl ? (
                    <a
                      href={selectedApplicant.focusPageFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline underline-offset-4"
                    >
                      {selectedApplicant.focusPageFileName || "Open attachment"}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No Broward Focus page uploaded.</p>
                  )}
                </div>
              </div>

            </div>
          ) : null}
        </div>
        <EditSheet
          target={editTarget}
          form={editForm}
          saving={editSaving}
          onChange={setEditForm}
          onClose={() => { setEditTarget(null); setEditForm(null) }}
          onSave={() => void saveEdit()}
        />
        <ReasonDialog
          action={actionTarget?.action ?? null}
          reason={actionReason}
          saving={actionSaving}
          onReasonChange={setActionReason}
          onClose={() => { setActionTarget(null); setActionReason("") }}
          onConfirm={() => void submitAction()}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4 px-4 lg:px-6">
        <PageHeader
          title="Applicants"
          description="Browse submitted applications for the active season."
        >
          <div className="w-full sm:w-[240px]">
            <Label htmlFor="search-applicants" className="sr-only">Search</Label>
            <Input
              id="search-applicants"
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
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="ACTIVE">Approved</TabsTrigger>
            <TabsTrigger value="REMOVED">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        {isMobile ? (
          <div className="space-y-2">
            {loading ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" />
                Loading applicants...
              </div>
            ) : data.length ? (
              data.map(a => {
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => void loadApplicantDetails(a.id)}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.grade && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Gr. {a.grade}
                          </span>
                        )}
                        <ReturningBadge value={normalizeReturning(a)} />
                        <StatusBadge value={a.membershipStatus} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <IconDots className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(a)}>
                            <IconEdit className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAction(a.id, "approve")}
                            disabled={a.membershipStatus === "ACTIVE"}
                          >
                            <IconCircleCheck className="size-4" /> Accept
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAction(a.id, "reject")}
                            disabled={a.membershipStatus === "REMOVED"}
                          >
                            <IconBan className="size-4" /> Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-32 flex items-center justify-center text-sm text-muted-foreground rounded-xl border">
                No applicants found.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="h-12">
                    {hg.headers.map(header => (
                      <TableHead
                        key={header.id}
                        className={
                          header.id === "submittedAt"
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
                        <span>Loading applicants...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => void loadApplicantDetails(row.original.id)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={cell.column.id === "submittedAt" ? "whitespace-nowrap px-4 py-3" : "px-4 py-3"}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                      No applicants found.
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
      <EditSheet
        target={editTarget}
        form={editForm}
        saving={editSaving}
        onChange={setEditForm}
        onClose={() => { setEditTarget(null); setEditForm(null) }}
        onSave={() => void saveEdit()}
      />
      <ReasonDialog
        action={actionTarget?.action ?? null}
        reason={actionReason}
        saving={actionSaving}
        onReasonChange={setActionReason}
        onClose={() => { setActionTarget(null); setActionReason("") }}
        onConfirm={() => void submitAction()}
      />
    </>
  )
}

function ReasonDialog({
  action,
  reason,
  saving,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  action: "approve" | "reject" | null
  reason: string
  saving: boolean
  onReasonChange: (v: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={!!action} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "approve" ? "Accept applicant" : "Reject applicant"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {action === "approve"
              ? "Provide an optional note for accepting this applicant."
              : "Provide an optional reason for rejecting this applicant."}
          </p>
          <textarea
            rows={4}
            className={textareaClassName}
            placeholder="Optional reason..."
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={action === "reject" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving && <IconLoader2 className="size-4 animate-spin" />}
            {action === "approve" ? "Accept" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditSheet({
  target,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  target: ApplicantSummary | ApplicantDetail | null
  form: EditFormState | null
  saving: boolean
  onChange: React.Dispatch<React.SetStateAction<EditFormState | null>>
  onClose: () => void
  onSave: () => void
}) {
  const setField = (field: keyof EditFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => onChange(f => f ? { ...f, [field]: e.target.value } : f)

  return (
    <Sheet open={!!target} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg gap-0">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Edit applicant</SheetTitle>
        </SheetHeader>
        {form && (
          <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ef-first">First name</FieldLabel>
                <Input id="ef-first" value={form.firstName} onChange={setField("firstName")} />
              </Field>

              <Field>
                <FieldLabel htmlFor="ef-last">Last name</FieldLabel>
                <Input id="ef-last" value={form.lastName} onChange={setField("lastName")} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="ef-email">Email</FieldLabel>
              <Input id="ef-email" type="email" value={form.email} onChange={setField("email")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ef-phone">Phone number</FieldLabel>
                <Input
                  id="ef-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(555) 555-5555"
                  value={form.phone}
                  onChange={setField("phone")}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="ef-grade">Grade level</FieldLabel>
                <Select
                  value={form.gradeLevel || undefined}
                  onValueChange={val => onChange(f => f ? { ...f, gradeLevel: val } : f)}
                >
                  <SelectTrigger id="ef-grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {["9", "10", "11", "12"].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="ef-shirt">Shirt size</FieldLabel>
              <Select
                value={form.shirtSize || undefined}
                onValueChange={val => onChange(f => f ? { ...f, shirtSize: val } : f)}
              >
                <SelectTrigger id="ef-shirt">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {["XS", "S", "M", "L", "XL"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Returning member?</FieldLabel>
              <div className="flex flex-wrap gap-4 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="ef-returning"
                    value="yes"
                    checked={form.isReturning === true}
                    onChange={() => onChange(f => f ? { ...f, isReturning: true } : f)}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="ef-returning"
                    value="no"
                    checked={form.isReturning === false}
                    onChange={() => onChange(f => f ? { ...f, isReturning: false } : f)}
                  />
                  No
                </label>
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="ef-why">
                Why do you want to join Science Olympiad?
              </FieldLabel>
              <textarea
                id="ef-why"
                rows={5}
                className={textareaClassName}
                value={form.whyJoin}
                onChange={setField("whyJoin")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ef-contrib">
                What new ideas do you have for the club, and how will you contribute
                to the club? If you were a member last year, what changes do you
                think could be made?
              </FieldLabel>
              <textarea
                id="ef-contrib"
                rows={6}
                className={textareaClassName}
                value={form.contributionIdeas}
                onChange={setField("contributionIdeas")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ef-awards">
                List both your Division B and Division C awards (if applicable) and
                mention the year, division, and whether it was attained at an
                invitational, regional, or state level
              </FieldLabel>
              <textarea
                id="ef-awards"
                rows={5}
                className={textareaClassName}
                value={form.awards}
                onChange={setField("awards")}
                placeholder="Example: 2024 Regionals 3rd in Disease Detectives (Div B.)"
              />
              <FieldDescription>Write N/A if none.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="ef-prev">
                What events have you previously competed in before?
              </FieldLabel>
              <textarea
                id="ef-prev"
                rows={4}
                className={textareaClassName}
                value={form.previousEvents}
                onChange={setField("previousEvents")}
                placeholder="List previous events"
              />
              <FieldDescription>Write N/A if none.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="ef-sci">
                What science classes have you already taken or are currently taking?
              </FieldLabel>
              <textarea
                id="ef-sci"
                rows={4}
                className={textareaClassName}
                value={form.scienceClasses}
                onChange={setField("scienceClasses")}
                placeholder="List your science classes"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ef-math">
                What math classes have you already taken or are currently taking?
              </FieldLabel>
              <textarea
                id="ef-math"
                rows={4}
                className={textareaClassName}
                value={form.mathClasses}
                onChange={setField("mathClasses")}
                placeholder="List your math classes"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ef-q">Any questions?</FieldLabel>
              <textarea
                id="ef-q"
                rows={4}
                className={textareaClassName}
                value={form.questions}
                onChange={setField("questions")}
                placeholder="Optional"
              />
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
