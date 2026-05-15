import type { PermissionFlag } from "@/lib/permissions"

export interface PermissionDef {
  flag: PermissionFlag
  label: string
  description: string
  /** If toggling ON, also enable this flag */
  autoEnable?: PermissionFlag
}

export interface PermissionSection {
  label: string
  permissions: PermissionDef[]
}

export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    label: "GENERAL SERVER",
    permissions: [
      { flag: "view_members", label: "View Members", description: "Can see the member list and profiles" },
      { flag: "create_members", label: "Create Members", description: "Can approve applicant applications" },
      { flag: "edit_members", label: "Edit Members", description: "Can edit member profiles and roles" },
      { flag: "delete_members", label: "Remove Members", description: "Can remove members from the club" },
    ],
  },
  {
    label: "EVENTS & COMPETITIONS",
    permissions: [
      { flag: "view_events", label: "View Events", description: "Can see Science Olympiad events" },
      { flag: "edit_events", label: "Manage Events", description: "Can create and edit events", autoEnable: "view_events" },
      { flag: "view_competitions", label: "View Competitions", description: "Can see competition schedule" },
      { flag: "edit_competitions", label: "Manage Competitions", description: "Can create and edit competitions", autoEnable: "view_competitions" },
    ],
  },
  {
    label: "ACTIVITY",
    permissions: [
      { flag: "view_hours", label: "View Hours", description: "Can see member hours" },
      { flag: "edit_hours", label: "Manage Hours", description: "Can approve and edit hours", autoEnable: "view_hours" },
      { flag: "view_finances", label: "View Finances", description: "Can see dues and invoices" },
      { flag: "edit_finances", label: "Manage Finances", description: "Can create invoices and record payments", autoEnable: "view_finances" },
      { flag: "view_forms", label: "View Forms", description: "Can see form submissions" },
      { flag: "edit_forms", label: "Manage Forms", description: "Can create form types and manage submissions", autoEnable: "view_forms" },
      { flag: "view_club_events", label: "View Club Events", description: "Can see club meetings and events" },
      { flag: "edit_club_events", label: "Manage Club Events", description: "Can create and edit club events", autoEnable: "view_club_events" },
      { flag: "view_practice", label: "View Practice", description: "Can see practice assessments" },
      { flag: "edit_practice", label: "Manage Practice", description: "Can create and manage practice assessments", autoEnable: "view_practice" },
    ],
  },
  {
    label: "ADVANCED",
    permissions: [
      { flag: "view_roles", label: "View Roles", description: "Can see role definitions" },
      { flag: "edit_roles", label: "Manage Roles", description: "Can create and edit roles", autoEnable: "view_roles" },
      { flag: "view_club_settings", label: "View Settings", description: "Can view (but not edit) club settings and seasons" },
      { flag: "edit_club_settings", label: "Manage Settings", description: "Can edit club settings and seasons", autoEnable: "view_club_settings" },
    ],
  },
]
