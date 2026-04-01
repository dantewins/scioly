"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const TYPES = ["PRACTICE", "INVITATIONAL", "REGIONAL", "STATE", "NATIONAL", "OTHER"] as const

export function CreateCompetitionDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "", type: "INVITATIONAL" as string,
    location: "", startsAt: "", endsAt: "",
  })

  async function handleCreate() {
    if (!form.name || !form.startsAt) { toast.error("Name and start date are required."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? "Failed to create."); return }
      toast.success("Competition created.")
      setOpen(false)
      router.refresh()
      router.push(`/dashboard/competitions/${data.id}`)
    } finally { setLoading(false) }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <IconPlus className="size-4 mr-1.5" />Add Competition
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Competition</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Spring Invitational 2026" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location (optional)</Label>
              <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startsAt} onChange={(e) => setForm(f => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Input type="date" value={form.endsAt} onChange={(e) => setForm(f => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.name}>{loading ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
