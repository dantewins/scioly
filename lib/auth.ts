// lib/auth.ts
import { cache } from "react"
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { NextRequest } from "next/server"
import { UserRole } from "@prisma/client"
import { prisma } from "./prisma"
import {
  allPermissions,
  memberPermissions,
  mergePermissions,
  type PermissionMap,
} from "./permissions"

const ALG = "HS256"
const CURRENT_USER_CACHE_TTL_MS = 5_000
const CURRENT_USER_CACHE_MAX = 10_000
const MIN_SESSION_SECRET_LENGTH = 32

export interface CurrentUser {
  id: string
  clubId: string
  email: string
  firstName: string
  lastName: string
  displayName: string | null
  role: UserRole
  clubDomain: string | null
  permissions: PermissionMap
}

type CurrentUserCacheEntry = {
  value: CurrentUser | null
  expiresAt: number
}

declare global {
  var __sciolyCurrentUserCache: Map<string, CurrentUserCacheEntry> | undefined
}

function getCurrentUserCacheStore(): Map<string, CurrentUserCacheEntry> {
  if (!globalThis.__sciolyCurrentUserCache) {
    globalThis.__sciolyCurrentUserCache = new Map<string, CurrentUserCacheEntry>()
  }
  return globalThis.__sciolyCurrentUserCache
}

function getCachedCurrentUser(sub: string): CurrentUser | null | undefined {
  const store = getCurrentUserCacheStore()
  const entry = store.get(sub)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    store.delete(sub)
    return undefined
  }
  return entry.value
}

function setCachedCurrentUser(sub: string, value: CurrentUser | null): void {
  const store = getCurrentUserCacheStore()
  const now = Date.now()
  store.set(sub, { value, expiresAt: now + CURRENT_USER_CACHE_TTL_MS })

  if (store.size <= CURRENT_USER_CACHE_MAX) return

  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key)
    }
    if (store.size <= Math.floor(CURRENT_USER_CACHE_MAX * 0.9)) break
  }
}

export function clearCurrentUserCache(userId?: string): void {
  const store = getCurrentUserCacheStore()
  if (userId) {
    store.delete(userId)
    return
  }
  store.clear()
}

function getSessionSecret(): Uint8Array {
  const rawSecret = process.env.APP_JWT_SECRET?.trim() || process.env.JWT_SECRET?.trim()

  if (!rawSecret) {
    throw new Error("APP_JWT_SECRET or JWT_SECRET must be set.")
  }

  if (rawSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `Session secret must be at least ${MIN_SESSION_SECRET_LENGTH} characters.`,
    )
  }

  return new TextEncoder().encode(rawSecret)
}

export async function signSession(payload: { sub: string }, ttl = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSessionSecret())
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: [ALG] })
  return payload as { sub: string; iat: number; exp: number }
}

export async function getUserId(
  req?: NextRequest,
  { strict = true }: { strict?: boolean } = {},
): Promise<string | null> {
  const token = req
    ? req.cookies.get("app_session")?.value
    : (await cookies()).get("app_session")?.value

  if (!token) {
    if (strict) throw new Error("UNAUTHENTICATED")
    return null
  }

  try {
    const { sub } = await verifySession(token)
    return sub as string
  } catch {
    if (strict) throw new Error("UNAUTHENTICATED")
    return null
  }
}

async function loadCurrentUser(sub: string): Promise<CurrentUser | null> {
  const cached = getCachedCurrentUser(sub)
  if (cached !== undefined) return cached

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: {
      id: true,
      clubId: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      role: true,
      club: {
        select: {
          schoolDomain: true,
          emailDomains: {
            where: { isActive: true, isPrimary: true },
            select: { domain: true },
            take: 1,
          },
        },
      },
    },
  })
  if (!user) {
    setCachedCurrentUser(sub, null)
    return null
  }

  const { club, ...userFields } = user
  const clubDomain = club?.emailDomains[0]?.domain ?? club?.schoolDomain ?? null
  const finalize = (value: CurrentUser) => {
    setCachedCurrentUser(sub, value)
    return value
  }

  // WEBSITE_OWNER has all permissions — skip the season-roles join entirely
  if (user.role === UserRole.WEBSITE_OWNER) {
    return finalize({ ...userFields, clubDomain, permissions: allPermissions() })
  }

  // APPLICANT has no dashboard permissions — skip the join
  if (user.role === UserRole.APPLICANT) {
    return finalize({ ...userFields, clubDomain, permissions: {} })
  }

  // Only members/admins need season-role permissions — fetch them in a second
  // query so the OWNER path above doesn't pay for a JOIN it won't use.
  const memberSeason = await prisma.memberSeason.findFirst({
    where: {
      userId: sub,
      membershipStatus: "ACTIVE",
      season: { isActive: true, clubId: user.clubId },
    },
    orderBy: { season: { startsAt: "desc" } },
    select: {
      roles: {
        select: { clubRole: { select: { name: true, permissions: true } } },
      },
    },
  })
  if (!memberSeason) return finalize({ ...userFields, clubDomain, permissions: {} })

  const assignedRoles = memberSeason.roles.map((role) => role.clubRole)
  let permissions = mergePermissions(assignedRoles.map((role) => role.permissions))

  // Existing databases may still have the original broad default Member role JSON.
  // Clamp only that legacy shape; custom roles and multi-role members still merge normally.
  if (
    user.role === UserRole.MEMBER &&
    assignedRoles.length === 1 &&
    assignedRoles[0]?.name === "Member" &&
    permissions.view_members === true &&
    permissions.view_finances === true &&
    permissions.view_roles === true &&
    permissions.view_club_settings === true
  ) {
    permissions = memberPermissions()
  }

  return finalize({ ...userFields, clubDomain, permissions })
}

const getCurrentUserFromCookies = cache(async (): Promise<CurrentUser | null> => {
  const sub = await getUserId(undefined, { strict: false })
  if (!sub) return null
  return loadCurrentUser(sub)
})

export async function getCurrentUser(req?: NextRequest): Promise<CurrentUser | null> {
  if (!req) return getCurrentUserFromCookies()

  const sub = await getUserId(req, { strict: false })
  if (!sub) return null
  return loadCurrentUser(sub)
}
