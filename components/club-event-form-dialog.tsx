"use client"

import { IconLoader2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  EVENT_TYPES,
  TYPE_LABELS,
  selectClassName,
  type ClubEventFormState,
  type HourCategory,
} from "@/lib/club-events"

interface ClubEventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  form: ClubEventFormState
  onFormChange: (updater: (prev: ClubEventFormState) => ClubEventFormState) => void
  onSubmit: () => void
  submitting: boolean
  submitLabel: string
  hourCategories: HourCategory[]
  /** Whether to show the notes field (hidden for create, shown for edit) */
  showNotes?: boolean
}

export function ClubEventFormDialog({
  open,
  onOpenChange,
  title,
  form,
  onFormChange,
  onSubmit,
  submitting,
  submitLabel,
  hourCategories,
  showNotes = false,
}: ClubEventFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field>
            <FieldLabel htmlFor="ce-name">Name</FieldLabel>
            <Input
              id="ce-name"
              placeholder="e.g. Super Saturday #1"
              value={form.name}
              onChange={e => onFormChange(f => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ce-type">Type</FieldLabel>
            <select
              id="ce-type"
              value={form.type}
              onChange={e => onFormChange(f => ({ ...f, type: e.target.value }))}
              className={selectClassName}
            >
              {EVENT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="ce-location">Location</FieldLabel>
            <Input
              id="ce-location"
              placeholder="School or venue name"
              value={form.location}
              onChange={e => onFormChange(f => ({ ...f, location: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="ce-start">Start</FieldLabel>
              <Input
                id="ce-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={e => onFormChange(f => ({ ...f, startsAt: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ce-end">End</FieldLabel>
              <Input
                id="ce-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={e => onFormChange(f => ({ ...f, endsAt: e.target.value }))}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="ce-hours">Hours granted</FieldLabel>
              <Input
                id="ce-hours"
                type="number"
                min={0}
                step={0.5}
                placeholder="0"
                value={form.hoursValue}
                onChange={e => onFormChange(f => ({ ...f, hoursValue: e.target.value }))}
              />
            </Field>
            {hourCategories.length > 0 && (
              <Field>
                <FieldLabel htmlFor="ce-cat">Hour category</FieldLabel>
                <select
                  id="ce-cat"
                  value={form.categoryId}
                  onChange={e => onFormChange(f => ({ ...f, categoryId: e.target.value }))}
                  className={selectClassName}
                >
                  <option value="">None</option>
                  {hourCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {showNotes && (
            <Field>
              <FieldLabel htmlFor="ce-notes">Notes</FieldLabel>
              <Input
                id="ce-notes"
                value={form.notes}
                onChange={e => onFormChange(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </Field>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <IconLoader2 className="size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
