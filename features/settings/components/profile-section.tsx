"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { apiCall } from "@/lib/api-client"

export interface ProfileSectionData {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string | null
  graduationYear: number | null
  gradeLevel: number | null
  membershipStatus: string | null
  seasonName: string | null
  seasonYear: string | null
  canChangePassword: boolean
}

interface Props {
  initial: ProfileSectionData
}

export function ProfileSection({ initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: initial.firstName,
    lastName: initial.lastName,
    displayName: initial.displayName ?? "",
  })
  const [profileLoading, setProfileLoading] = useState(false)

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [pwLoading, setPwLoading] = useState(false)

  const dirty =
    form.firstName.trim() !== initial.firstName ||
    form.lastName.trim() !== initial.lastName ||
    form.displayName.trim() !== (initial.displayName ?? "")

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required.")
      return
    }
    setProfileLoading(true)
    try {
      await apiCall("/api/member/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          displayName: form.displayName.trim(),
        }),
      })
      toast.success("Profile updated.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile.")
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords do not match.")
      return
    }
    setPwLoading(true)
    try {
      await apiCall("/api/member/profile", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      })
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      toast.success("Password updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password.")
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder={`${initial.firstName} ${initial.lastName}`.trim()}
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Falls back to your first and last name when blank.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={initial.email} readOnly className="bg-muted text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Contact an admin to change your email address.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Graduation Year</Label>
                <Input
                  value={initial.graduationYear?.toString() ?? "Not on file"}
                  readOnly
                  className="bg-muted text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Membership</Label>
                <div className="flex h-9 items-center gap-2 rounded-[var(--control-radius)] border border-input bg-muted/40 px-3">
                  {initial.membershipStatus ? (
                    <StatusBadge status={initial.membershipStatus} withDot />
                  ) : (
                    <span className="text-sm text-muted-foreground">No active membership</span>
                  )}
                  {initial.seasonYear && (
                    <span className="text-xs text-muted-foreground">{initial.seasonYear}</span>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={profileLoading || !dirty}>
              {profileLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {initial.canChangePassword && (
        <Card>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Change Password</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use a password with at least 8 characters.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={(e) =>
                    setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={pwForm.confirmPassword}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  pwLoading ||
                  !pwForm.currentPassword ||
                  !pwForm.newPassword ||
                  !pwForm.confirmPassword
                }
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
