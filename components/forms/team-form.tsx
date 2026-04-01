"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface TeamFormProps {
  competitions: { id: string; name: string }[]
  events: { id: string; name: string; code: string | null }[]
  onSubmit: (data: {
    label: string
    competitionId: string
    eventId: string
  }) => void
  loading: boolean
  onCancel: () => void
}

export function TeamForm({ competitions, events, onSubmit, loading, onCancel }: TeamFormProps) {
  const [label, setLabel] = useState("")
  const [competitionId, setCompetitionId] = useState("")
  const [eventId, setEventId] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ label, competitionId, eventId })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Team Label</Label>
        <Input
          placeholder="e.g. Anatomy A"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      {competitions.length > 0 && (
        <div className="space-y-1.5">
          <Label>Competition (optional)</Label>
          <Select value={competitionId} onValueChange={setCompetitionId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {competitions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {events.length > 0 && (
        <div className="space-y-1.5">
          <Label>Event (optional)</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !label}>{loading ? "Creating..." : "Create"}</Button>
      </DialogFooter>
    </form>
  )
}
