import { redirect } from "next/navigation"
import { RegisterForm } from "@/components/forms/register-form"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { getUserId } from "@/lib/auth"

export default async function RegisterPage() {
  const userId = await getUserId(undefined, { strict: false })
  if (userId) redirect("/dashboard")

  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  )
}
