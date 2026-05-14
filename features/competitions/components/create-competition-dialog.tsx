"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { CompetitionForm } from "@/features/competitions/components/competition-form"
import { apiCall } from "@/lib/api-client"

export function CreateCompetitionDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCreate(form: { name: string; type: string; location: string; startsAt: string; endsAt: string }) {
    if (!form.name || !form.startsAt) { toast.error("Name and start date are required."); return }
    setLoading(true)
    try {
      const data = await apiCall<{ id: string }>("/api/admin/competitions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        }),
      })
      toast.success("Competition created.")
      setOpen(false)
      router.refresh()
      router.push(`/dashboard/competitions/${data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create.")
    } finally { setLoading(false) }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <IconPlus className="mr-1.5 size-[15px]" />
        New Competition
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
