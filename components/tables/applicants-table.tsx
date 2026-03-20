"use client"

import * as React from "react"
import {
  IconArrowLeft,
  IconDotsVertical,
  IconLoader2,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconCircleCheck,
  IconBan
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const summarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  grade: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  returning: z.enum(["Returning", "New"]).optional(),
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

function ReturningBadge({
  value,
}: {
  value: "Returning" | "New" | undefined
}) {
  if (value === "Returning") {
    return <Badge variant="outline">Returning</Badge>
  }

  return <Badge variant="secondary">New</Badge>
}

function normalizeReturningStatus(applicant: ApplicantDetail | ApplicantSummary) {
  if ("returning" in applicant && applicant.returning) return applicant.returning

  if ("isReturning" in applicant) {
    const value = applicant.isReturning

    if (
      value === true ||
      value === "true" ||
      value === "yes" ||
      value === "Returning"
    ) {
      return "Returning" as const
    }
  }

  return "New" as const
}

function getGradeLabel(applicant: ApplicantDetail | ApplicantSummary) {
  if ("gradeLevel" in applicant && applicant.gradeLevel) {
    return applicant.gradeLevel
  }

  return applicant.grade || "—"
}

function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "")

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  return phone || "—"
}

function formatPartnerPreference(value: string | undefined) {
  if (!value) return "NA"
  if (value.toUpperCase() === "NA") return "NA"

  const lower = value.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium whitespace-pre-wrap break-words">
        {value || "—"}
      </div>
    </div>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  )
}

