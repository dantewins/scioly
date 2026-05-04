import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type MemoryRateLimitBucket = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

const MAX_BUCKETS = 20_000
const DB_PRUNE_INTERVAL_MS = 5 * 60_000

type RateLimitBucketDelegate = {
  deleteMany(args: { where: { resetAt: { lte: Date } } }): Promise<unknown>
  findUnique(args: {
    where: { key: string }
    select: { count: true; resetAt: true }
  }): Promise<{ count: number; resetAt: Date } | null>
  upsert(args: {
    where: { key: string }
    create: { key: string; count: number; resetAt: Date }
    update: { count: number; resetAt: Date }
  }): Promise<unknown>
  update(args: {
    where: { key: string }
    data: { count: { increment: number } }
    select: { count: true }
  }): Promise<{ count: number }>
}

declare global {
  var __sciolyRateLimitStore: Map<string, MemoryRateLimitBucket> | undefined
  var __sciolyRateLimitLastDbPruneAt: number | undefined
  var __sciolyRateLimitFallbackWarned: boolean | undefined
}

function getStore() {
  if (!globalThis.__sciolyRateLimitStore) {
    globalThis.__sciolyRateLimitStore = new Map<string, MemoryRateLimitBucket>()
  }
  return globalThis.__sciolyRateLimitStore
}

function pruneExpiredBuckets(now: number, store: Map<string, MemoryRateLimitBucket>) {
  if (store.size <= MAX_BUCKETS) return

  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key)
    }
    if (store.size <= Math.floor(MAX_BUCKETS * 0.9)) {
      break
    }
  }
}

function getRateLimitBucketDelegate(client: typeof prisma | Prisma.TransactionClient): RateLimitBucketDelegate {
  return (client as unknown as { rateLimitBucket: RateLimitBucketDelegate }).rateLimitBucket
}

function takeMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const store = getStore()
  pruneExpiredBuckets(now, store)

  const existing = store.get(key)
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterMs: 0,
    }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    }
  }

  existing.count += 1
  store.set(key, existing)
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: 0,
  }
}

async function pruneDatabaseBuckets(nowMs: number) {
  const lastPruneAt = globalThis.__sciolyRateLimitLastDbPruneAt ?? 0
  if (nowMs - lastPruneAt < DB_PRUNE_INTERVAL_MS) return

  globalThis.__sciolyRateLimitLastDbPruneAt = nowMs
  await getRateLimitBucketDelegate(prisma).deleteMany({
    where: { resetAt: { lte: new Date(nowMs) } },
  })
}

function shouldFallbackToMemory(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P2021", "P2022"].includes(error.code)
  }
  return error instanceof Error
}

function warnMemoryFallback(error: unknown) {
  if (globalThis.__sciolyRateLimitFallbackWarned) return
  globalThis.__sciolyRateLimitFallbackWarned = true
  console.warn("[rate-limit] Falling back to in-memory storage.", error)
}

function firstHeaderToken(value: string | null): string | null {
  if (!value) return null
  const token = value.split(",")[0]?.trim()
  return token && token.length > 0 ? token : null
}

export function getRequestClientKey(request: Request): string {
  const candidates = [
    firstHeaderToken(request.headers.get("cf-connecting-ip")),
    firstHeaderToken(request.headers.get("x-forwarded-for")),
    firstHeaderToken(request.headers.get("x-real-ip")),
  ]

  for (const candidate of candidates) {
    if (candidate) return candidate.toLowerCase()
  }
  return "unknown-client"
}

export function buildRateLimitKey(
  scope: string,
  request: Request,
  subject?: string | null,
): string {
  const client = getRequestClientKey(request)
  if (!subject) return `${scope}:${client}`
  const normalizedSubject = subject.trim().toLowerCase()
  return `${scope}:${client}:${normalizedSubject}`
}

function rateLimitRetryAfterSeconds(retryAfterMs: number): number {
  return Math.max(1, Math.ceil(retryAfterMs / 1000))
}

export function rateLimitErrorMessage(action: string, retryAfterMs: number): string {
  return `Too many ${action} requests. Try again in ${rateLimitRetryAfterSeconds(retryAfterMs)}s.`
}

export async function takeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const nowMs = Date.now()

  try {
    await pruneDatabaseBuckets(nowMs)

    return await prisma.$transaction(async (tx) => {
      const rateLimitBucket = getRateLimitBucketDelegate(tx)
      const existing = await rateLimitBucket.findUnique({
        where: { key },
        select: { count: true, resetAt: true },
      })

      if (!existing || existing.resetAt.getTime() <= nowMs) {
        await rateLimitBucket.upsert({
          where: { key },
          create: {
            key,
            count: 1,
            resetAt: new Date(nowMs + windowMs),
          },
          update: {
            count: 1,
            resetAt: new Date(nowMs + windowMs),
          },
        })
        return {
          allowed: true,
          remaining: Math.max(0, limit - 1),
          retryAfterMs: 0,
        }
      }

      if (existing.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, existing.resetAt.getTime() - nowMs),
        }
      }

      const updated = await rateLimitBucket.update({
        where: { key },
        data: { count: { increment: 1 } },
        select: { count: true },
      })

      return {
        allowed: true,
        remaining: Math.max(0, limit - updated.count),
        retryAfterMs: 0,
      }
    })
  } catch (error) {
    if (!shouldFallbackToMemory(error)) throw error
    warnMemoryFallback(error)
    return takeMemoryRateLimit(key, limit, windowMs)
  }
}
