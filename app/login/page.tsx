import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { LoginForm } from "@/components/forms/login-form"

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <LoginForm />
    </div>
  )
}
