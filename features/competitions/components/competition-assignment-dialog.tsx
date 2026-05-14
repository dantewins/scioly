"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export type CompetitionEntryStatus = "PLANNED" | "CONFIRMED" | "FINALIZED" | "DROPPED"

export interface CompetitionAssignmentFormValues {
  eventId: string
  slotId: string
  room: string
  block: string
  entryLabel: string
  status: CompetitionEntryStatus
  notes: string
}

export const EMPTY_ASSIGNMENT_FORM: CompetitionAssignmentFormValues = {
  eventId: "",
  slotId: "__none",
  room: "",
  block: "",
  entryLabel: "",
  status: "PLANNED",
  notes: "",
}

interface EventOption {
  id: string
  name: string
  code: string | null
}

interface SlotOption {
  id: string
  eventId: string | null
  label: string
  room: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: CompetitionAssignmentFormValues
  isEditing: boolean
  events: EventOption[]
  slots: SlotOption[]
  loading: boolean
  onSubmit: (values: CompetitionAssignmentFormValues) => void | Promise<void>
}

export function CompetitionAssignmentDialog({
  open,
  onOpenChange,
  initial,
  isEditing,
  events,
  slots,
  loading,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CompetitionAssignmentFormValues>(initial ?? EMPTY_ASSIGNMENT_FORM)

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_ASSIGNMENT_FORM)
  }, [open, initial])

  const availableSlots = useMemo(() => {
    if (!form.eventId) return slots
    return slots.filter((slot) => !slot.eventId || slot.eventId === form.eventId)
  }, [form.eventId, slots])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event Assignment" : "Add Event Assignment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Event</Label>
            <Select
              value={form.eventId}
              onValueChange={(value) => setForm((current) => ({ ...current, eventId: value }))}
            >
              <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Slot</Label>
              <Select
                value={form.slotId}
                onValueChange={(value) => setForm((current) => ({ ...current, slotId: value }))}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.label}{slot.room ? ` · ${slot.room}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((current) => ({ ...current, status: value as CompetitionEntryStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="FINALIZED">Finalized</SelectItem>
                  <SelectItem value="DROPPED">Dropped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Room Override</Label>
              <Input
                value={form.room}
                onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Label / Block</Label>
              <Input
                value={form.block}
                onChange={(event) => setForm((current) => ({ ...current, block: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Entry Label</Label>
            <Input
              value={form.entryLabel}
              onChange={(event) => setForm((current) => ({ ...current, entryLabel: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={loading}>
            {isEditing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