export function ApplicantsTable() {
  const [data, setData] = React.useState<ApplicantSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [detailsLoading, setDetailsLoading] = React.useState(false)
  const [selectedApplicant, setSelectedApplicant] =
    React.useState<ApplicantDetail | null>(null)

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const copyToClipboard = React.useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value)
        toast.success(`${label} copied.`)
      } catch {
        toast.error(`Failed to copy ${label.toLowerCase()}.`)
      }
    },
    []
  )

  const loadApplicants = React.useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch("/api/admin/applicants", {
        method: "GET",
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Failed to fetch applicants.")
      }

      const json = await res.json()
      const parsed = z.array(summarySchema).parse(json)

      setData(parsed)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load applicants.")
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadApplicantDetails = React.useCallback(async (id: string) => {
    setDetailsLoading(true)

    try {
      const res = await fetch(`/api/admin/applicants?id=${id}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Failed to fetch applicant details.")
      }

      const json = await res.json()
      const parsed = detailSchema.parse(json)

      setSelectedApplicant(parsed)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load applicant details.")
      setSelectedApplicant(null)
    } finally {
      setDetailsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadApplicants()
  }, [loadApplicants])

  const columns = React.useMemo<ColumnDef<ApplicantSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        filterFn: (row, _columnId, filterValue) => {
          const search = String(filterValue ?? "").toLowerCase().trim()

          if (!search) return true

          return (
            row.original.name.toLowerCase().includes(search) ||
            row.original.email.toLowerCase().includes(search)
          )
        },
        cell: ({ row }) => (
          <div className="min-w-[180px] font-medium">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="max-w-[240px] truncate text-sm">
            {row.original.email}
          </div>
        ),
      },
      {
        accessorKey: "grade",
        header: "Grade",
        cell: ({ row }) => <div>{getGradeLabel(row.original)}</div>,
      },
      {
        accessorKey: "phone",
        header: "Phone number",
        cell: ({ row }) => (
          <div>{formatPhoneNumber(row.original.phone || "")}</div>
        ),
      },
      {
        accessorKey: "returning",
        header: "Member status",
        cell: ({ row }) => (
          <ReturningBadge value={normalizeReturningStatus(row.original)} />
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-center">Actions</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div
            className="flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <IconDotsVertical className="size-4" />
                  <span className="sr-only">Open actions</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    copyToClipboard(row.original.email, "Email address")
                  }
                >
                  <IconEdit className="size-4" />
                  Edit
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    copyToClipboard(
                      formatPhoneNumber(row.original.phone || ""),
                      "Phone number"
                    )
                  }
                  disabled={!row.original.phone}
                >
                  <IconCircleCheck className="size-4" />
                  Accept
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = `mailto:${row.original.email}`
                  }}
                >
                  <IconBan className="size-4" />
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [copyToClipboard]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      pagination,
    },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageCount = table.getPageCount()
  const currentPage =
    pageCount === 0 ? 0 : table.getState().pagination.pageIndex + 1

  const showingDetails = detailsLoading || !!selectedApplicant

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {showingDetails
                ? "Application details"
                : "Applicants"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {showingDetails
                ? "Review the full application and event preferences."
                : "Browse submitted applications for the active season."}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {showingDetails ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedApplicant(null)}
                className="w-full sm:w-auto"
              >
                <IconArrowLeft className="size-4" />
                Back to applicants
              </Button>
            ) : (
              <>
                <div className="w-full sm:w-[200px] lg:w-[320px]">
                  <Label htmlFor="search-applicants" className="sr-only">
                    Search applicants
                  </Label>
                  <Input
                    id="search-applicants"
                    placeholder="Search..."
                    value={
                      (table.getColumn("name")?.getFilterValue() as string) ?? ""
                    }
                    onChange={(e) =>
                      table.getColumn("name")?.setFilterValue(e.target.value)
                    }
                    className="bg-background"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showingDetails ? (
        detailsLoading ? (
          <div className="rounded-lg border p-10">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              Loading full application...
            </div>
          </div>
        ) : selectedApplicant ? (
          <div className="space-y-4">
            <DetailSection title="Basic information">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Name" value={selectedApplicant.name} />
                <DetailItem label="Applicant ID" value={selectedApplicant.id} />
                <DetailItem
                  label="Grade level"
                  value={getGradeLabel(selectedApplicant)}
                />
                <DetailItem
                  label="Shirt size"
                  value={selectedApplicant.shirtSize || "—"}
                />
                <DetailItem label="Email" value={selectedApplicant.email} />
                <DetailItem
                  label="Phone"
                  value={formatPhoneNumber(selectedApplicant.phone || "")}
                />
                <DetailItem
                  label="Member status"
                  value={
                    <ReturningBadge
                      value={normalizeReturningStatus(selectedApplicant)}
                    />
                  }
                />
                <DetailItem
                  label="Submitted"
                  value={selectedApplicant.submittedAt || "—"}
                />
              </div>
            </DetailSection>

            <DetailSection title="Written responses">
              <div className="space-y-4">
                <DetailItem
                  label="Why do you want to join Science Olympiad?"
                  value={selectedApplicant.whyJoin || "—"}
                />
                <DetailItem
                  label="What new ideas do you have for the club, and how will you contribute?"
                  value={selectedApplicant.contributionIdeas || "—"}
                />
                <DetailItem
                  label="List both your Division B and Division C awards"
                  value={selectedApplicant.awards || "—"}
                />
                <DetailItem
                  label="What events have you previously competed in before?"
                  value={selectedApplicant.previousEvents || "—"}
                />
                <DetailItem
                  label="What science classes have you already taken or are currently taking?"
                  value={selectedApplicant.scienceClasses || "—"}
                />
                <DetailItem
                  label="What math classes have you already taken or are currently taking?"
                  value={selectedApplicant.mathClasses || "—"}
                />
                <DetailItem
                  label="Any questions?"
                  value={selectedApplicant.questions || "—"}
                />
              </div>
            </DetailSection>

            <DetailSection title="Top 6 event choices">
              {selectedApplicant.topEvents.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {selectedApplicant.topEvents.map((choice, index) => (
                    <div
                      key={`${choice.eventName}-${index}`}
                      className="rounded-md border p-4"
                    >
                      <div className="mb-3 text-base font-semibold">
                        Choice #{index + 1}
                      </div>

                      <div className="space-y-3">
                        <DetailItem
                          label="Event"
                          value={choice.eventName || "—"}
                        />
                        <DetailItem
                          label="Partner preference"
                          value={formatPartnerPreference(
                            choice.partnerPreference
                          )}
                        />
                        <DetailItem
                          label="Partner name(s)"
                          value={choice.partnerNames || "—"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No event choices available.
                </p>
              )}
            </DetailSection>

            <DetailSection title="Attachments">
              {selectedApplicant.focusPageFileUrl ? (
                <div className="space-y-2">
                  <DetailItem
                    label="Broward Focus page"
                    value={
                      <a
                        href={selectedApplicant.focusPageFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        {selectedApplicant.focusPageFileName ||
                          "Open attachment"}
                      </a>
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No uploaded Broward Focus page found.
                </p>
              )}
            </DetailSection>
          </div>
        ) : null
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="font-semibold text-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <IconLoader2 className="size-4 animate-spin" />
                        <span>Loading applicants...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => void loadApplicantDetails(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No applicants found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {pageCount}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}