"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SeasonFormProps {
  onSubmit: (data: {
    name: string
    schoolYear: string
    startsAt: string
    endsAt: string
  }) => void
  loading: boolean
  onCancel: () => void
}

export function SeasonForm({ onSubmit, loading, onCancel }: SeasonFormProps) {
  const [name, setName] = useState("")
  const [schoolYear, setSchoolYear] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({ name, schoolYear, startsAt, endsAt })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Season Name</Label>
        <Input
          placeholder="2026 competition season"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>School Year</Label>
        <Input
          placeholder="2025-2026"
          value={schoolYear}
          onChange={(e) => setSchoolYear(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
      </DialogFooter>
    </form>
  )
}
