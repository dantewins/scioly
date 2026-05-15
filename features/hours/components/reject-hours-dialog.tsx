"use client"

import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RejectHoursDialogProps {
  open: boolean
  reason: string
  loading: boolean
  onReasonChange: (reason: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function RejectHoursDialog({
  open,
  reason,
  loading,
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectHoursDialogProps) {
  const trimmedReason = reason.trim()
  const isEmpty = trimmedReason.length === 0
  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Reject Hours</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reject-hours-reason">Reason</Label>
          <Input
            id="reject-hours-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Explain why these hours are being rejected"
            aria-invalid={isEmpty || undefined}
            aria-describedby="reject-hours-reason-help"
          />
          <p
            id="reject-hours-reason-help"
            className={
              isEmpty
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {isEmpty ? "Reason is required" : "This will be shared with the member."}
          </p>
        </div>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading || isEmpty}
          >
            Reject
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
