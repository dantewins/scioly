"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface LogHoursFormProps {
  categories: { id: string; name: string; proofInstructions: string | null }[]
  onSubmit: (data: {
    categoryId: string
    title: string
    description: string
    totalHours: string
    proofUrl: string
  }) => void
  loading: boolean
  onCancel: () => void
}

export function LogHoursForm({ categories, onSubmit, loading, onCancel }: LogHoursFormProps) {
  const [categoryId, setCategoryId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [totalHours, setTotalHours] = useState("")
  const [proofUrl, setProofUrl] = useState("")

  const selectedCategory = categories.find((c) => c.id === categoryId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ categoryId, title, description, totalHours, proofUrl })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedCategory?.proofInstructions && (
          <p className="text-xs text-muted-foreground">{selectedCategory.proofInstructions}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What did you do?"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Hours</Label>
        <Input
          type="number"
          min={0.25}
          max={24}
          step={0.25}
          value={totalHours}
          onChange={(e) => setTotalHours(e.target.value)}
          placeholder="1.5"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Proof URL (optional)</Label>
        <Input
          type="url"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit"}</Button>
      </DialogFooter>
    </form>
  )
}
