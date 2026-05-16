"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ResourceType = "LINK" | "FILE" | "DOC" | "VIDEO" | "SHEET" | "FOLDER" | "OTHER"

export interface ResourceFormValues {
  title: string
  description: string
  type: ResourceType
  url: string
  eventId: string | null
}

interface Event {
  id: string
  name: string
  code: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: Event[]
  initial: ResourceFormValues | null
  loading: boolean
  onSubmit: (values: ResourceFormValues) => void | Promise<void>
}

const blank: ResourceFormValues = {
  title: "",
  description: "",
  type: "LINK",
  url: "",
  eventId: null,
}

const TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: "LINK", label: "Link" },
  { value: "DOC", label: "Document" },
  { value: "SHEET", label: "Spreadsheet" },
  { value: "VIDEO", label: "Video" },
  { value: "FOLDER", label: "Folder" },
  { value: "FILE", label: "File" },
  { value: "OTHER", label: "Other" },
]

export function ResourceEditDialog({ open, onOpenChange, events, initial, loading, onSubmit }: Props) {
  const [values, setValues] = useState<ResourceFormValues>(blank)

  useEffect(() => {
    if (open) setValues(initial ?? blank)
  }, [open, initial])

  const isEditing = initial !== null

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEditing ? "Edit resource" : "New resource"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={values.title}
              onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
              placeholder="Anatomy reference packet"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={values.type}
                onValueChange={(v) => setValues((vv) => ({ ...vv, type: v as ResourceType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Event (optional)</Label>
              <Select
                value={values.eventId ?? "__season"}
                onValueChange={(v) => setValues((vv) => ({ ...vv, eventId: v === "__season" ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Season-wide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__season">Season-wide (everyone)</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                      {e.code && <span className="text-xs text-muted-foreground ml-1">({e.code})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              type="url"
              value={values.url}
              onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
              placeholder="https://docs.google.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              rows={2}
              placeholder="What is this for?"
            />
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(values)}
            disabled={loading || !values.title.trim() || !values.url.trim()}
          >
            {loading ? (isEditing ? "Saving…" : "Adding…") : isEditing ? "Save" : "Add"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
