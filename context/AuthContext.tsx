// context/AuthContext.tsx
"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { CurrentUser } from "@/lib/auth"
import {
  hasPermission,
  canView,
  canCreate,
  canEdit,
  canDelete,
  type PermissionFlag,
  type PermissionArea,
} from "@/lib/permissions"
import { UserRole } from "@prisma/client"

interface AuthContextValue {
  user: CurrentUser | null
  isOwner: boolean
  signOut: () => Promise<void>
  hasPermission: (flag: PermissionFlag) => boolean
  canView: (area: PermissionArea) => boolean
  canCreate: (area: PermissionArea) => boolean
  canEdit: (area: PermissionArea) => boolean
  canDelete: (area: PermissionArea) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function handleSignOut() {
  await fetch("/api/auth/logout", { method: "POST" })
  window.location.href = "/login"
}

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUser | null
  children: ReactNode
}) {
  const perms = initialUser?.permissions ?? {}

  const value: AuthContextValue = {
    user: initialUser,
    isOwner: initialUser?.role === UserRole.WEBSITE_OWNER,
    signOut: handleSignOut,
    hasPermission: (flag) => hasPermission(perms, flag),
    canView: (area) => canView(perms, area),
    canCreate: (area) => canCreate(perms, area),
    canEdit: (area) => canEdit(perms, area),
    canDelete: (area) => canDelete(perms, area),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
