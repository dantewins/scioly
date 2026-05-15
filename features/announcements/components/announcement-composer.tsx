"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { apiCall } from "@/lib/api-client"

export function AnnouncementComposer() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [isPinned, setIsPinned] = useState(false)

  async function handleSubmit() {
    if (!title || !body) { toast.error("Title and body are required."); return }
    setLoading(true)
    try {
      await apiCall("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body, isPinned }),
      })
      toast.success("Announcement posted.")
      setTitle("")
      setBody("")
      setIsPinned(false)
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post.")
    } finally { setLoading(false) }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <IconPlus className="mr-1.5 size-[15px]" />
        New
      </Button>
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader><ResponsiveDialogTitle>New Announcement</ResponsiveDialogTitle></ResponsiveDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tryouts moved to Saturday" />
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Details for the club." />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pinned" checked={isPinned} onCheckedChange={setIsPinned} />
              <Label htmlFor="pinned">Pin to top</Label>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "Posting…" : "Post"}</Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
