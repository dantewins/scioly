"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface ResultValues {
  placement: number | null
  scoreEarned: number | null
  scorePossible: number | null
  medalNotes: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventName: string
  initial: ResultValues | null
  loading: boolean
  onSubmit: (values: ResultValues) => void | Promise<void>
  onClear?: () => void | Promise<void>
}

function fromInput(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function toInput(value: number | null): string {
  return value === null || value === undefined ? "" : String(value)
}

export function RecordResultDialog({
  open,
  onOpenChange,
  eventName,
  initial,
  loading,
  onSubmit,
  onClear,
}: Props) {
  const [placement, setPlacement] = useState("")
  const [scoreEarned, setScoreEarned] = useState("")
  const [scorePossible, setScorePossible] = useState("")
  const [medalNotes, setMedalNotes] = useState("")

  useEffect(() => {
    if (open) {
      setPlacement(toInput(initial?.placement ?? null))
      setScoreEarned(toInput(initial?.scoreEarned ?? null))
      setScorePossible(toInput(initial?.scorePossible ?? null))
      setMedalNotes(initial?.medalNotes ?? "")
    }
  }, [open, initial])

  function handleSubmit() {
    void onSubmit({
      placement: fromInput(placement),
      scoreEarned: fromInput(scoreEarned),
      scorePossible: fromInput(scorePossible),
      medalNotes: medalNotes.trim() || null,
    })
  }

  const hasRecord = initial !== null && (
    initial.placement !== null ||
    initial.scoreEarned !== null ||
    initial.scorePossible !== null ||
    initial.medalNotes !== null
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record result — {eventName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="placement">Placement</Label>
            <Input
              id="placement"
              type="number"
              inputMode="numeric"
              min={1}
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              placeholder="e.g. 1"
            />
            <p className="text-[11px] text-muted-foreground">1 = first place. Leave blank for unranked.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="scoreEarned">Score earned</Label>
              <Input
                id="scoreEarned"
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                value={scoreEarned}
                onChange={(e) => setScoreEarned(e.target.value)}
                placeholder="e.g. 85.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scorePossible">Score possible</Label>
              <Input
                id="scorePossible"
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                value={scorePossible}
                onChange={(e) => setScorePossible(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="medalNotes">Notes (optional)</Label>
            <Textarea
              id="medalNotes"
              value={medalNotes}
              onChange={(e) => setMedalNotes(e.target.value)}
              rows={2}
              placeholder="Honorable mention, disqualified, partial credit, etc."
            />
          </div>
        </div>
        <DialogFooter className="flex flex-wrap-reverse gap-2 sm:flex-nowrap">
          {hasRecord && onClear && (
            <Button
              variant="ghost"
              onClick={() => void onClear()}
              disabled={loading}
              className="mr-auto text-destructive hover:bg-destructive/10"
            >
              Clear result
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : hasRecord ? "Update" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
