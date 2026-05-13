"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
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

export function MembersTable({ members }: Props) {
  return (
    <TableShell>
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
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No members found.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
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
  )
}
