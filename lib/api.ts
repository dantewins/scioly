// lib/api.ts
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { getCurrentUser, type CurrentUser } from "./auth"
import { getActiveMemberSeason } from "./db"
import { hasPermission, type PermissionArea, type PermissionFlag } from "./permissions"

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function err(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status })
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

type Handler<TContext = unknown> = (
  request: Request,
  context: TContext,
  currentUser: CurrentUser,
) => Promise<NextResponse>

function getAdminViewArea(flag: PermissionFlag): PermissionArea | null {
  if (!flag.startsWith("view_")) return null
  return flag.slice("view_".length) as PermissionArea
}

function hasAdminDatasetAccess(currentUser: CurrentUser, flags: PermissionFlag[]): boolean {
  if (currentUser.role === UserRole.WEBSITE_OWNER) return true

  for (const flag of flags) {
    if (!hasPermission(currentUser.permissions, flag)) continue
    if (!flag.startsWith("view_")) return true

    const area = getAdminViewArea(flag)
    if (
      area &&
      (hasPermission(currentUser.permissions, `edit_${area}`) ||
        hasPermission(currentUser.permissions, `delete_${area}`))
    ) {
      return true
    }
  }

  return false
}

function isAdminApiRequest(request: Request): boolean {
  return new URL(request.url).pathname.startsWith("/api/admin/")
}

function withPermissionCheck<TContext = unknown>(
  flags: PermissionFlag[],
  handler: Handler<TContext>,
  label: string,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return err("Unauthorized.", 401)

      if (!flags.some((flag) => hasPermission(currentUser.permissions, flag))) {
        return err("Forbidden.", 403)
      }

      if (isAdminApiRequest(request) && !hasAdminDatasetAccess(currentUser, flags)) {
        return err("Forbidden.", 403)
      }

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error(`[withPermission:${label}]`, error)
      return err("Internal server error.", 500)
    }
  }
}

// Require a specific permission flag. WEBSITE_OWNER always passes.
export function withPermission<TContext = unknown>(
  flag: PermissionFlag,
  handler: Handler<TContext>,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return withPermissionCheck([flag], handler, flag)
}

// Require any one of the provided permission flags.
export function withAnyPermission<TContext = unknown>(
  flags: PermissionFlag[],
  handler: Handler<TContext>,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return withPermissionCheck(flags, handler, flags.join("|"))
}

// Require any authenticated non-applicant user
export function withMemberAuth<TContext = unknown>(
  handler: Handler<TContext>,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return err("Unauthorized.", 401)
      if (currentUser.role === UserRole.APPLICANT) return err("Forbidden.", 403)

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error("[withMemberAuth]", error)
      return err("Internal server error.", 500)
    }
  }
}

// Require an authenticated user with an ACTIVE membership in the current season.
export function withActiveMemberAuth<TContext = unknown>(
  handler: Handler<TContext>,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return err("Unauthorized.", 401)
      if (currentUser.role === UserRole.APPLICANT) return err("Forbidden.", 403)

      if (currentUser.role !== UserRole.WEBSITE_OWNER) {
        const memberSeason = await getActiveMemberSeason(currentUser.id, currentUser.clubId)
        if (!memberSeason) return err("Active membership required.", 403)
      }

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error("[withActiveMemberAuth]", error)
      return err("Internal server error.", 500)
    }
  }
}
