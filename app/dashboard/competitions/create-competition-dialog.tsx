"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { CompetitionForm } from "@/components/forms/competition-form"

export function CreateCompetitionDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate(form: { name: string; type: string; location: string; startsAt: string; endsAt: string }) {
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Competition</DialogTitle></DialogHeader>
          <CompetitionForm
            onSubmit={handleCreate}
            loading={loading}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
