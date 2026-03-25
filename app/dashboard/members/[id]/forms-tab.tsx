"use client"

import * as React from "react"
import { IconCheck, IconX, IconMail, IconUpload } from "@tabler/icons-react"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const formTypeSchema = z.object({
  id: z.string(),
  seasonId: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  isRequired: z.boolean(),
  requiresUpload: z.boolean(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const submissionSchema = z.object({
  id: z.string(),
  formTypeId: z.string(),
  memberSeasonId: z.string(),
  status: z.string(),
  acknowledgement: z.boolean(),
  fileUrl: z.string().nullable(),
  submittedAt: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  verifiedById: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  formType: formTypeSchema,
  verifiedBy: z.object({ firstName: z.string(), lastName: z.string() }).nullable(),
})

type FormType = z.infer<typeof formTypeSchema>
type FormSubmission = z.infer<typeof submissionSchema>

interface FormsTabProps {
  memberSeasonId: string
  formTypes: FormType[]
  submissions: FormSubmission[]
}

function SubmissionStatusBadge({ status }: { status: string }) {
  if (status === "VERIFIED") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-xs">Verified</Badge>
  if (status === "SUBMITTED") return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Submitted</Badge>
  if (status === "REJECTED") return <Badge variant="destructive" className="text-xs">Rejected</Badge>
  if (status === "EXPIRED") return <Badge variant="secondary" className="text-xs">Expired</Badge>
  return <Badge variant="outline" className="text-xs">Not started</Badge>
}

export function FormsTab({ memberSeasonId, formTypes, submissions: initial }: FormsTabProps) {
  const [submissions, setSubmissions] = React.useState<FormSubmission[]>(initial)
  const [rejectTarget, setRejectTarget] = React.useState<{ formTypeId: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [urlTarget, setUrlTarget] = React.useState<{ formTypeId: string; name: string } | null>(null)
  const [fileUrl, setFileUrl] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sendingEmail, setSendingEmail] = React.useState<string | null>(null)

  const submissionMap = new Map(submissions.map(s => [s.formTypeId, s]))

  async function patchSubmission(formTypeId: string, action: string, extra?: Record<string, unknown>) {
    const res = await fetch("/api/admin/forms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formTypeId, memberSeasonId, action, ...extra }),
    })
    if (!res.ok) throw new Error("Failed to update.")
  }

  async function verify(formTypeId: string) {
    try {
      await patchSubmission(formTypeId, "verify")
      setSubmissions(prev => {
        const existing = prev.find(s => s.formTypeId === formTypeId)
        if (existing) return prev.map(s => s.formTypeId === formTypeId ? { ...s, status: "VERIFIED" } : s)
        return [...prev, createPlaceholderSubmission(formTypeId, "VERIFIED")]
      })
      toast.success("Form verified.")
    } catch {
      toast.error("Failed to verify.")
    }
  }

  async function reject() {
    if (!rejectTarget) return
    setLoading(true)
    try {
      await patchSubmission(rejectTarget.formTypeId, "reject", { rejectionReason: rejectReason })
      setSubmissions(prev => {
        const existing = prev.find(s => s.formTypeId === rejectTarget.formTypeId)
        if (existing) return prev.map(s => s.formTypeId === rejectTarget.formTypeId ? { ...s, status: "REJECTED", rejectionReason: rejectReason } : s)
        return [...prev, createPlaceholderSubmission(rejectTarget.formTypeId, "REJECTED")]
      })
      setRejectTarget(null)
      setRejectReason("")
      toast.success("Form rejected.")
    } catch {
      toast.error("Failed to reject.")
    } finally {
      setLoading(false)
    }
  }

  async function setUrl() {
    if (!urlTarget) return
    setLoading(true)
    try {
      await patchSubmission(urlTarget.formTypeId, "set-url", { fileUrl })
      setSubmissions(prev => {
        const existing = prev.find(s => s.formTypeId === urlTarget.formTypeId)
        if (existing) return prev.map(s => s.formTypeId === urlTarget.formTypeId ? { ...s, fileUrl, status: "SUBMITTED" } : s)
        return [...prev, createPlaceholderSubmission(urlTarget.formTypeId, "SUBMITTED")]
      })
      setUrlTarget(null)
      setFileUrl("")
      toast.success("File URL saved.")
    } catch {
      toast.error("Failed to save URL.")
    } finally {
      setLoading(false)
    }
  }

  async function sendReminder(formTypeId: string) {
    setSendingEmail(formTypeId)
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forms-reminder", memberSeasonIds: [memberSeasonId] }),
      })
      if (res.ok) toast.success("Reminder email sent.")
      else toast.error("Failed to send.")
    } finally {
      setSendingEmail(null)
    }
  }

  function createPlaceholderSubmission(formTypeId: string, status: string): FormSubmission {
    const ft = formTypes.find(f => f.id === formTypeId)!
    return {
      id: `temp-${formTypeId}`,
      formTypeId,
      memberSeasonId,
      status,
      acknowledgement: false,
      fileUrl: null,
      submittedAt: new Date().toISOString(),
      verifiedAt: status === "VERIFIED" ? new Date().toISOString() : null,
      verifiedById: null,
      rejectionReason: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formType: ft,
      verifiedBy: null,
    }
  }

  return (
    <div className="space-y-3">
      {formTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          No forms configured for this season.
        </div>
      ) : (
        formTypes.map(ft => {
          const sub = submissionMap.get(ft.id)
          const status = sub?.status ?? "NOT_STARTED"

          return (
            <div key={ft.id} className="flex items-start justify-between gap-4 rounded-xl border bg-card px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{ft.name}</p>
                  <SubmissionStatusBadge status={status} />
                  {!ft.isRequired && <Badge variant="outline" className="text-xs">Optional</Badge>}
                </div>
                {ft.description && <p className="text-xs text-muted-foreground">{ft.description}</p>}
                {ft.dueAt && (
                  <p className="text-xs text-muted-foreground">
                    Due {new Date(ft.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
                {sub?.fileUrl && (
                  <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    View uploaded file
                  </a>
                )}
                {sub?.rejectionReason && (
                  <p className="text-xs text-destructive">Rejected: {sub.rejectionReason}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {status !== "VERIFIED" && (
                  <Button variant="ghost" size="icon" className="size-8 text-green-600 hover:text-green-700" title="Mark verified" onClick={() => verify(ft.id)}>
                    <IconCheck className="size-4" />
                  </Button>
                )}
                {status !== "REJECTED" && (
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" title="Reject" onClick={() => { setRejectTarget({ formTypeId: ft.id, name: ft.name }); setRejectReason("") }}>
                    <IconX className="size-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" title="Set file URL" onClick={() => { setUrlTarget({ formTypeId: ft.id, name: ft.name }); setFileUrl(sub?.fileUrl ?? "") }}>
                  <IconUpload className="size-4" />
                </Button>
                {status !== "VERIFIED" && (
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" title="Send reminder" disabled={sendingEmail === ft.id} onClick={() => sendReminder(ft.id)}>
                    <IconMail className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) setRejectTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject — {rejectTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason (optional)</Label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={loading}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set file URL dialog */}
      <Dialog open={!!urlTarget} onOpenChange={open => { if (!open) setUrlTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload URL — {urlTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>File URL</Label>
            <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://…" />
            <p className="text-xs text-muted-foreground">Paste a direct link to the uploaded document.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlTarget(null)}>Cancel</Button>
            <Button onClick={setUrl} disabled={loading || !fileUrl}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
