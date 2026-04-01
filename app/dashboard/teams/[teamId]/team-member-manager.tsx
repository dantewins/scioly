"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Assignment {
  id: string
  role: string
  seatNumber: number | null
  memberSeason: {
    id: string
    user: { id: string; firstName: string; lastName: string; email: string }
  }
}

interface MemberOption {
  id: string
  user: { id: string; firstName: string; lastName: string }
}

interface Props {
  teamId: string
  assignments: Assignment[]
  allMembers: MemberOption[]
  canManage: boolean
}

const ROLE_COLORS: Record<string, string> = {
  CAPTAIN: "bg-amber-100 text-amber-800",
  ALTERNATE: "bg-blue-100 text-blue-800",
  MEMBER: "",
}

export function TeamMemberManager({ teamId, assignments: initial, allMembers, canManage }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ memberSeasonId: "", role: "MEMBER" })

  const assignedIds = new Set(assignments.map((a) => a.memberSeason.id))
  const availableMembers = allMembers.filter((m) => !assignedIds.has(m.id))

  async function handleAdd() {
    if (!form.memberSeasonId) { toast.error("Select a member."); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberSeasonId: form.memberSeasonId, role: form.role }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.message ?? "Failed to add member.")
        return
      }
      // Find the member to display
      const ms = allMembers.find((m) => m.id === form.memberSeasonId)
      if (ms) {
        setAssignments((a) => [...a, {
          id: `${teamId}-${form.memberSeasonId}`,
          role: form.role,
          seatNumber: null,
          memberSeason: { id: form.memberSeasonId, user: { ...ms.user, email: "" } },
        }])
      }
      setShowAdd(false)
      setForm({ memberSeasonId: "", role: "MEMBER" })
      toast.success("Member added to team.")
    } finally { setLoading(false) }
  }

  async function handleRemove(memberSeasonId: string) {
    if (!confirm("Remove this member from the team?")) return
    const res = await fetch(`/api/admin/teams/${teamId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberSeasonId }),
    })
    if (!res.ok) { toast.error("Failed to remove member."); return }
    setAssignments((a) => a.filter((x) => x.memberSeason.id !== memberSeasonId))
    toast.success("Member removed from team.")
  }

  return (
    <div className="space-y-4">
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
                <td colSpan={canManage ? 3 : 2} className="px-4 py-6 text-center text-muted-foreground text-sm">
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
                        onClick={() => handleRemove(a.memberSeason.id)}
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

      {canManage && (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
          <IconPlus className="size-4 mr-1.5" />Add Member
        </Button>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Member to Team</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Member</Label>
              <Select value={form.memberSeasonId} onValueChange={(v) => setForm(f => ({ ...f, memberSeasonId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {availableMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.user.firstName} {m.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="CAPTAIN">Captain</SelectItem>
                  <SelectItem value="ALTERNATE">Alternate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={loading || !form.memberSeasonId}>
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
