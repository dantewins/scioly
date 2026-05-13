"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityCard, type EntityCardTone } from "@/components/ui/entity-card"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateCompact } from "@/lib/format"
import { apiCall } from "@/lib/api-client"

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

function toneFor(sub: Submission | undefined, isRequired: boolean): EntityCardTone {
  if (!sub) return isRequired ? "brand" : "neutral"
  if (sub.status === "VERIFIED") return "success"
  if (sub.status === "REJECTED") return "danger"
  if (sub.status === "SUBMITTED") return "warning"
  return "neutral"
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
      {formTypes.map((ft) => {
        const sub = ft.submissions[0]
        const needsAction = !sub || sub.status === "REJECTED"
        return (
          <EntityCard
            key={ft.id}
            tone={toneFor(sub, ft.isRequired)}
            kicker={
              <>
                {ft.isRequired ? "Required" : "Optional"}
                <span className="text-border" aria-hidden>·</span>
                <span className="text-muted-foreground">{ft.category.replace(/_/g, " ").toLowerCase()}</span>
              </>
            }
            status={sub ? <StatusBadge status={sub.status} withDot /> : (
              ft.isRequired
                ? <Badge variant="outline" className="text-[10px] text-muted-foreground">Required</Badge>
                : <Badge variant="outline" className="text-[10px] text-muted-foreground">Optional</Badge>
            )}
            title={ft.name}
            titleSize="sm"
            description={ft.description ?? undefined}
            metrics={
              <>
                {ft.dueAt && <span>Due {formatDateCompact(new Date(ft.dueAt))}</span>}
                {sub?.status === "SUBMITTED" && sub.submittedAt && (
                  <span>Submitted {formatDateCompact(new Date(sub.submittedAt))}</span>
                )}
              </>
            }
            trailing={
              needsAction ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSubmitting(ft.id)}
                >
                  <IconUpload className="size-3.5 mr-1.5" />
                  {sub?.status === "REJECTED" ? "Resubmit" : "Submit"}
                </Button>
              ) : undefined
            }
            alwaysShowTrailing
          />
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
