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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface CompetitionRosterFormValues {
  label: string
  division: string
  seasonRosterId: string
  notes: string
}

export const EMPTY_ROSTER_FORM: CompetitionRosterFormValues = {
  label: "",
  division: "__none",
  seasonRosterId: "__none",
  notes: "",
}

interface SeasonRosterOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: CompetitionRosterFormValues
  isEditing: boolean
  seasonRosters: SeasonRosterOption[]
  loading: boolean
  onSubmit: (values: CompetitionRosterFormValues) => void | Promise<void>
}

export function CompetitionRosterDialog({
  open,
  onOpenChange,
  initial,
  isEditing,
  seasonRosters,
  loading,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CompetitionRosterFormValues>(initial ?? EMPTY_ROSTER_FORM)

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_ROSTER_FORM)
  }, [open, initial])

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? "Edit Roster" : "New Roster"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Roster Label</Label>
            <Input
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Division</Label>
              <Select
                value={form.division}
                onValueChange={(value) => setForm((current) => ({ ...current, division: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Default</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Base Season Roster</Label>
              <Select
                value={form.seasonRosterId}
                onValueChange={(value) => setForm((current) => ({ ...current, seasonRosterId: value }))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {seasonRosters.map((roster) => (
                    <SelectItem key={roster.id} value={roster.id}>{roster.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={4}
            />
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={loading}>
            {isEditing ? "Save" : "Create"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
