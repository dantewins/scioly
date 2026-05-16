"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IconUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Label } from "@/components/ui/label"
import { FileUpload, type UploadedAsset } from "@/components/ui/file-upload"
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
  seasonId?: string | null
}

function borderFor(sub: Submission | undefined): string {
  if (sub?.status === "VERIFIED") return "border-[color-mix(in_oklch,var(--success),transparent_70%)]"
  if (sub?.status === "REJECTED") return "border-[color-mix(in_oklch,var(--danger),transparent_70%)]"
  if (sub?.status === "SUBMITTED") return "border-[color-mix(in_oklch,var(--warning),transparent_70%)]"
  return "border-border/80"
}

export function MemberFormsView({ formTypes: initial, seasonId }: Props) {
  const [formTypes, setFormTypes] = useState<FormType[]>(initial)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [asset, setAsset] = useState<UploadedAsset | null>(null)
  const [loading, setLoading] = useState(false)

  const activeFormType = formTypes.find((ft) => ft.id === submitting)
  const requiresUpload = Boolean(activeFormType?.requiresUpload)

  function resetDialog() {
    setSubmitting(null)
    setAsset(null)
  }

  async function handleSubmit(formTypeId: string) {
    if (requiresUpload && !asset) {
      toast.error("Please upload the required document.")
      return
    }
    setLoading(true)
    try {
      const data = await apiCall<{ id: string }>("/api/member/forms", {
        method: "PATCH",
        body: JSON.stringify({
          formTypeId,
          action: "submit",
          fileAssetId: asset?.id,
        }),
      })
      setFormTypes((fts) =>
        fts.map((ft) =>
          ft.id === formTypeId
            ? {
                ...ft,
                submissions: [
                  {
                    id: data.id,
                    status: "SUBMITTED",
                    submittedAt: new Date().toISOString(),
                    fileUrl: asset?.publicUrl ?? null,
                  },
                ],
              }
            : ft
        )
      )
      resetDialog()
      toast.success("Form submitted successfully.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit.")
    } finally {
      setLoading(false)
    }
  }

  if (formTypes.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border/60 bg-muted/20 p-6 text-center">
        <p className="font-medium text-foreground">No forms required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your admin hasn&apos;t set up any forms for this season yet. You&apos;ll see them here when they do.
        </p>
      </div>
    )
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

      <ResponsiveDialog open={!!submitting} onOpenChange={(o) => { if (!o) resetDialog() }}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Submit Form</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="space-y-4">
            {requiresUpload ? (
              <div className="space-y-1.5">
                <Label>Upload document</Label>
                <FileUpload
                  kind="FORM_SUBMISSION"
                  seasonId={seasonId ?? undefined}
                  value={asset}
                  onChange={setAsset}
                />
                <p className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, or WebP, up to 10 MB.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Confirm that you have completed this form and want to submit it for review.
              </p>
            )}
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={resetDialog}>Cancel</Button>
            <Button
              onClick={() => submitting && handleSubmit(submitting)}
              disabled={loading || (requiresUpload && !asset)}
            >
              {loading ? "Submitting…" : "Submit"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}
