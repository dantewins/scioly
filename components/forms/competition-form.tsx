"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const TYPES = ["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"] as const

const TYPE_LABELS: Record<(typeof TYPES)[number], string> = {
  PRACTICE: "Practice",
  INVITATIONAL: "Invitational",
  REGIONAL: "Regional",
  STATE: "State",
  NATIONAL: "National",
  OTHER: "Other",
}

interface CompetitionFormProps {
  onSubmit: (data: {
    name: string
    type: string
    location: string
    startsAt: string
    endsAt: string
  }) => void
  loading: boolean
  onCancel: () => void
}

export function CompetitionForm({ onSubmit, loading, onCancel }: CompetitionFormProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("INVITATIONAL")
  const [location, setLocation] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({ name, type, location, startsAt, endsAt })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          placeholder="Spring Invitational 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Location (optional)</Label>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>End Date (optional)</Label>
          <Input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !name}>{loading ? "Creating..." : "Create"}</Button>
      </DialogFooter>
    </form>
  )
}
