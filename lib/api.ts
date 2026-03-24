import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import type { User } from "@prisma/client"

import { getCurrentUser } from "@/lib/auth"

export const ADMIN_ROLES = new Set<UserRole>([
  UserRole.WEBSITE_OWNER,
  UserRole.ADMIN,
  UserRole.BOARD_MEMBER,
])

export const MEMBER_ROLES = new Set<UserRole>([
  UserRole.WEBSITE_OWNER,
  UserRole.ADMIN,
  UserRole.BOARD_MEMBER,
  UserRole.MEMBER,
])

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function err(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status })
}

type AdminHandler<TContext = unknown> = (
  request: Request,
  context: TContext,
  currentUser: User,
) => Promise<NextResponse>

export function withAdminAuth<TContext = unknown>(
  handler: AdminHandler<TContext>,
  errorLabel = "perform action",
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        return err("Unauthorized.", 401)
      }

      if (!ADMIN_ROLES.has(currentUser.role)) {
        return err("Forbidden.", 403)
      }

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error(`Failed to ${errorLabel}:`, error)
      return err(`Failed to ${errorLabel}.`, 500)
    }
  }
}

export function withMemberAuth<TContext = unknown>(
  handler: AdminHandler<TContext>,
  errorLabel = "perform action",
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        return err("Unauthorized.", 401)
      }

      if (!MEMBER_ROLES.has(currentUser.role)) {
        return err("Forbidden.", 403)
      }

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error(`Failed to ${errorLabel}:`, error)
      return err(`Failed to ${errorLabel}.`, 500)
    }
  }
}
