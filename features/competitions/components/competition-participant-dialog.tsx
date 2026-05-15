"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type RosterMemberRole = "MEMBER" | "CAPTAIN" | "ALTERNATE"

export interface CompetitionParticipantFormValues {
  memberSeasonId: string
  role: RosterMemberRole
  seatNumber: string
}

export const EMPTY_PARTICIPANT_FORM: CompetitionParticipantFormValues = {
  memberSeasonId: "",
  role: "MEMBER",
  seatNumber: "",
}

interface MemberOption {
  id: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableMembers: MemberOption[]
  loading: boolean
  onSubmit: (values: CompetitionParticipantFormValues) => void | Promise<void>
}

export function CompetitionParticipantDialog({
  open,
  onOpenChange,
  availableMembers,
  loading,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CompetitionParticipantFormValues>(EMPTY_PARTICIPANT_FORM)

  useEffect(() => {
    if (open) setForm(EMPTY_PARTICIPANT_FORM)
  }, [open])

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add Member to Assignment</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Member</Label>
            <Select
              value={form.memberSeasonId}
              onValueChange={(value) => setForm((current) => ({ ...current, memberSeasonId: value }))}
            >
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.user.firstName} {member.user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm((current) => ({ ...current, role: value as RosterMemberRole }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="CAPTAIN">Captain</SelectItem>
                  <SelectItem value="ALTERNATE">Alternate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Seat Number</Label>
              <Input
                type="number"
                min={1}
                value={form.seatNumber}
                onChange={(event) => setForm((current) => ({ ...current, seatNumber: event.target.value }))}
              />
            </div>
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={loading || !form.memberSeasonId}>
            Add Member
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
