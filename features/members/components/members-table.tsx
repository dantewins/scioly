"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { IconSearch, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableShell,
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

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ALUMNI", "REMOVED"] as const
type StatusFilter = (typeof STATUS_OPTIONS)[number] | "ALL"

export function MembersTable({ members }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE")
  const [gradeFilter, setGradeFilter] = useState<number | "ALL">("ALL")
  const [roleFilter, setRoleFilter] = useState<string | "ALL">("ALL")

  // Unique sorted lists for the dropdown chips
  const allRoles = useMemo(() => {
    const set = new Set<string>()
    for (const m of members) for (const r of m.roles) set.add(r.clubRole.name)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [members])

  const allGrades = useMemo(() => {
    const set = new Set<number>()
    for (const m of members) if (m.user.gradeLevel != null) set.add(m.user.gradeLevel)
    return [...set].sort((a, b) => a - b)
  }, [members])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      if (statusFilter !== "ALL" && m.membershipStatus !== statusFilter) return false
      if (gradeFilter !== "ALL" && m.user.gradeLevel !== gradeFilter) return false
      if (roleFilter !== "ALL" && !m.roles.some((r) => r.clubRole.name === roleFilter)) return false
      if (q) {
        const hay = `${m.user.firstName} ${m.user.lastName} ${m.user.email}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [members, search, statusFilter, gradeFilter, roleFilter])

  const hasActiveFilters = search || statusFilter !== "ACTIVE" || gradeFilter !== "ALL" || roleFilter !== "ALL"

  function clearAll() {
    setSearch("")
    setStatusFilter("ACTIVE")
    setGradeFilter("ALL")
    setRoleFilter("ALL")
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <IconSearch className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="pl-8"
          />
        </div>

        <FilterChipGroup
          label="Status"
          value={statusFilter}
          options={[
            { value: "ALL", label: "All" },
            ...STATUS_OPTIONS.map((s) => ({ value: s, label: titleCase(s) })),
          ]}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        />

        {allGrades.length > 0 && (
          <FilterChipGroup
            label="Grade"
            value={gradeFilter === "ALL" ? "ALL" : String(gradeFilter)}
            options={[
              { value: "ALL", label: "All" },
              ...allGrades.map((g) => ({ value: String(g), label: String(g) })),
            ]}
            onChange={(v) => setGradeFilter(v === "ALL" ? "ALL" : Number(v))}
          />
        )}

        {allRoles.length > 0 && (
          <FilterChipGroup
            label="Role"
            value={roleFilter}
            options={[
              { value: "ALL", label: "All" },
              ...allRoles.map((r) => ({ value: r, label: r })),
            ]}
            onChange={setRoleFilter}
          />
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="ml-auto">
            <IconX className="mr-1 size-3.5" />
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {members.length} {members.length === 1 ? "member" : "members"}
      </p>

      {/* Mobile: card list */}
      <ul className="space-y-2 md:hidden">
        {filtered.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            No members match the current filters.
          </li>
        ) : (
          filtered.map((member) => (
            <li
              key={member.id}
              className="rounded-[var(--radius)] border border-border/80 bg-card shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)]"
            >
              <Link
                href={`/dashboard/members/${member.user.id}`}
                className="block px-3 py-3 transition-colors hover:bg-azure-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base leading-tight tracking-tight">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">{member.user.email}</p>
                  </div>
                  <StatusBadge status={member.membershipStatus} withDot />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    Grade {member.user.gradeLevel ?? "—"}
                  </span>
                  {member.roles.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {member.roles.map((role) => (
                        <Badge key={role.clubRole.id} variant="tonal" className="text-[10px] font-normal">
                          {role.clubRole.name}
                        </Badge>
                      ))}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      {/* Desktop: table */}
      <TableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No members match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Link href={`/dashboard/members/${member.user.id}`} className="font-serif text-base leading-tight tracking-tight hover:text-azure-700">
                      {member.user.firstName} {member.user.lastName}
                    </Link>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{member.user.email}</p>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-foreground/80">{member.user.gradeLevel ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        member.roles.map((role) => (
                          <Badge key={role.clubRole.id} variant="tonal" className="text-[10px] font-normal">
                            {role.clubRole.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={member.membershipStatus} withDot />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs" asChild>
                      <Link href={`/dashboard/members/${member.user.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  )
}

function FilterChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              value === opt.value
                ? "rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground transition-colors"
                : "rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}
