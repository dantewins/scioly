import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { buildAllowedDomains, normalizeDomain } from "@/lib/email-domains"

const LOOKUP_CACHE_TTL_MS = 10_000
const LOOKUP_CACHE_MAX = 20_000

export type ClubEmailDomainRecord = {
  id: string
  domain: string
  isPrimary: boolean
}

type ActiveSeasonRecord = { id: string } | null
type MemberSeasonRecord = { id: string } | null
type LookupCacheEntry<T> = { value: T; expiresAt: number }

declare global {
  var __sciolyActiveSeasonCache:
    | Map<string, LookupCacheEntry<ActiveSeasonRecord>>
    | undefined
  var __sciolyMemberSeasonCache:
    | Map<string, LookupCacheEntry<MemberSeasonRecord>>
    | undefined
}

function getActiveSeasonStore(): Map<string, LookupCacheEntry<ActiveSeasonRecord>> {
  if (!globalThis.__sciolyActiveSeasonCache) {
    globalThis.__sciolyActiveSeasonCache = new Map()
  }
  return globalThis.__sciolyActiveSeasonCache
}

function getMemberSeasonStore(): Map<string, LookupCacheEntry<MemberSeasonRecord>> {
  if (!globalThis.__sciolyMemberSeasonCache) {
    globalThis.__sciolyMemberSeasonCache = new Map()
  }
  return globalThis.__sciolyMemberSeasonCache
}

function pruneLookupStore<T>(store: Map<string, LookupCacheEntry<T>>, now: number) {
  if (store.size <= LOOKUP_CACHE_MAX) return
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key)
    }
    if (store.size <= Math.floor(LOOKUP_CACHE_MAX * 0.9)) break
  }
}

function readLookupCache<T>(
  store: Map<string, LookupCacheEntry<T>>,
  key: string,
): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    return undefined
  }
  return entry.value
}

function writeLookupCache<T>(
  store: Map<string, LookupCacheEntry<T>>,
  key: string,
  value: T,
) {
  const now = Date.now()
  store.set(key, { value, expiresAt: now + LOOKUP_CACHE_TTL_MS })
  pruneLookupStore(store, now)
}

export function clearSeasonLookupCaches(): void {
  getActiveSeasonStore().clear()
  getMemberSeasonStore().clear()
}

export const getActiveSeason = cache(async (clubId: string): Promise<{ id: string } | null> => {
  const store = getActiveSeasonStore()
  const cached = readLookupCache(store, clubId)
  if (cached !== undefined) return cached

  const season = await prisma.season.findFirst({
    where: { clubId, isActive: true },
    select: { id: true },
    orderBy: { startsAt: "desc" },
  })
  writeLookupCache(store, clubId, season)
  return season
})

export const getMemberSeason = cache(async (
  userId: string,
  clubId: string,
): Promise<{ id: string } | null> => {
  const cacheKey = `${clubId}:${userId}`
  const store = getMemberSeasonStore()
  const cached = readLookupCache(store, cacheKey)
  if (cached !== undefined) return cached

  const activeSeason = await getActiveSeason(clubId)
  if (!activeSeason) {
    writeLookupCache(store, cacheKey, null)
    return null
  }

  const activeMemberSeason = await prisma.memberSeason.findFirst({
    where: {
      userId,
      seasonId: activeSeason.id,
      membershipStatus: "ACTIVE",
      user: { clubId },
      season: { id: activeSeason.id, clubId, isActive: true },
    },
    select: { id: true },
  })
  writeLookupCache(store, cacheKey, activeMemberSeason)
  return activeMemberSeason
})

export const getActiveMemberSeason = getMemberSeason

export async function assertSeasonBelongsToClub(
  seasonId: string,
  clubId: string,
): Promise<{ id: string } | null> {
  return prisma.season.findFirst({
    where: { id: seasonId, clubId },
    select: { id: true },
  })
}

export async function getClubDomainConfig(
  clubId: string,
): Promise<{ schoolDomain: string | null; emailDomains: ClubEmailDomainRecord[] } | null> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      schoolDomain: true,
      emailDomains: {
        where: { isActive: true },
        select: { id: true, domain: true, isPrimary: true },
        orderBy: [{ isPrimary: "desc" }, { domain: "asc" }],
      },
    },
  })

  return club
}

