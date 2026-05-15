"use client"

import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog"
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>New Hour Category</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <HourCategoryForm
          onSubmit={onCreate}
          loading={loading}
          onCancel={() => onOpenChange(false)}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
