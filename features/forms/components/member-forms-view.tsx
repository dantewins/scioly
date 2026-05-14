"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateCompact } from "@/lib/format"
import { apiCall } from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface Submission {
  id: string
  status: string
  submittedAt: string | null
  fileUrl: string | null
}

interface FormType {
  id: string
  name: string
  category: string
  description: string | null
  isRequired: boolean
  requiresUpload: boolean
  dueAt: string | null
  submissions: Submission[]
}

interface Props {
  formTypes: FormType[]
}

function borderFor(sub: Submission | undefined): string {
  if (sub?.status === "VERIFIED") return "border-[color-mix(in_oklch,var(--success),transparent_70%)]"
  if (sub?.status === "REJECTED") return "border-[color-mix(in_oklch,var(--danger),transparent_70%)]"
  if (sub?.status === "SUBMITTED") return "border-[color-mix(in_oklch,var(--warning),transparent_70%)]"
  return "border-border/80"
}

export function MemberFormsView({ formTypes: initial }: Props) {
  const [formTypes, setFormTypes] = useState<FormType[]>(initial)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formTypeId: string) {
    setLoading(true)
    try {
      const data = await apiCall<{ id: string }>("/api/member/forms", {
        method: "PATCH",
        body: JSON.stringify({ formTypeId, action: "submit", fileUrl: fileUrl || undefined }),
      })
      setFormTypes((fts) =>
        fts.map((ft) =>
          ft.id === formTypeId
            ? { ...ft, submissions: [{ id: data.id, status: "SUBMITTED", submittedAt: new Date().toISOString(), fileUrl: fileUrl || null }] }
            : ft
        )
      )
      setSubmitting(null)
      setFileUrl("")
      toast.success("Form submitted successfully.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit.")
    } finally { setLoading(false) }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {/* Member form tile — checklist tile with required/optional badge bottom corner + action ribbon */}
      {formTypes.map((ft) => {
        const sub = ft.submissions[0]
        const needsAction = !sub || sub.status === "REJECTED"
        return (
          <div
            key={ft.id}
            className={cn(
              "group relative flex flex-col gap-3 rounded-[var(--radius)] border bg-card px-4 py-4 shadow-[0_1px_2px_0_color-mix(in_oklch,var(--azure-300),transparent_88%)]",
              borderFor(sub),
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                {ft.category.replace(/_/g, " ")}
              </span>
              {sub ? <StatusBadge status={sub.status} withDot /> : (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                  ft.isRequired ? "bg-azure-50 text-azure-700" : "bg-muted text-muted-foreground",
                )}>
                  {ft.isRequired ? "Required" : "Optional"}
                </span>
              )}
            </div>

            <h3 className="font-medium text-base leading-tight text-foreground">{ft.name}</h3>

            {ft.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{ft.description}</p>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] font-mono tabular-nums text-muted-foreground">
                {ft.dueAt ? <>Due <span className="text-foreground/80">{formatDateCompact(new Date(ft.dueAt))}</span></> : null}
                {sub?.status === "SUBMITTED" && sub.submittedAt && (
                  <>Submitted <span className="text-foreground/80">{formatDateCompact(new Date(sub.submittedAt))}</span></>
                )}
              </p>
              {needsAction && (
                <Button size="sm" variant="outline" onClick={() => setSubmitting(ft.id)}>
                  <IconUpload className="size-3.5 mr-1.5" />
                  {sub?.status === "REJECTED" ? "Resubmit" : "Submit"}
                </Button>
              )}
            </div>
          </div>
        )
      })}

      <Dialog open={!!submitting} onOpenChange={(o) => { if (!o) { setSubmitting(null); setFileUrl("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formTypes.find((ft) => ft.id === submitting)?.requiresUpload && (
              <div className="space-y-1.5">
                <Label>File URL</Label>
                <Input
                  placeholder="https://drive.google.com/..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Paste a link to your uploaded document.</p>
              </div>
            )}
            {!formTypes.find((ft) => ft.id === submitting)?.requiresUpload && (
              <p className="text-sm text-muted-foreground">
                Confirm that you have completed this form and want to submit it for review.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSubmitting(null); setFileUrl("") }}>Cancel</Button>
            <Button onClick={() => submitting && handleSubmit(submitting)} disabled={loading}>
              {loading ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
