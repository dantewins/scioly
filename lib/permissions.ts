// lib/permissions.ts
// Permission flag system — 52 flags across 13 areas (view/create/edit/delete × 13).
// ClubRole.permissions stores a flat { [flag]: boolean } JSON object.
// WEBSITE_OWNER bypasses all checks — never call these helpers for WEBSITE_OWNERs.

export const PERMISSION_AREAS = [
  "members",
  "teams",
  "events",
  "competitions",
  "hours",
  "finances",
  "forms",
  "club_events",
  "resources",
  "announcements",
  "practice",
  "roles",
  "club_settings",
] as const

export type PermissionArea = (typeof PERMISSION_AREAS)[number]

export type PermissionFlag =
  | `view_${PermissionArea}`
  | `create_${PermissionArea}`
  | `edit_${PermissionArea}`
  | `delete_${PermissionArea}`

// Flat permissions map stored on ClubRole and returned by getCurrentUser
export type PermissionMap = Partial<Record<PermissionFlag, boolean>>

// All 52 flags set to true — used for WEBSITE_OWNER
export function allPermissions(): PermissionMap {
  const map: PermissionMap = {}
  for (const area of PERMISSION_AREAS) {
    ;(map as Record<string, boolean>)[`view_${area}`] = true
    ;(map as Record<string, boolean>)[`create_${area}`] = true
    ;(map as Record<string, boolean>)[`edit_${area}`] = true
    ;(map as Record<string, boolean>)[`delete_${area}`] = true
  }
  return map
}

// Default role permission sets — used in seed and club registration

export function adminPermissions(): PermissionMap {
  return allPermissions()
}

export function boardMemberPermissions(): PermissionMap {
  const map: PermissionMap = {}
  for (const area of PERMISSION_AREAS) {
    ;(map as Record<string, boolean>)[`view_${area}`] = true
    ;(map as Record<string, boolean>)[`create_${area}`] = true
    ;(map as Record<string, boolean>)[`edit_${area}`] = true
    // Board Members can delete hours and resources but nothing else
    if (area === "hours" || area === "resources") {
      ;(map as Record<string, boolean>)[`delete_${area}`] = true
    }
  }
  return map
}

export function memberPermissions(): PermissionMap {
  const map: PermissionMap = {}
  for (const area of PERMISSION_AREAS) {
    ;(map as Record<string, boolean>)[`view_${area}`] = true
  }
  // Members can submit hours and attempt practice tests
  ;(map as PermissionMap).create_hours = true
  ;(map as PermissionMap).create_practice = true
  return map
}

// ─── Runtime helpers ──────────────────────────────────────────────────────────
// These operate on the permissions map returned by getCurrentUser, NOT on raw ClubRole records.

export function hasPermission(permissions: PermissionMap, flag: PermissionFlag): boolean {
  return permissions[flag] === true
}

export function canView(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `view_${area}`)
}

export function canCreate(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `create_${area}`)
}

export function canEdit(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `edit_${area}`)
}

export function canDelete(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `delete_${area}`)
}

// Merge an array of raw ClubRole.permissions JSON objects into one PermissionMap (union)
export function mergePermissions(roleMaps: unknown[]): PermissionMap {
  const result: PermissionMap = {}
  for (const raw of roleMaps) {
    if (!raw || typeof raw !== "object") continue
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value === true) {
        ;(result as Record<string, boolean>)[key] = true
      }
    }
  }
  return result
}
