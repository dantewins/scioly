"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TrashIcon, PlusIcon, FloppyDiskIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PermissionFlag } from "@/lib/permissions"
import { ConfirmDeleteRoleDialog } from "@/components/dialogs/confirm-delete-role-dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
  id: string
  name: string
  description: string | null
  color?: string | null
  permissions: Record<string, boolean>
}

interface Props {
  roles: Role[]
  canManage: boolean
}

// ─── Permission definitions ───────────────────────────────────────────────────

interface PermissionDef {
  flag: PermissionFlag
  label: string
  description: string
  /** If toggling ON, also enable this flag */
  autoEnable?: PermissionFlag
}

interface PermissionSection {
  label: string
  permissions: PermissionDef[]
}

const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    label: "GENERAL SERVER",
    permissions: [
      {
        flag: "view_members",
        label: "View Members",
        description: "Can see the member list and profiles",
      },
      {
        flag: "create_members",
        label: "Create Members",
        description: "Can approve applicant applications",
      },
      {
        flag: "edit_members",
        label: "Edit Members",
        description: "Can edit member profiles and roles",
      },
      {
        flag: "delete_members",
        label: "Remove Members",
        description: "Can remove members from the club",
      },
    ],
  },
  {
    label: "TEAM & EVENTS",
    permissions: [
      {
        flag: "view_teams",
        label: "View Teams",
        description: "Can see team assignments",
      },
      {
        flag: "edit_teams",
        label: "Manage Teams",
        description: "Can create and edit teams",
        autoEnable: "view_teams",
      },
      {
        flag: "view_events",
        label: "View Events",
        description: "Can see Science Olympiad events",
      },
      {
        flag: "edit_events",
        label: "Manage Events",
        description: "Can create and edit events",
        autoEnable: "view_events",
      },
      {
        flag: "view_competitions",
        label: "View Competitions",
        description: "Can see competition schedule",
      },
      {
        flag: "edit_competitions",
        label: "Manage Competitions",
        description: "Can create and edit competitions",
        autoEnable: "view_competitions",
      },
    ],
  },
  {
    label: "ACTIVITY",
    permissions: [
      {
        flag: "view_hours",
        label: "View Hours",
        description: "Can see member hours",
      },
      {
        flag: "edit_hours",
        label: "Manage Hours",
        description: "Can approve and edit hours",
        autoEnable: "view_hours",
      },
      {
        flag: "view_finances",
        label: "View Finances",
        description: "Can see dues and invoices",
      },
      {
        flag: "edit_finances",
        label: "Manage Finances",
        description: "Can create invoices and record payments",
        autoEnable: "view_finances",
      },
      {
        flag: "view_forms",
        label: "View Forms",
        description: "Can see form submissions",
      },
      {
        flag: "edit_forms",
        label: "Manage Forms",
        description: "Can create form types and manage submissions",
        autoEnable: "view_forms",
      },
      {
        flag: "view_club_events",
        label: "View Club Events",
        description: "Can see club meetings and events",
      },
      {
        flag: "edit_club_events",
        label: "Manage Club Events",
        description: "Can create and edit club events",
        autoEnable: "view_club_events",
      },
      {
        flag: "view_practice",
        label: "View Practice",
        description: "Can see practice tests",
      },
      {
        flag: "edit_practice",
        label: "Manage Practice",
        description: "Can create and manage practice tests",
        autoEnable: "view_practice",
      },
    ],
  },
  {
    label: "ADVANCED",
    permissions: [
      {
        flag: "view_roles",
        label: "View Roles",
        description: "Can see role definitions",
      },
      {
        flag: "edit_roles",
        label: "Manage Roles",
        description: "Can create and edit roles",
        autoEnable: "view_roles",
      },
      {
        flag: "edit_club_settings",
        label: "Manage Settings",
        description: "Can edit club settings and seasons",
      },
      {
        flag: "edit_announcements",
        label: "Manage Announcements",
        description: "Can create club announcements",
      },
      {
        flag: "edit_resources",
        label: "Manage Resources",
        description: "Can upload and manage resources",
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashColor(str: string): string {
  const colors = [
    "#5865F2",
    "#57F287",
    "#FEE75C",
    "#EB459E",
    "#ED4245",
    "#3498DB",
    "#E67E22",
    "#9B59B6",
    "#1ABC9C",
    "#E74C3C",
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return colors[hash % colors.length]
}

function permissionsEqual(
  a: Record<string, boolean>,
  b: Record<string, boolean>
): boolean {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of allKeys) {
    if (!!a[k] !== !!b[k]) return false
  }
  return true
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RolesManager({ roles: initialRoles, canManage }: Props) {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    initialRoles[0]?.id ?? null
  )
  const [localPermissions, setLocalPermissions] = useState<
    Record<string, boolean>
  >({})
  const [saving, setSaving] = useState(false)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleColor, setNewRoleColor] = useState("#5865F2")
  const [creating, setCreating] = useState(false)

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null

  // Sync localPermissions when selected role changes
  useEffect(() => {
    if (selectedRole) {
      setLocalPermissions({ ...selectedRole.permissions })
    } else {
      setLocalPermissions({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId])

  const isDirty =
    selectedRole !== null &&
    !permissionsEqual(localPermissions, selectedRole.permissions)

  function handleToggle(
    flag: PermissionFlag,
    checked: boolean,
    autoEnable?: PermissionFlag
  ) {
    setLocalPermissions((prev) => {
      const next = { ...prev, [flag]: checked }
      if (checked && autoEnable) {
        next[autoEnable] = true
      }
      return next
    })
  }

  async function handleSave() {
    if (!selectedRole) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: localPermissions }),
      })
      if (!res.ok) {
        toast.error((await res.json()).message ?? "Failed to save.")
        return
      }
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRole.id
            ? { ...r, permissions: { ...localPermissions } }
            : r
        )
      )
      toast.success("Permissions saved.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate() {
    if (!newRoleName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName.trim(),
          color: newRoleColor,
          permissions: {},
        }),
      })
      if (!res.ok) {
        toast.error((await res.json()).message ?? "Failed to create role.")
        return
      }
      const role: Role = await res.json()
      setRoles((prev) => [...prev, role])
      setSelectedRoleId(role.id)
      setNewRoleName("")
      setShowCreate(false)
      toast.success("Role created.")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(role: Role) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        toast.error("Failed to delete role.")
        return
      }
      const remaining = roles.filter((r) => r.id !== role.id)
      setRoles(remaining)
      setDeleteTarget(null)
      if (selectedRoleId === role.id) {
        setSelectedRoleId(remaining[0]?.id ?? null)
      }
      toast.success("Role deleted.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[480px] border border-border/50 rounded-lg overflow-hidden bg-background">
      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div className="w-full md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-border/50 bg-muted/20 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-2 border-b border-border/30">
          Roles
        </p>

        <div className="flex-1 overflow-y-auto py-1 max-h-48 md:max-h-none">
          {roles.map((role) => {
            const color = role.color ?? hashColor(role.name)
            const isSelected = role.id === selectedRoleId
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={[
                  "w-full text-left px-2 py-1.5 rounded-md cursor-pointer flex items-center gap-2 mx-1 my-0.5 text-sm transition-colors",
                  isSelected
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                ].join(" ")}
                style={{ width: "calc(100% - 8px)" }}
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate">{role.name}</span>
              </button>
            )
          })}
        </div>

        {canManage && (
          <div className="p-2 border-t border-border/30">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <PlusIcon size={13} />
              Add Role
            </button>
          </div>
        )}
      </div>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedRole ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a role
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
              <h2 className="text-base font-semibold text-foreground">
                {selectedRole.name}
              </h2>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(selectedRole)}
                >
                  <TrashIcon size={15} />
                </Button>
              )}
            </div>

            {/* Permissions list */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {PERMISSION_SECTIONS.map((section) => (
                <div key={section.label} className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    {section.label}
                  </p>
                  <div>
                    {section.permissions.map((perm) => (
                      <div
                        key={perm.flag}
                        className="flex items-start justify-between py-4 border-b border-border/40 gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {perm.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {perm.description}
                          </p>
                        </div>
                        <Switch
                          checked={localPermissions[perm.flag] === true}
                          onCheckedChange={(checked) =>
                            handleToggle(perm.flag, checked, perm.autoEnable)
                          }
                          disabled={!canManage}
                          className="shrink-0 data-[state=checked]:bg-green-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Save button */}
              {canManage && isDirty && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="gap-1.5"
                  >
                    <FloppyDiskIcon size={14} />
                    {saving ? "Saving\u2026" : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Create role dialog ────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-role-name">Role Name</Label>
              <Input
                id="new-role-name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Vice President"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-role-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="new-role-color"
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {newRoleColor}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false)
                setNewRoleName("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newRoleName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────────── */}
      <ConfirmDeleteRoleDialog
        role={deleteTarget}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
