"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconAtom, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function LoginForm() {
  const router = useRouter()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(data?.message ?? "Login failed.")
        return
      }

      router.push("/dashboard")
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="flex justify-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
          <IconAtom className="size-5" />
        </div>
      </div>

      {/* Heading */}
      <div className="text-center space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Sign in to Scioly</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
      </div>

      {/* Form card */}
      <div className="rounded-[var(--radius)] border border-border bg-card p-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
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

      {/* Footer link */}
      <p className="text-center text-xs text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Register your club
        </Link>
      </p>
    </div>
  )
}
