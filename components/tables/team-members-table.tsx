"use client"

import { IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface TeamAssignment {
  id: string
  role: string
  seatNumber: number | null
  memberSeason: {
    id: string
    user: { id: string; firstName: string; lastName: string; email: string }
  }
}

const ROLE_COLORS: Record<string, string> = {
  CAPTAIN: "bg-amber-100 text-amber-800",
  ALTERNATE: "bg-blue-100 text-blue-800",
  MEMBER: "",
}

interface Props {
  assignments: TeamAssignment[]
  canManage: boolean
  onRemove: (memberSeasonId: string) => void
}

export function TeamMembersTable({ assignments, canManage, onRemove }: Props) {
  return (
    <div className="overflow-x-auto">
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Name</th>
            <th className="text-left px-4 py-2 font-medium">Role</th>
            {canManage && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {assignments.length === 0 ? (
            <tr>
              <td
                colSpan={canManage ? 3 : 2}
                className="px-4 py-6 text-center text-muted-foreground text-sm"
              >
                No members assigned yet.
              </td>
            </tr>
          ) : (
            assignments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">
                  {a.memberSeason.user.firstName} {a.memberSeason.user.lastName}
                </td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[a.role] ?? ""}`}>
                    {a.role}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onRemove(a.memberSeason.id)}
                    >
                      <IconTrash className="size-3.5 text-destructive" />
                    </Button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  )
}
