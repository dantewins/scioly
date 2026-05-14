import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

interface LogActivityInput {
  clubId: string
  actorId?: string | null
  entityType: string
  entityId: string
  action: string
  metadata?: Record<string, unknown>
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        clubId: input.clubId,
        actorId: input.actorId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })
  } catch (error) {
    // Activity log is best-effort; never fail the underlying mutation.
    console.error("[activity-log]", error)
  }
}
