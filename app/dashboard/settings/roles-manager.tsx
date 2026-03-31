// app/dashboard/settings/roles-manager.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconTrash, IconEdit } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PERMISSION_AREAS, type PermissionArea } from "@/lib/permissions"

const AREA_LABELS: Record<PermissionArea, string> = {
  members: "Members",
  teams: "Teams",
  events: "Events",
  competitions: "Competitions",
  hours: "Hours",
  finances: "Finances",
  forms: "Forms",
  club_events: "Club Events",
  resources: "Resources",
  announcements: "Announcements",
  practice: "Practice Tests",
  roles: "Roles",
  club_settings: "Club Settings",
}

const CRUD_LABELS = ["view", "create", "edit", "delete"] as const

interface Role {
  id: string
  name: string
  description: string | null
  permissions: Record<string, boolean>
}

interface Props {
  roles: Role[]
  canManage: boolean
}

export function RolesManager({ roles: initialRoles, canManage }: Props) {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!newRoleName.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim(), permissions: {} }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to create role.")
        return
      }
      const role = await res.json()
      setRoles((r) => [...r, role])
      setNewRoleName("")
      setShowCreate(false)
      toast.success("Role created.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(roleId: string) {
    if (!confirm("Delete this role? Members with this role will lose its permissions.")) return
    const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete role.")
      return
    }
    setRoles((r) => r.filter((x) => x.id !== roleId))
    toast.success("Role deleted.")
  }

  async function handleSavePermissions(role: Role) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: role.permissions }),
      })
      if (!res.ok) {
        toast.error("Failed to save permissions.")
        return
      }
      setRoles((r) => r.map((x) => (x.id === role.id ? role : x)))
      setEditingRole(null)
      toast.success("Permissions saved.")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(role: Role, flag: string) {
    setEditingRole((r) =>
      r
        ? { ...r, permissions: { ...r.permissions, [flag]: !r.permissions[flag] } }
        : null,
    )
  }

  return (
    <div className="space-y-3">
      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{role.name}</CardTitle>
                {role.description && (
                  <CardDescription className="text-xs mt-0.5">{role.description}</CardDescription>
                )}
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingRole({ ...role, permissions: { ...role.permissions } })}
                  >
                    <IconEdit className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                    <IconTrash className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1">
              {Object.entries(role.permissions)
                .filter(([, v]) => v)
                .slice(0, 8)
                .map(([flag]) => (
                  <Badge key={flag} variant="secondary" className="text-xs font-normal">
                    {flag.replace("_", " ")}
                  </Badge>
                ))}
              {Object.values(role.permissions).filter(Boolean).length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{Object.values(role.permissions).filter(Boolean).length - 8} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {canManage && (
        <Button variant="outline" onClick={() => setShowCreate(true)} className="w-full">
          <IconPlus className="size-4 mr-1.5" />
          Add Role
        </Button>
      )}

      {/* Create role dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Vice President"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !newRoleName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit permissions dialog */}
      {editingRole && (
        <Dialog open onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Permissions — {editingRole.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {PERMISSION_AREAS.map((area) => (
                <div key={area}>
                  <p className="text-sm font-medium mb-2">{AREA_LABELS[area]}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CRUD_LABELS.map((crud) => {
                      const flag = `${crud}_${area}`
                      // club_settings has no create/delete
                      if (area === "club_settings" && (crud === "create" || crud === "delete")) {
                        return null
                      }
                      return (
                        <div key={flag} className="flex items-center gap-2">
                          <Switch
                            id={flag}
                            checked={!!editingRole.permissions[flag]}
                            onCheckedChange={() => togglePermission(editingRole, flag)}
                          />
                          <Label htmlFor={flag} className="text-xs capitalize cursor-pointer">
                            {crud}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRole(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleSavePermissions(editingRole)} disabled={loading}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
