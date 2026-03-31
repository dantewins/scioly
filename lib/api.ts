// lib/api.ts
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { getCurrentUser, type CurrentUser } from "./auth"
import { hasPermission, type PermissionFlag } from "./permissions"

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function err(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status })
}

type Handler<TContext = unknown> = (
  request: Request,
  context: TContext,
  currentUser: CurrentUser,
) => Promise<NextResponse>

// Require a specific permission flag. WEBSITE_OWNER always passes.
export function withPermission<TContext = unknown>(
  flag: PermissionFlag,
  handler: Handler<TContext>,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return err("Unauthorized.", 401)

      // WEBSITE_OWNER has all permissions (permissions map already has all flags true)
      if (!hasPermission(currentUser.permissions, flag)) {
        return err("Forbidden.", 403)
      }

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error(`[withPermission:${flag}]`, error)
      return err("Internal server error.", 500)
    }
  }
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

// Convenience alias: requires edit_club_settings
export function withAdminAuth<TContext = unknown>(
  handler: Handler<TContext>,
  _label?: string,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return withPermission("edit_club_settings", handler)
}
