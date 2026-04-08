"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconUpload, IconCheck, IconClock, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateOnly } from "@/lib/format"
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

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  SUBMITTED: { label: "Submitted", className: "bg-blue-100 text-blue-800", icon: IconClock },
  VERIFIED: { label: "Verified", className: "bg-green-100 text-green-800", icon: IconCheck },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800", icon: IconX },
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {formTypes.map((ft) => {
        const sub = ft.submissions[0]
        const statusInfo = sub ? STATUS_MAP[sub.status] : null

        return (
          <Card key={ft.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-medium leading-tight">{ft.name}</CardTitle>
                {statusInfo ? (
                  <Badge className={`shrink-0 text-xs ${statusInfo.className}`}>
                    {statusInfo.label}
                  </Badge>
                ) : ft.isRequired ? (
                  <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Required</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">Optional</Badge>
                )}
              </div>
              {ft.dueAt && (
                <p className="text-xs text-muted-foreground">Due {formatDateOnly(new Date(ft.dueAt))}</p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0 flex-1">
              {ft.description && (
                <p className="text-xs text-muted-foreground">{ft.description}</p>
              )}
              {sub?.status === "SUBMITTED" && (
                <p className="text-xs text-muted-foreground">
                  Submitted {sub.submittedAt ? formatDateOnly(new Date(sub.submittedAt)) : ""}
                </p>
              )}
              {(!sub || sub.status === "REJECTED") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto w-full"
                  onClick={() => setSubmitting(ft.id)}
                >
                  <IconUpload className="size-3.5 mr-1.5" />
                  {sub?.status === "REJECTED" ? "Resubmit" : "Submit"}
                </Button>
              )}
            </CardContent>
          </Card>
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
