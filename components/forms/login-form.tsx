"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { apiCall } from "@/lib/api-client"
import { AuthFormShell } from "./auth-form-shell"

export function LoginForm() {
  const router = useRouter()
  const { refreshUser } = useAuth()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      await apiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      await refreshUser()
      router.replace("/dashboard")
      // no setLoading(false) here on purpose
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error(err)
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      )
      setLoading(false)
    }
  }

  return (
    <AuthFormShell
      title="Sign in to Scioly"
      description="Use your school email and password to continue."
      footer={(
        <>
          New here?{" "}
          <Link href="/register" className="text-foreground underline underline-offset-4">
            Register your club
          </Link>
        </>
      )}
    >
      <div className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@school.edu"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </div>
    </AuthFormShell>
  )
}
