"use client"

import { Button } from "@/components/ui/button"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { IconTrash } from "@tabler/icons-react"

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
    <ResponsiveDialog
      open={role !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Delete &ldquo;{role?.name}&rdquo;?</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <p className="text-sm text-muted-foreground">
          Members with this role will lose its permissions. This action cannot
          be undone.
        </p>
        <ResponsiveDialogFooter>
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
            <IconTrash size={14} className="mr-1.5" />
            {deleting ? "Deleting\u2026" : "Delete Role"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
