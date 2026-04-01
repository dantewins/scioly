"use client"

import {
  flexRender,
  type Table as ReactTable,
} from "@tanstack/react-table"
import { cn } from "@/lib/utils"

interface DataTableProps<T> {
  table: ReactTable<T>
  className?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({ table, className, onRowClick }: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border">
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-9 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No results.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border transition-colors last:border-0",
                  onRowClick && "cursor-pointer hover:bg-muted/40",
                )}
                style={{ height: "var(--row-h)" }}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 align-middle whitespace-nowrap text-foreground">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
