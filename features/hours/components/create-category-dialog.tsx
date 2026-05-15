"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HourCategoryForm } from "@/features/hours/components/hour-category-form"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: {
    name: string
    description: string
    requiredHours: string
    requiresApproval: boolean
  }) => void | Promise<void>
  loading: boolean
}

export function CreateCategoryDialog({ open, onOpenChange, onCreate, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Hour Category</DialogTitle>
        </DialogHeader>
        <HourCategoryForm
          onSubmit={onCreate}
          loading={loading}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
