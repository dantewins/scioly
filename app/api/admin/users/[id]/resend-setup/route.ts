import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"
import { sendPasswordSetupEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000

// POST — admin sends a fresh password-setup link to an applicant or a
// member whose original token expired (or who never set a password).
export const POST = withPermission(
  "edit_members",
  async (_req, ctx: { params: Promise<{ id: string }> }, admin) => {
    const { id: userId } = await ctx.params

    const user = await prisma.user.findFirst({
      where: { id: userId, clubId: admin.clubId },
      select: { id: true, email: true, firstName: true, passwordHash: true, role: true },
    })
    if (!user) return err("User not found.", 404)

    const setupToken = await prisma.passwordSetupToken.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    })

    try {
      await sendPasswordSetupEmail(user.email, setupToken.token, user.firstName)
    } catch (e) {
      console.error("[users:resend-setup] Email send failed:", e)
      return err("Token created but email send failed. Try again.", 500)
    }

    return ok({ ok: true })
  },
)
