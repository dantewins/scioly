// lib/auth.ts
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { NextRequest } from "next/server"
import { UserRole } from "@prisma/client"
import { prisma } from "./prisma"
import { allPermissions, mergePermissions, type PermissionMap } from "./permissions"

const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET!)
const ALG = "HS256"

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

export async function signSession(payload: { sub: string }, ttl = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret)
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] })
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

export async function getCurrentUser(req?: NextRequest): Promise<CurrentUser | null> {
  const sub = await getUserId(req, { strict: false })
  if (!sub) return null

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
      club: { select: { schoolDomain: true } },
    },
  })
  if (!user) return null

  const { club, ...userFields } = user
  const clubDomain = club?.schoolDomain ?? null

  // WEBSITE_OWNER has all permissions — bypass DB role lookup
  if (user.role === UserRole.WEBSITE_OWNER) {
    return { ...userFields, clubDomain, permissions: allPermissions() }
  }

  // APPLICANT has no dashboard permissions
  if (user.role === UserRole.APPLICANT) {
    return { ...userFields, clubDomain, permissions: {} }
  }

  // MEMBER: union permissions from all assigned club roles for the active season
  const activeSeason = await prisma.season.findFirst({
    where: { clubId: user.clubId, isActive: true },
    select: { id: true },
  })
  if (!activeSeason) return { ...userFields, clubDomain, permissions: {} }

  const memberSeason = await prisma.memberSeason.findUnique({
    where: { userId_seasonId: { userId: user.id, seasonId: activeSeason.id } },
    select: {
      roles: {
        select: { clubRole: { select: { permissions: true } } },
      },
    },
  })
  if (!memberSeason) return { ...userFields, clubDomain, permissions: {} }

  const permissions = mergePermissions(
    memberSeason.roles.map((r) => r.clubRole.permissions),
  )

  return { ...userFields, clubDomain, permissions }
}
