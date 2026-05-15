"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconTrash, IconDeviceFloppy } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { apiCall } from "@/lib/api-client"
import type { PermissionFlag } from "@/lib/permissions"
import { ConfirmDeleteRoleDialog } from "@/features/settings/components/confirm-delete-role-dialog"
import { CreateRoleDialog } from "@/features/settings/components/create-role-dialog"
import { RoleList } from "@/features/settings/components/role-list"
import { PermissionGrid } from "@/features/settings/components/permission-grid"
import { permissionsEqual } from "@/features/settings/lib/roles-utils"

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

export function RolesManager({ roles: initialRoles, canManage }: Props) {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoles[0]?.id ?? null)
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null

  useEffect(() => {
    if (selectedRole) setLocalPermissions({ ...selectedRole.permissions })
    else setLocalPermissions({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId])

  const isDirty =
    selectedRole !== null && !permissionsEqual(localPermissions, selectedRole.permissions)

  function handleToggle(flag: PermissionFlag, checked: boolean, autoEnable?: PermissionFlag) {
    setLocalPermissions((prev) => {
      const next = { ...prev, [flag]: checked }
      if (checked && autoEnable) next[autoEnable] = true
      return next
    })
  }

  async function handleSave() {
    if (!selectedRole) return
    setSaving(true)
    try {
      await apiCall(`/api/admin/roles/${selectedRole.id}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions: localPermissions }),
      })
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions: { ...localPermissions } } : r)),
      )
      toast.success("Permissions saved.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(name: string, color: string) {
    setCreating(true)
    try {
      const role = await apiCall<Role>("/api/admin/roles", {
        method: "POST",
        body: JSON.stringify({ name, color, permissions: {} }),
      })
      setRoles((prev) => [...prev, role])
      setSelectedRoleId(role.id)
      setShowCreate(false)
      toast.success("Role created.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create role.")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(role: Role) {
    setDeleting(true)
    try {
      await apiCall(`/api/admin/roles/${role.id}`, { method: "DELETE" })
      const remaining = roles.filter((r) => r.id !== role.id)
      setRoles(remaining)
      setDeleteTarget(null)
      if (selectedRoleId === role.id) setSelectedRoleId(remaining[0]?.id ?? null)
      toast.success("Role deleted.")
    } catch {
      toast.error("Failed to delete role.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="surface flex h-full min-h-[480px] flex-col overflow-hidden md:flex-row">
      <RoleList
        roles={roles}
        selectedRoleId={selectedRoleId}
        canManage={canManage}
        onSelect={setSelectedRoleId}
        onCreateClick={() => setShowCreate(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedRole ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a role
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-border/50 px-[var(--card-px)] py-[var(--card-py)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">{selectedRole.name}</h2>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(selectedRole)}
                  >
                    <IconTrash size={15} />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-[var(--card-px)] py-[var(--card-py)]">
              <PermissionGrid
                permissions={localPermissions}
                canEdit={canManage}
                onToggle={handleToggle}
              />

              {canManage && isDirty && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                    <IconDeviceFloppy size={14} />
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <CreateRoleDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreate={handleCreate}
        creating={creating}
      />

      <ConfirmDeleteRoleDialog
        role={deleteTarget}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
