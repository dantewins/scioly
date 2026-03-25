"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconEdit,
  IconUserOff,
  IconUserCheck,
  IconLoader2,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EventEnrollment {
  id: string
  eventName: string
  status: string
  preferenceRank: number | null
  partnerPreference: string
  partnerNames: string
}

interface TeamAssignment {
  id: string
  teamLabel: string
  eventName: string
  role: string
  competitionName: string | null
  seatNumber: number | null
}

interface MemberInfo {
  name: string
  email: string
  phone: string | null
  gradeLevel: number | null
  shirtSize: string | null
  canTravel: boolean
  isReturning: boolean
  membershipStatus: string
  joinedAt: string
  statusChangedAt: string | null
  statusReason: string | null
}

interface OverviewTabProps {
  memberSeasonId: string
  userId: string
  member: MemberInfo
  eventEnrollments: EventEnrollment[]
  teamAssignments: TeamAssignment[]
}

function EnrollmentStatusBadge({ value }: { value: string }) {
  if (value === "ACTIVE") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-xs">Active</Badge>
  if (value === "WAITLISTED") return <Badge variant="outline" className="text-xs">Waitlisted</Badge>
  if (value === "DROPPED") return <Badge variant="destructive" className="text-xs">Dropped</Badge>
  if (value === "TRYOUT_PENDING") return <Badge variant="secondary" className="text-xs">Tryout</Badge>
  return <Badge variant="secondary" className="text-xs">{value}</Badge>
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  )
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`
  return phone || "—"
}

function MemberStatusBadge({ value }: { value: string }) {
  if (value === "ACTIVE") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
  if (value === "INACTIVE") return <Badge variant="secondary">Inactive</Badge>
  if (value === "ALUMNI") return <Badge variant="outline">Alumni</Badge>
  return <Badge variant="secondary">{value}</Badge>
}

interface EditFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  gradeLevel: string
  shirtSize: string
  isReturning: boolean
  canTravel: boolean
}

export function OverviewTab({ memberSeasonId, userId, member, eventEnrollments, teamAssignments }: OverviewTabProps) {
  const router = useRouter()

  const [editOpen, setEditOpen] = React.useState(false)
  const [editForm, setEditForm] = React.useState<EditFormState>(() => {
    const parts = member.name.trim().split(" ")
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      email: member.email,
      phone: member.phone ?? "",
      gradeLevel: member.gradeLevel ? String(member.gradeLevel) : "",
      shirtSize: member.shirtSize ?? "",
      isReturning: member.isReturning,
      canTravel: member.canTravel,
    }
  })
  const [editSaving, setEditSaving] = React.useState(false)

  const [deactivateOpen, setDeactivateOpen] = React.useState(false)
  const [deactivateSaving, setDeactivateSaving] = React.useState(false)
  const isActive = member.membershipStatus === "ACTIVE"

  async function saveEdit() {
    setEditSaving(true)
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberSeasonId, action: "edit", ...editForm }),
      })
      if (!res.ok) throw new Error()
      toast.success("Member updated.")
      setEditOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to save changes.")
    } finally {
      setEditSaving(false)
    }
  }

  async function submitDeactivate() {
    setDeactivateSaving(true)
    try {
      const action = isActive ? "deactivate" : "reactivate"
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberSeasonId, action }),
      })
      if (!res.ok) throw new Error()
      toast.success(isActive ? "Member deactivated." : "Member reactivated.")
      setDeactivateOpen(false)
      router.refresh()
    } catch {
      toast.error("Failed to update status.")
    } finally {
      setDeactivateSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Left: events + teams */}
      <div className="space-y-4">
        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-sm">Event enrollments</h2>
          <Separator />
          {eventEnrollments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {eventEnrollments.map(e => (
                <div key={e.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{e.eventName}</div>
                    <EnrollmentStatusBadge value={e.status} />
                  </div>
                  {e.preferenceRank != null && (
                    <div className="text-xs text-muted-foreground">Preference rank: #{e.preferenceRank}</div>
                  )}
                  {e.partnerPreference && e.partnerPreference !== "NA" && (
                    <div className="text-xs text-muted-foreground">
                      Partner: {e.partnerPreference.toLowerCase()}{e.partnerNames ? ` · ${e.partnerNames}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No event enrollments.</p>
          )}
        </div>

        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-sm">Team assignments</h2>
          <Separator />
          {teamAssignments.length > 0 ? (
            <div className="space-y-3">
              {teamAssignments.map(t => (
                <div key={t.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Team {t.teamLabel} — {t.eventName}</div>
                    <Badge variant="outline" className="text-xs">{t.role}</Badge>
                  </div>
                  {t.competitionName && <div className="text-xs text-muted-foreground">{t.competitionName}</div>}
                  {t.seatNumber != null && <div className="text-xs text-muted-foreground">Seat #{t.seatNumber}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No team assignments.</p>
          )}
        </div>
      </div>

      {/* Right: profile card */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border p-4 space-y-4">
          <div>
            <div className="text-base font-semibold">{member.name}</div>
            <div className="text-sm text-muted-foreground">{member.email}</div>
            {member.phone && (
              <div className="text-sm text-muted-foreground">{formatPhone(member.phone)}</div>
            )}
          </div>

          <Separator />

          <div className="space-y-2.5">
            <InfoRow label="Grade" value={member.gradeLevel ? `Grade ${member.gradeLevel}` : "—"} />
            <InfoRow label="Shirt size" value={member.shirtSize || "—"} />
            <InfoRow label="Can travel" value={member.canTravel ? "Yes" : "No"} />
            <InfoRow label="Returning" value={member.isReturning ? "Yes" : "No"} />
            <InfoRow label="Status" value={<MemberStatusBadge value={member.membershipStatus} />} />
            <InfoRow label="Joined" value={member.joinedAt || "—"} />
            {member.statusChangedAt && <InfoRow label="Updated" value={member.statusChangedAt} />}
            {member.statusReason && <InfoRow label="Note" value={member.statusReason} />}
          </div>

          <Separator />

          <div className="space-y-2">
            {isActive ? (
              <Button variant="destructive" className="w-full" onClick={() => setDeactivateOpen(true)}>
                <IconUserOff className="size-4" /> Deactivate
              </Button>
            ) : (
              <Button className="w-full" onClick={() => setDeactivateOpen(true)}>
                <IconUserCheck className="size-4" /> Reactivate
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setEditOpen(true)}>
              <IconEdit className="size-4" /> Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ov-first">First name</FieldLabel>
                <Input id="ov-first" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ov-last">Last name</FieldLabel>
                <Input id="ov-last" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ov-email">Email</FieldLabel>
              <Input id="ov-email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ov-phone">Phone</FieldLabel>
                <Input id="ov-phone" type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 555-5555" />
              </Field>
              <Field>
                <FieldLabel>Grade</FieldLabel>
                <Select value={editForm.gradeLevel || undefined} onValueChange={v => setEditForm(f => ({ ...f, gradeLevel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {["9", "10", "11", "12"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel>Shirt size</FieldLabel>
              <Select value={editForm.shirtSize || undefined} onValueChange={v => setEditForm(f => ({ ...f, shirtSize: v }))}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {["XS", "S", "M", "L", "XL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Returning member?</FieldLabel>
                <div className="flex gap-4 rounded-md border p-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={editForm.isReturning} onChange={() => setEditForm(f => ({ ...f, isReturning: true }))} /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!editForm.isReturning} onChange={() => setEditForm(f => ({ ...f, isReturning: false }))} /> No
                  </label>
                </div>
              </Field>
              <Field>
                <FieldLabel>Can travel?</FieldLabel>
                <div className="flex gap-4 rounded-md border p-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={editForm.canTravel} onChange={() => setEditForm(f => ({ ...f, canTravel: true }))} /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!editForm.canTravel} onChange={() => setEditForm(f => ({ ...f, canTravel: false }))} /> No
                  </label>
                </div>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving && <IconLoader2 className="size-4 animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate confirm dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{isActive ? "Deactivate member" : "Reactivate member"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {isActive
              ? "This member will be marked as inactive and lose active member access."
              : "This member will be reactivated and regain active member access."}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeactivateOpen(false)} disabled={deactivateSaving}>Cancel</Button>
            <Button
              variant={isActive ? "destructive" : "default"}
              onClick={submitDeactivate}
              disabled={deactivateSaving}
            >
              {deactivateSaving && <IconLoader2 className="size-4 animate-spin" />}
              {isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
