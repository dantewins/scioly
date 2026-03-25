import { FormSubmissionStatus, FormCategory } from "@prisma/client"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { withAdminAuth, ok, err } from "@/lib/api"
import { getActiveSeason } from "@/lib/db"

export const dynamic = "force-dynamic"

export const GET = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope") // "type" | null
    const memberSeasonId = searchParams.get("memberSeasonId")?.trim()

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return ok([])

    // Return FormType definitions for the season
    if (scope === "type") {
      const types = await prisma.formType.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { createdAt: "asc" },
      })
      return ok(types)
    }

    if (!memberSeasonId) {
      return err("memberSeasonId is required.", 400)
    }

    // Return FormType list with submission status for this member
    const [formTypes, submissions] = await Promise.all([
      prisma.formType.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.formSubmission.findMany({
        where: { memberSeasonId },
        include: {
          verifiedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ])

    const submissionMap = new Map(submissions.map((s) => [s.formTypeId, s]))

    const result = formTypes.map((ft) => ({
      formType: ft,
      submission: submissionMap.get(ft.id) ?? null,
    }))

    return ok(result)
  },
  "fetch form submissions"
)

export const POST = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope")

    const activeSeason = await getActiveSeason(currentUser.clubId)
    if (!activeSeason) return err("No active season.", 400)

    // Create a FormType definition
    if (scope === "type") {
      const body = await request.json() as {
        name: string
        category?: FormCategory
        description?: string
        isRequired?: boolean
        requiresUpload?: boolean
        dueAt?: string
      }

      if (!body.name) return err("name is required.", 400)

      const formType = await prisma.formType.create({
        data: {
          seasonId: activeSeason.id,
          name: body.name,
          category: body.category ?? FormCategory.OTHER,
          description: body.description,
          isRequired: body.isRequired ?? true,
          requiresUpload: body.requiresUpload ?? false,
          dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        },
      })

      return ok(formType, 201)
    }

    return err("Invalid scope.", 400)
  },
  "create form type"
)

export const PATCH = withAdminAuth(
  async (request: Request, _ctx: unknown, currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope")

    const body = await request.json() as Record<string, unknown>

    // Update a FormType definition
    if (scope === "type") {
      const { id, name, category, description, isRequired, requiresUpload, dueAt } = body as {
        id: string
        name?: string
        category?: FormCategory
        description?: string
        isRequired?: boolean
        requiresUpload?: boolean
        dueAt?: string | null
      }
      if (!id) return err("id is required.", 400)

      await prisma.formType.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(category !== undefined && { category }),
          ...(description !== undefined && { description }),
          ...(isRequired !== undefined && { isRequired }),
          ...(requiresUpload !== undefined && { requiresUpload }),
          ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
        },
      })

      return ok({ success: true })
    }

    // Update a FormSubmission (verify / reject / set fileUrl)
    const { formTypeId, memberSeasonId, action, fileUrl, rejectionReason, notes } = body as {
      formTypeId: string
      memberSeasonId: string
      action: "verify" | "reject" | "reset" | "set-url"
      fileUrl?: string
      rejectionReason?: string
      notes?: string
    }

    if (!formTypeId || !memberSeasonId || !action) {
      return err("formTypeId, memberSeasonId, and action are required.", 400)
    }

    // Upsert the submission record
    const existing = await prisma.formSubmission.findUnique({
      where: { formTypeId_memberSeasonId: { formTypeId, memberSeasonId } },
    })

    const now = new Date()

    const statusMap: Record<string, FormSubmissionStatus> = {
      verify: FormSubmissionStatus.VERIFIED,
      reject: FormSubmissionStatus.REJECTED,
      reset: FormSubmissionStatus.NOT_STARTED,
    }

    const newStatus = action === "set-url"
      ? FormSubmissionStatus.SUBMITTED
      : (statusMap[action] ?? FormSubmissionStatus.SUBMITTED)

    const data = {
      status: newStatus,
      ...(action === "verify" && { verifiedById: currentUser.id, verifiedAt: now }),
      ...(action === "reject" && { rejectionReason: rejectionReason ?? null }),
      ...(action === "reset" && { verifiedAt: null, verifiedById: null, rejectionReason: null, fileUrl: null }),
      ...(fileUrl !== undefined && { fileUrl }),
      ...(notes !== undefined && { notes }),
      ...((action === "set-url" || action === "verify" || action === "reject") && !existing?.submittedAt && { submittedAt: now }),
    }

    if (existing) {
      await prisma.formSubmission.update({ where: { id: existing.id }, data })
    } else {
      await prisma.formSubmission.create({
        data: {
          formTypeId,
          memberSeasonId,
          ...data,
        },
      })
    }

    return ok({ success: true })
  },
  "update form submission"
)

export const DELETE = withAdminAuth(
  async (request: Request, _ctx: unknown, _currentUser: User) => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")?.trim()
    const scope = searchParams.get("scope")

    if (!id) return err("id is required.", 400)

    if (scope === "type") {
      await prisma.formType.delete({ where: { id } })
    } else {
      await prisma.formSubmission.delete({ where: { id } })
    }

    return ok({ success: true })
  },
  "delete form"
)
