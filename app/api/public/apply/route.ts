// app/api/public/apply/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const schema = z.object({
  clubSlug: z.string(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  gradeLevel: z.coerce.number().int().min(9).max(12).optional(),
  graduationYear: z.coerce.number().int().optional(),
  shirtSize: z.string().optional(),
  isReturning: z.boolean().optional(),
  canTravel: z.boolean().optional(),
  // Application essay fields
  whyJoin: z.string().max(2000).optional(),
  contributionIdeas: z.string().max(2000).optional(),
  awards: z.string().max(2000).optional(),
  previousEvents: z.string().max(2000).optional(),
  scienceClasses: z.string().max(1000).optional(),
  mathClasses: z.string().max(1000).optional(),
  questions: z.string().max(1000).optional(),
  // Event choices: array of event IDs (up to 6)
  eventChoices: z.array(z.string()).max(6).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      )
    }

    const { clubSlug, eventChoices, shirtSize, ...fields } = parsed.data

    // Resolve club
    const club = await prisma.club.findUnique({ where: { slug: clubSlug } })
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 })
    }

    // Enforce school domain
    if (club.schoolDomain) {
      const emailDomain = fields.email.split("@")[1]?.toLowerCase()
      if (emailDomain !== club.schoolDomain.toLowerCase()) {
        return NextResponse.json(
          { error: `Your email must end in @${club.schoolDomain}.` },
          { status: 400 },
        )
      }
    }

    // Check not already registered
    const existing = await prisma.user.findUnique({ where: { email: fields.email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      )
    }

    // Active season required
    const season = await prisma.season.findFirst({
      where: { clubId: club.id, isActive: true },
    })
    if (!season) {
      return NextResponse.json({ error: "No active season." }, { status: 400 })
    }

    // Create user + member season + event enrollments
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clubId: club.id,
          email: fields.email,
          role: "APPLICANT",
          firstName: fields.firstName,
          lastName: fields.lastName,
          phone: fields.phone,
          gradeLevel: fields.gradeLevel,
          graduationYear: fields.graduationYear,
        },
      })

      const ms = await tx.memberSeason.create({
        data: {
          userId: user.id,
          seasonId: season.id,
          membershipStatus: "PENDING",
          isReturning: fields.isReturning ?? false,
          canTravel: fields.canTravel ?? false,
          shirtSize,
          whyJoin: fields.whyJoin,
          contributionIdeas: fields.contributionIdeas,
          awards: fields.awards,
          previousEvents: fields.previousEvents,
          scienceClasses: fields.scienceClasses,
          mathClasses: fields.mathClasses,
          questions: fields.questions,
          applicationSubmittedAt: new Date(),
        },
      })

      // Create INTERESTED enrollments for chosen events
      if (eventChoices?.length) {
        await tx.eventEnrollment.createMany({
          data: eventChoices.map((eventId) => ({
            memberSeasonId: ms.id,
            eventId,
            status: "INTERESTED" as const,
          })),
          skipDuplicates: true,
        })
      }
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error("[apply]", e)
    return NextResponse.json({ error: "Submission failed." }, { status: 500 })
  }
}
