"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { TeamMembersTable, type TeamAssignment } from "@/components/tables/team-members-table"

type Assignment = TeamAssignment

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
      <TeamMembersTable
        assignments={assignments}
        canManage={canManage}
        onRemove={handleRemove}
      />

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
