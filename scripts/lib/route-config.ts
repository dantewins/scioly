// scripts/lib/route-config.ts
// Route × role matrix for the perf audit. The script measures every (path, role)
// combination it lists here. Routes that 4xx/5xx for a role are still recorded —
// status code is reported alongside the timing.

export type Role = "WEBSITE_OWNER" | "MEMBER"

export type DynamicId = "firstCompetitionId" | "firstMemberSeasonId" | "firstAssessmentId" | "firstAttemptId"

export type RouteEntry = {
  path: string
  roles: Role[]
  dynamic?: DynamicId
}

// Standard scope: dashboard top-level + key detail pages.
export const routeMatrix: RouteEntry[] = [
  // Top-level dashboard
  { path: "/dashboard", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/applications", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/club-events", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/competitions", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/events", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/finances", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/forms", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/hours", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/members", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/practice", roles: ["WEBSITE_OWNER", "MEMBER"] },
  { path: "/dashboard/settings", roles: ["WEBSITE_OWNER", "MEMBER"] },

  // Detail pages (dynamic IDs resolved at runtime)
  {
    path: "/dashboard/competitions/{firstCompetitionId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstCompetitionId",
  },
  {
    path: "/dashboard/members/{firstMemberSeasonId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstMemberSeasonId",
  },
  {
    path: "/dashboard/practice/{firstAssessmentId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstAssessmentId",
  },
  {
    path: "/dashboard/practice/attempts/{firstAttemptId}",
    roles: ["WEBSITE_OWNER", "MEMBER"],
    dynamic: "firstAttemptId",
  },
]

export const ROLE_CREDENTIALS: Record<Role, { email: string; password: string }> = {
  WEBSITE_OWNER: { email: "owner@mast.edu", password: "password123" },
  MEMBER: { email: "member@mast.edu", password: "password123" },
}
