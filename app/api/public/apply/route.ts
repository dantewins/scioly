// app/api/public/apply/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { isEmailAllowedForDomains } from "@/lib/email-domains"
import { getAllowedClubDomains } from "@/lib/db"
import { buildRateLimitKey, rateLimitErrorMessage, takeRateLimit } from "@/lib/rate-limit"
import { sendApplicationReceivedEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

const schema = z.object({
  clubSlug: z.string(),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.email(),
  // Loose phone validation: digits, spaces, dashes, parens, plus. 7–20 chars.
  // Strict format/E.164 is out of scope; this just blocks "abc123" style input.
  phone: z
    .string()
    .max(20)
    .regex(/^[\d\s\-()+ ]{7,20}$/, "Phone must contain 7–20 digits, spaces, dashes, parens, or +.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
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
    const email = fields.email.trim().toLowerCase()

    const ipLimiter = await takeRateLimit(
      buildRateLimitKey(`public:apply:club:${clubSlug}`, req),
      20,
      60 * 60_000,
    )
    if (!ipLimiter.allowed) {
      return NextResponse.json(
        { error: rateLimitErrorMessage("application", ipLimiter.retryAfterMs) },
        { status: 429 },
      )
    }

    const emailLimiter = await takeRateLimit(
      buildRateLimitKey("public:apply:email", req, email),
      5,
      60 * 60_000,
    )
    if (!emailLimiter.allowed) {
      return NextResponse.json(
        { error: rateLimitErrorMessage("application", emailLimiter.retryAfterMs) },
        { status: 429 },
      )
    }

    // Resolve club
    const club = await prisma.club.findUnique({
      where: { slug: clubSlug },
      select: {
        id: true,
        name: true,
      },
    })
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 })
    }

    // Enforce school domain
    const allowedDomains = await getAllowedClubDomains(club.id)
    if (!isEmailAllowedForDomains(email, allowedDomains)) {
      const primaryDomain = allowedDomains[0] ?? "your school email domain"
      return NextResponse.json(
        { error: `Your email must end in @${primaryDomain}.` },
        { status: 400 },
      )
    }

    // Check not already registered
    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    })
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

    if (eventChoices?.length) {
      const validEvents = await prisma.event.findMany({
        where: { seasonId: season.id, id: { in: [...new Set(eventChoices)] } },
        select: { id: true },
      })
      if (validEvents.length !== [...new Set(eventChoices)].length) {
        return NextResponse.json({ error: "One or more selected events are invalid." }, { status: 400 })
      }
    }

    // Create user + member season + event enrollments
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clubId: club.id,
          email,
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

      await tx.membershipApplication.create({
        data: {
          clubId: club.id,
          seasonId: season.id,
          userId: user.id,
          memberSeasonId: ms.id,
          firstName: fields.firstName,
          lastName: fields.lastName,
          email,
          phone: fields.phone,
          gradeLevel: fields.gradeLevel,
          graduationYear: fields.graduationYear,
          shirtSize,
          isReturning: fields.isReturning ?? false,
          canTravel: fields.canTravel ?? false,
          whyJoin: fields.whyJoin,
          contributionIdeas: fields.contributionIdeas,
          awards: fields.awards,
          previousEvents: fields.previousEvents,
          scienceClasses: fields.scienceClasses,
          mathClasses: fields.mathClasses,
          questions: fields.questions,
          status: "SUBMITTED",
          answers: {
            eventChoices: eventChoices ?? [],
          },
          eventChoices: {
            create: (eventChoices ?? []).map((eventId, index) => ({
              eventId,
              preferenceRank: index + 1,
            })),
          },
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

    // Best-effort receipt email; failure must not undo the application.
    try {
      await sendApplicationReceivedEmail(email, fields.firstName, club.name)
    } catch (emailErr) {
      console.error("[apply] application-received email failed:", emailErr)
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e) {
    console.error("[apply]", e)
    return NextResponse.json({ error: "Submission failed." }, { status: 500 })
  }
}
