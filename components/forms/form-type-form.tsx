"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const CATEGORIES = [
  "WAIVER", "MEDICAL", "PERMISSION", "CODE_OF_CONDUCT",
  "TRAVEL", "PHOTO_RELEASE", "CLUB_CONTRACT", "OTHER"
] as const

interface FormTypeFormProps {
  onSubmit: (data: {
    name: string
    category: string
    description: string
    isRequired: boolean
    requiresUpload: boolean
    dueAt: string
  }) => void
  loading: boolean
  onCancel: () => void
}

export function FormTypeForm({ onSubmit, loading, onCancel }: FormTypeFormProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("OTHER")
  const [description, setDescription] = useState("")
  const [isRequired, setIsRequired] = useState(true)
  const [requiresUpload, setRequiresUpload] = useState(false)
  const [dueAt, setDueAt] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ name, category, description, isRequired, requiresUpload, dueAt })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          placeholder="Parent Permission Slip"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Due Date (optional)</Label>
        <Input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch id="required" checked={isRequired} onCheckedChange={setIsRequired} />
          <Label htmlFor="required">Required form</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="upload" checked={requiresUpload} onCheckedChange={setRequiresUpload} />
          <Label htmlFor="upload">Requires file upload</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !name}>{loading ? "Creating..." : "Create"}</Button>
      </DialogFooter>
    </form>
  )
}
