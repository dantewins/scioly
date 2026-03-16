"use client"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconDotsVertical,
  IconMail,
  IconPhone,
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

export const schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  grade: z.string(),
  phone: z.string(),
  returning: z.enum(["Returning", "New"]),
})

type Applicant = z.infer<typeof schema>

function ReturningBadge({ value }: { value: Applicant["returning"] }) {
  if (value === "Returning") {
    return <Badge variant="outline">Returning</Badge>
  }

  return <Badge variant="secondary">New</Badge>
}

export function ApplicantsTable() {
  const [data, setData] = React.useState<Applicant[]>([])
  const [loading, setLoading] = React.useState(true)
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
      const parsed = z.array(schema).parse(json)

      setData(parsed)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load applicants.")
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadApplicants()
  }, [loadApplicants])

  const columns = React.useMemo<ColumnDef<Applicant>[]>(
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
        cell: ({ row }) => <div>{row.original.grade}</div>,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => <div>{row.original.phone || "—"}</div>,
      },
      {
        accessorKey: "returning",
        header: "Returning / New",
        cell: ({ row }) => <ReturningBadge value={row.original.returning} />,
      },
      {
        id: "actions",
        header: () => <div className="text-center">Actions</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
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
                  <IconCopy className="mr-2 size-4" />
                  Copy email
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    copyToClipboard(row.original.phone || "", "Phone number")
                  }
                  disabled={!row.original.phone}
                >
                  <IconPhone className="mr-2 size-4" />
                  Copy phone
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = `mailto:${row.original.email}`
                  }}
                >
                  <IconMail className="mr-2 size-4" />
                  Email applicant
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
  const currentPage = pageCount === 0 ? 0 : table.getState().pagination.pageIndex + 1

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-[320px]">
          <Label htmlFor="search-applicants" className="sr-only">
            Search applicants
          </Label>
          <Input
            id="search-applicants"
            placeholder="Search by name or email..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("name")?.setFilterValue(e.target.value)
            }
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {loading ? "Loading applicants..." : `${table.getFilteredRowModel().rows.length} applicant(s)`}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  Loading applicants...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
    </div>
  )
}