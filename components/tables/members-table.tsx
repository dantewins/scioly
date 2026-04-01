"use client"

import Link from "next/link"
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type Member = {
  id: string
  membershipStatus: string
  user: { id: string; firstName: string; lastName: string; email: string; gradeLevel: number | null; role: string }
  roles: { clubRole: { id: string; name: string } }[]
}

interface Props {
  members: Member[]
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-yellow-100 text-yellow-800",
  ALUMNI: "bg-blue-100 text-blue-800",
  REMOVED: "bg-red-100 text-red-800",
  PENDING: "bg-gray-100 text-gray-800",
}

export function MembersTable({ members }: Props) {
  const columns: ColumnDef<Member>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <Link href={`/dashboard/members/${row.original.user.id}`} className="font-medium hover:underline">
            {row.original.user.firstName} {row.original.user.lastName}
          </Link>
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
      id: "roles",
      header: "Roles",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length === 0
            ? <span className="text-xs text-muted-foreground">—</span>
            : row.original.roles.map((r) => (
                <Badge key={r.clubRole.id} variant="secondary" className="text-xs font-normal">
                  {r.clubRole.name}
                </Badge>
              ))
          }
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={STATUS_COLORS[row.original.membershipStatus] ?? ""}
        >
          {row.original.membershipStatus}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild className="h-7">
          <Link href={`/dashboard/members/${row.original.user.id}`}>View</Link>
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
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
                No members found.
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
  )
}
