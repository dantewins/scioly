"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ResponsiveDialogFooter } from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface InvoiceFormProps {
  members: { id: string; user: { id: string; firstName: string; lastName: string } }[]
  onSubmit: (data: {
    memberSeasonId: string
    title: string
    amountDollars: string
    dueAt: string
  }) => void
  loading: boolean
  onCancel: () => void
}

export function InvoiceForm({ members, onSubmit, loading, onCancel }: InvoiceFormProps) {
  const [memberSeasonId, setMemberSeasonId] = useState("")
  const [title, setTitle] = useState("")
  const [amountDollars, setAmountDollars] = useState("")
  const [dueAt, setDueAt] = useState("")

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    onSubmit({ memberSeasonId, title, amountDollars, dueAt })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Member</Label>
        <Select value={memberSeasonId} onValueChange={setMemberSeasonId}>
          <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.user.firstName} {m.user.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Invoice Title</Label>
        <Input
          placeholder="2025-2026 membership dues"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Amount ($)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="85.00"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
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
      </div>
      <ResponsiveDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
      </ResponsiveDialogFooter>
    </form>
  )
}
