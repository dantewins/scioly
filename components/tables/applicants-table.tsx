"use client"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconCheck,
  IconX,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const schema = z.object({
  id: z.number(),
  name: z.string(),
  grade: z.string(),
  school: z.string(),
  email: z.string(),
  phone: z.string(),
  appliedFor: z.string(),
  status: z.enum(["Pending", "Accepted", "Rejected"]),
})

type Applicant = z.infer<typeof schema>

function StatusBadge({ status }: { status: Applicant["status"] }) {
  if (status === "Accepted") {
    return <Badge className="bg-green-600 hover:bg-green-600">Accepted</Badge>
  }

  if (status === "Rejected") {
    return <Badge variant="destructive">Rejected</Badge>
  }

  return <Badge variant="secondary">Pending</Badge>
}

export function ApplicantsTable({
  data: initialData,
}: {
  data: Applicant[]
}) {
  const [data, setData] = React.useState<Applicant[]>(initialData)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const updateApplicantStatus = React.useCallback(
    (id: number, status: Applicant["status"]) => {
      setData((prev) =>
        prev.map((applicant) =>
          applicant.id === id ? { ...applicant, status } : applicant
        )
      )

      const applicant = data.find((item) => item.id === id)
      toast.success(
        `${applicant?.name ?? "Applicant"} was ${status.toLowerCase()}.`
      )
    },
    [data]
  )

  const columns = React.useMemo<ColumnDef<Applicant>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="min-w-[180px]">
            <div className="font-medium">{row.original.name}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "grade",
        header: "Grade",
        cell: ({ row }) => <div>{row.original.grade}</div>,
      },
      {
        accessorKey: "school",
        header: "School",
        cell: ({ row }) => (
          <div className="max-w-[180px] truncate">{row.original.school}</div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => <div>{row.original.phone}</div>,
      },
      {
        accessorKey: "appliedFor",
        header: "Applied For",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.appliedFor}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <IconDotsVertical className="size-4" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => updateApplicantStatus(row.original.id, "Accepted")}
              >
                <IconCheck className="mr-2 size-4" />
                Accept
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateApplicantStatus(row.original.id, "Rejected")}
              >
                <IconX className="mr-2 size-4" />
                Reject
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => updateApplicantStatus(row.original.id, "Pending")}
              >
                Set to Pending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [updateApplicantStatus]
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

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[260px]">
            <Label htmlFor="search-applicants" className="sr-only">
              Search applicants
            </Label>
            <Input
              id="search-applicants"
              placeholder="Search by name..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(e) =>
                table.getColumn("name")?.setFilterValue(e.target.value)
              }
            />
          </div>

          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) || "all"}
            onValueChange={(value) =>
              table
                .getColumn("status")
                ?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} applicant(s)
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
            {table.getRowModel().rows.length ? (
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
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
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