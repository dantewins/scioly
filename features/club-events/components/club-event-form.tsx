"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ResponsiveDialogFooter } from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

type ClubEventType =
  | "MEETING"
  | "SUPER_SATURDAY"
  | "FUNDRAISER"
  | "WORKSHOP"
  | "FIELD_TRIP"
  | "OTHER"

interface FormState {
  name: string
  type: ClubEventType
  location: string
  startsAt: string
  endsAt: string
  hoursValue: string
  categoryId: string
  notes: string
}

const TYPE_LABELS: Record<ClubEventType, string> = {
  MEETING: "Meeting",
  SUPER_SATURDAY: "Super Saturday",
  FUNDRAISER: "Fundraiser",
  WORKSHOP: "Workshop",
  FIELD_TRIP: "Field Trip",
  OTHER: "Other",
}

interface ClubEventFormProps {
  categories: { id: string; name: string }[]
  defaultValues?: Partial<FormState>
  onSubmit: (data: FormState) => void
  loading: boolean
  onCancel: () => void
  submitLabel?: string
}

export function ClubEventForm({
  categories,
  defaultValues,
  onSubmit,
  loading,
  onCancel,
  submitLabel = "Create",
}: ClubEventFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? "")
  const [type, setType] = useState<ClubEventType>(defaultValues?.type ?? "MEETING")
  const [location, setLocation] = useState(defaultValues?.location ?? "")
  const [startsAt, setStartsAt] = useState(defaultValues?.startsAt ?? "")
  const [endsAt, setEndsAt] = useState(defaultValues?.endsAt ?? "")
  const [hoursValue, setHoursValue] = useState(defaultValues?.hoursValue ?? "0")
  const [categoryId, setCategoryId] = useState(defaultValues?.categoryId ?? "")
  const [notes, setNotes] = useState(defaultValues?.notes ?? "")

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({ name, type, location, startsAt, endsAt, hoursValue, categoryId, notes })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name <span className="text-destructive">*</span></Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Saturday build lab"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ClubEventType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as ClubEventType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Room 204 or Robotics Lab"
        />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Start Time <span className="text-destructive">*</span></Label>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>End Time</Label>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Hours Value</Label>
          <Input
            type="number"
            min={0}
            max={24}
            step={0.25}
            value={hoursValue}
            onChange={(e) => setHoursValue(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Hour Category</Label>
          <Select
            value={categoryId || "__none"}
            onValueChange={(v) => setCategoryId(v === "__none" ? "" : v)}
          >
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add agenda details, what to bring, or attendance notes."
          rows={2}
        />
      </div>
      <ResponsiveDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{submitLabel}</Button>
      </ResponsiveDialogFooter>
    </form>
  )
}
