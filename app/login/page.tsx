import { redirect } from "next/navigation"
import { getUserId } from "@/lib/auth"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { LoginForm } from "@/components/forms/login-form"

export default async function LoginPage() {
  const userId = await getUserId(undefined, { strict: false })
  if (userId) redirect("/dashboard")

  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  )
}
