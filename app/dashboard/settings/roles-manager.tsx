"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Eye, Plus, PencilSimple, Trash, UserCirclePlus, X,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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

const AREA_GROUPS: { label: string; areas: PermissionArea[] }[] = [
  { label: "Management", areas: ["members", "teams", "events", "competitions"] },
  { label: "Activity", areas: ["hours", "finances", "forms", "club_events", "practice"] },
  { label: "Config", areas: ["roles", "club_settings", "resources", "announcements"] },
]

const CRUD = ["view", "create", "edit", "delete"] as const
type Crud = typeof CRUD[number]

// Areas where create/delete don't apply
const NO_CREATE_DELETE = new Set<PermissionArea>(["club_settings"])

const CRUD_ICONS: Record<Crud, React.ElementType> = {
  view: Eye,
  create: Plus,
  edit: PencilSimple,
  delete: Trash,
}

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

function areasWithAccess(permissions: Record<string, boolean>) {
  return PERMISSION_AREAS.filter((area) =>
    CRUD.some((crud) => permissions[`${crud}_${area}`] === true)
  ).length
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
      if (!res.ok) { toast.error((await res.json()).message ?? "Failed."); return }
      const role = await res.json()
      setRoles((r) => [...r, role])
      setNewRoleName("")
      setShowCreate(false)
      toast.success("Role created.")
    } finally { setLoading(false) }
  }

  async function handleDelete(roleId: string) {
    if (!confirm("Delete this role? Members with this role will lose its permissions.")) return
    const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete role."); return }
    setRoles((r) => r.filter((x) => x.id !== roleId))
    toast.success("Role deleted.")
  }

  async function handleSave(role: Role) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: role.permissions }),
      })
      if (!res.ok) { toast.error("Failed to save."); return }
      setRoles((r) => r.map((x) => (x.id === role.id ? role : x)))
      setEditingRole(null)
      toast.success("Permissions saved.")
      router.refresh()
    } finally { setLoading(false) }
  }

  function toggle(flag: string) {
    setEditingRole((r) =>
      r ? { ...r, permissions: { ...r.permissions, [flag]: !r.permissions[flag] } } : null
    )
  }

  function setGroup(areas: PermissionArea[], crud: Crud, value: boolean) {
    setEditingRole((r) => {
      if (!r) return null
      const next = { ...r.permissions }
      for (const area of areas) {
        if (NO_CREATE_DELETE.has(area) && (crud === "create" || crud === "delete")) continue
        next[`${crud}_${area}`] = value
      }
      return { ...r, permissions: next }
    })
  }

  return (
    <div className="space-y-3">
      {roles.map((role) => {
        const count = areasWithAccess(role.permissions)
        return (
          <Card key={role.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{role.name}</CardTitle>
                  {role.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditingRole({ ...role, permissions: { ...role.permissions } })}
                    >
                      Edit permissions
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(role.id)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                Access to <span className="font-medium text-foreground">{count}</span> of {PERMISSION_AREAS.length} areas
              </p>
            </CardContent>
          </Card>
        )
      })}

      {canManage && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowCreate(true)}>
          <UserCirclePlus size={15} className="mr-1.5" />
          New Role
        </Button>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Role</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Role Name</Label>
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Vice President"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !newRoleName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit permissions dialog */}
      {editingRole && (
        <Dialog open onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Permissions — {editingRole.name}</DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-36">Area</th>
                    {CRUD.map((crud) => {
                      const Icon = CRUD_ICONS[crud]
                      return (
                        <th key={crud} className="text-center py-2 px-3 font-medium text-muted-foreground w-16">
                          <div className="flex flex-col items-center gap-0.5">
                            <Icon size={14} />
                            <span className="text-[10px] capitalize">{crud}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {AREA_GROUPS.map((group) => (
                    <>
                      <tr key={group.label} className="bg-muted/30">
                        <td colSpan={5} className="py-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.label}
                        </td>
                      </tr>
                      {group.areas.map((area) => (
                        <tr key={area} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 pr-4 text-sm">{AREA_LABELS[area]}</td>
                          {CRUD.map((crud) => {
                            const flag = `${crud}_${area}`
                            const disabled = NO_CREATE_DELETE.has(area) && (crud === "create" || crud === "delete")
                            return (
                              <td key={crud} className="text-center py-2 px-3">
                                {disabled ? (
                                  <span className="text-muted-foreground/30 text-xs">—</span>
                                ) : (
                                  <Checkbox
                                    checked={!!editingRole.permissions[flag]}
                                    onCheckedChange={() => toggle(flag)}
                                    className="mx-auto"
                                  />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Quick-select row */}
            <div className="flex flex-wrap gap-2 pt-2 border-t text-xs text-muted-foreground">
              <span className="self-center">Quick select:</span>
              {AREA_GROUPS.map((group) => (
                <div key={group.label} className="flex items-center gap-1">
                  <span className="font-medium">{group.label}:</span>
                  {CRUD.map((crud) => (
                    <button
                      key={crud}
                      type="button"
                      className="underline hover:text-foreground capitalize"
                      onClick={() => setGroup(group.areas, crud, true)}
                    >
                      {crud}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
              <Button onClick={() => handleSave(editingRole)} disabled={loading}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
