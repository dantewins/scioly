"use client"

import { Switch } from "@/components/ui/switch"
import type { PermissionFlag } from "@/lib/permissions"
import { PERMISSION_SECTIONS } from "@/features/settings/lib/permission-sections"

interface Props {
  permissions: Record<string, boolean>
  canEdit: boolean
  onToggle: (flag: PermissionFlag, checked: boolean, autoEnable?: PermissionFlag) => void
}

export function PermissionGrid({ permissions, canEdit, onToggle }: Props) {
  return (
    <>
      {PERMISSION_SECTIONS.map((section) => (
        <div key={section.label} className="mt-5 first:mt-0">
          <p className="mb-1 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            {section.label}
          </p>
          <div>
            {section.permissions.map((perm) => (
              <div
                key={perm.flag}
                className="flex items-start justify-between gap-4 border-b border-border/40 py-[var(--card-py)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{perm.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                </div>
                <Switch
                  checked={permissions[perm.flag] === true}
                  onCheckedChange={(checked) => onToggle(perm.flag, checked, perm.autoEnable)}
                  disabled={!canEdit}
                  className="shrink-0 data-[state=checked]:bg-azure-600"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