export async function getAllowedClubDomains(clubId: string): Promise<string[]> {
  const club = await getClubDomainConfig(clubId)
  if (!club) return []
  return buildAllowedDomains(club.schoolDomain, club.emailDomains)
}

export async function listActiveClubEmailDomains(clubId: string): Promise<ClubEmailDomainRecord[]> {
  const club = await getClubDomainConfig(clubId)
  return club?.emailDomains ?? []
}

export async function syncPrimaryClubDomain(
  clubId: string,
  domain: string,
  options?: { label?: string },
): Promise<void> {
  const normalizedDomain = normalizeDomain(domain)

  await prisma.$transaction(async (tx) => {
    await tx.clubEmailDomain.updateMany({
      where: { clubId, isPrimary: true },
      data: { isPrimary: false },
    })

    await tx.clubEmailDomain.upsert({
      where: {
        clubId_domain: {
          clubId,
          domain: normalizedDomain,
        },
      },
      create: {
        clubId,
        domain: normalizedDomain,
        label: options?.label,
        isPrimary: true,
        isActive: true,
      },
      update: {
        label: options?.label,
        isPrimary: true,
        isActive: true,
      },
    })
  })
}

export async function createClubEmailDomain(
  clubId: string,
  domain: string,
  options?: { label?: string; isPrimary?: boolean },
): Promise<void> {
  const normalizedDomain = normalizeDomain(domain)

  await prisma.$transaction(async (tx) => {
    if (options?.isPrimary) {
      await tx.club.update({
        where: { id: clubId },
        data: { schoolDomain: normalizedDomain },
      })

      await tx.clubEmailDomain.updateMany({
        where: { clubId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    await tx.clubEmailDomain.upsert({
      where: {
        clubId_domain: {
          clubId,
          domain: normalizedDomain,
        },
      },
      create: {
        clubId,
        domain: normalizedDomain,
        label: options?.label,
        isPrimary: options?.isPrimary ?? false,
        isActive: true,
      },
      update: {
        label: options?.label,
        isPrimary: options?.isPrimary ?? false,
        isActive: true,
      },
    })
  })
}

export async function setPrimaryClubEmailDomain(
  clubId: string,
  domainId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const domain = await tx.clubEmailDomain.findFirst({
      where: { id: domainId, clubId, isActive: true },
      select: { domain: true },
    })

    if (!domain) {
      throw new Error("DOMAIN_NOT_FOUND")
    }

    await tx.club.update({
      where: { id: clubId },
      data: { schoolDomain: domain.domain },
    })

    await tx.clubEmailDomain.updateMany({
      where: { clubId, isPrimary: true },
      data: { isPrimary: false },
    })

    await tx.clubEmailDomain.update({
      where: { id: domainId },
      data: { isPrimary: true },
    })
  })
}

export async function updateClubEmailDomain(
  clubId: string,
  domainId: string,
  domain: string,
): Promise<void> {
  const normalizedDomain = normalizeDomain(domain)

  await prisma.$transaction(async (tx) => {
    const current = await tx.clubEmailDomain.findFirst({
      where: { id: domainId, clubId, isActive: true },
      select: { isPrimary: true },
    })

    if (!current) {
      throw new Error("DOMAIN_NOT_FOUND")
    }

    await tx.clubEmailDomain.update({
      where: { id: domainId },
      data: { domain: normalizedDomain },
    })

    if (current.isPrimary) {
      await tx.club.update({
        where: { id: clubId },
        data: { schoolDomain: normalizedDomain },
      })
    }
  })
}

export async function deactivateClubEmailDomain(
  clubId: string,
  domainId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const domain = await tx.clubEmailDomain.findFirst({
      where: { id: domainId, clubId, isActive: true },
      select: { id: true, domain: true, isPrimary: true },
    })

    if (!domain) {
      throw new Error("DOMAIN_NOT_FOUND")
    }

    if (domain.isPrimary) {
      throw new Error("PRIMARY_DOMAIN_DELETE_BLOCKED")
    }

    await tx.clubEmailDomain.update({
      where: { id: domainId },
      data: { isActive: false },
    })
  })
}
