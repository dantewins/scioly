"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export interface AnnouncementInput {
  title: string
  body: string
  isPinned: boolean
  expiresAt: string | null
  publishedAt: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: AnnouncementInput | null
  loading: boolean
  onSubmit: (values: AnnouncementInput) => void | Promise<void>
}

const blank: AnnouncementInput = {
  title: "",
  body: "",
  isPinned: false,
  expiresAt: null,
  publishedAt: new Date().toISOString(),
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const tz = d.getTimezoneOffset()
  const local = new Date(d.getTime() - tz * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromLocalInput(local: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

export function AnnouncementEditDialog({ open, onOpenChange, initial, loading, onSubmit }: Props) {
  const [values, setValues] = useState<AnnouncementInput>(blank)

  useEffect(() => {
    if (open) setValues(initial ?? blank)
  }, [open, initial])

  const isEditing = initial !== null

  async function handleSubmit() {
    await onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit announcement" : "New announcement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              placeholder="Tryouts moved to Saturday"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea
              value={values.body}
              onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
              rows={5}
              placeholder="Details for the club."
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="pinned"
              checked={values.isPinned}
              onCheckedChange={(v) => setValues((vv) => ({ ...vv, isPinned: v }))}
            />
            <Label htmlFor="pinned">Pin to top</Label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Publish at</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(values.publishedAt)}
                onChange={(e) =>
                  setValues((v) => ({ ...v, publishedAt: fromLocalInput(e.target.value) }))
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Clear to unpublish (members stop seeing it).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Expires at (optional)</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(values.expiresAt)}
                onChange={(e) =>
                  setValues((v) => ({ ...v, expiresAt: fromLocalInput(e.target.value) }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !values.title.trim() || !values.body.trim()}>
            {loading ? (isEditing ? "Saving…" : "Posting…") : isEditing ? "Save" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
