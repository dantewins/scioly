"use client"

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react"
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
  refreshUser: () => Promise<CurrentUser | null>
  hasPermission: (flag: PermissionFlag) => boolean
  canView: (area: PermissionArea) => boolean
  canCreate: (area: PermissionArea) => boolean
  canEdit: (area: PermissionArea) => boolean
  canDelete: (area: PermissionArea) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUser | null
  children: ReactNode
}) {
  const [user, setUser] = useState<CurrentUser | null>(initialUser)

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      if (!res.ok) {
        setUser(null)
        return null
      }

      const data = await res.json()
      const nextUser = data?.user ?? null
      setUser(nextUser)
      return nextUser
    } catch (error) {
      console.error("Failed to refresh user:", error)
      setUser(null)
      return null
    }
  }, [])

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })
    window.location.href = "/login"
  }, [])

  const value: AuthContextValue = useMemo(
    () => {
      const permissions = user?.permissions ?? {}

      return {
        user,
        isOwner: user?.role === UserRole.WEBSITE_OWNER,
        signOut,
        refreshUser,
        hasPermission: (flag) => hasPermission(permissions, flag),
        canView: (area) => canView(permissions, area),
        canCreate: (area) => canCreate(permissions, area),
        canEdit: (area) => canEdit(permissions, area),
        canDelete: (area) => canDelete(permissions, area),
      }
    },
    [user, signOut, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
