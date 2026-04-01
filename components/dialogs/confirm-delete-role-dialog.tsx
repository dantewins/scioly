"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { TrashIcon } from "@phosphor-icons/react"

interface Role {
  id: string
  name: string
  description: string | null
  color?: string | null
  permissions: Record<string, boolean>
}

interface ConfirmDeleteRoleDialogProps {
  role: Role | null
  deleting: boolean
  onConfirm: (role: Role) => void | Promise<void>
  onCancel: () => void
}

export function ConfirmDeleteRoleDialog({
  role,
  deleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteRoleDialogProps) {
  return (
    <Dialog
      open={role !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{role?.name}&rdquo;?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Members with this role will lose its permissions. This action cannot
          be undone.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => role && onConfirm(role)}
            disabled={deleting}
          >
            <TrashIcon size={14} className="mr-1.5" />
            {deleting ? "Deleting\u2026" : "Delete Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
