"use client"

import Link from "next/link"
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
  return (
    <div className="overflow-x-auto">
      <div className="overflow-hidden rounded-[var(--radius)] border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
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
                    <div>
                      <Link href={`/dashboard/members/${member.user.id}`} className="font-medium hover:underline">
                        {member.user.firstName} {member.user.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{member.user.gradeLevel ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        member.roles.map((role) => (
                          <Badge key={role.clubRole.id} variant="secondary" className="text-xs font-normal">
                            {role.clubRole.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[member.membershipStatus] ?? ""}
                    >
                      {member.membershipStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="xs" asChild>
                      <Link href={`/dashboard/members/${member.user.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
