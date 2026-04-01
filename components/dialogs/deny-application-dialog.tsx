"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DenyApplicationDialogProps {
  open: boolean
  reason: string
  loading: boolean
  onReasonChange: (reason: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function DenyApplicationDialog({
  open,
  reason,
  loading,
  onReasonChange,
  onConfirm,
  onCancel,
}: DenyApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deny Application</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Reason (optional)</Label>
          <Input
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Reason for denial"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            Deny Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
