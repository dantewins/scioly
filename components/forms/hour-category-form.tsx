"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface HourCategoryFormProps {
  onSubmit: (data: {
    name: string
    description: string
    requiredHours: string
    requiresApproval: boolean
  }) => void
  loading: boolean
  onCancel: () => void
}

export function HourCategoryForm({ onSubmit, loading, onCancel }: HourCategoryFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [requiredHours, setRequiredHours] = useState("")
  const [requiresApproval, setRequiresApproval] = useState(true)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ name, description, requiredHours, requiresApproval })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Study Sessions"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Required Hours (optional)</Label>
        <Input
          type="number"
          min={0}
          step={0.5}
          value={requiredHours}
          onChange={(e) => setRequiredHours(e.target.value)}
          placeholder="e.g. 20"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="req-approval" checked={requiresApproval} onCheckedChange={setRequiresApproval} />
        <Label htmlFor="req-approval">Requires admin approval</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !name}>{loading ? "Creating..." : "Create"}</Button>
      </DialogFooter>
    </form>
  )
}
