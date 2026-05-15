"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, color: string) => void | Promise<void>
  creating: boolean
  defaultColor?: string
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreate,
  creating,
  defaultColor = "#5865F2",
}: Props) {
  const [name, setName] = useState("")
  const [color, setColor] = useState(defaultColor)

  function reset() {
    setName("")
    setColor(defaultColor)
  }

  async function handleSubmit() {
    if (!name.trim()) return
    await onCreate(name.trim(), color)
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-role-name">Role Name</Label>
            <Input
              id="new-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vice President"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-role-color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="new-role-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded-[var(--control-radius)] border border-border bg-transparent p-0.5"
              />
              <span className="text-sm text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating || !name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
