"use client"

import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { hashColor } from "@/features/settings/lib/roles-utils"

interface Role {
  id: string
  name: string
  color?: string | null
}

interface Props {
  roles: Role[]
  selectedRoleId: string | null
  canManage: boolean
  onSelect: (roleId: string) => void
  onCreateClick: () => void
}

export function RoleList({ roles, selectedRoleId, canManage, onSelect, onCreateClick }: Props) {
  return (
    <div className="flex w-full shrink-0 flex-col border-b border-border/50 bg-muted/20 md:w-52 md:border-r md:border-b-0">
      <p className="border-b border-border/30 px-[var(--card-px)] py-[var(--card-py)] text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        Roles
      </p>
      <div className="max-h-48 flex-1 overflow-y-auto p-1 md:max-h-none">
        {roles.map((role) => {
          const color = role.color ?? hashColor(role.name)
          const isSelected = role.id === selectedRoleId
          return (
            <Button
              key={role.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelect(role.id)}
              className={cn(
                "h-8 w-full justify-start gap-2 px-2 text-sm",
                isSelected
                  ? "bg-muted font-medium text-foreground hover:bg-muted"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="truncate">{role.name}</span>
            </Button>
          )
        })}
      </div>
      {canManage && (
        <div className="border-t border-border/30 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreateClick}
            className="w-full justify-start text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <IconPlus size={15} className="mr-1.5" />
            New Role
          </Button>
        </div>
      )}
    </div>
  )
}
