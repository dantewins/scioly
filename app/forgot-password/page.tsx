import { redirect } from "next/navigation"
import { getUserId } from "@/lib/auth"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form"

export default async function ForgotPasswordPage() {
  const userId = await getUserId(undefined, { strict: false })
  if (userId) redirect("/dashboard")

  return (
    <AuthPageShell>
      <ForgotPasswordForm />
    </AuthPageShell>
  )
}
