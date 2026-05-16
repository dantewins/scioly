"use client"

import * as React from "react"
import Link from "next/link"
import { IconLoader2, IconArrowLeft } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiCall } from "@/lib/api-client"
import { AuthFormShell } from "./auth-form-shell"

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiCall("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthFormShell
        title="Check your inbox"
        description="If an account exists for that email, we sent a password reset link. It expires in 1 hour."
        footer={(
          <Link href="/login" className="inline-flex items-center gap-1 text-foreground underline underline-offset-4">
            <IconArrowLeft className="size-3.5" />
            Back to sign in
          </Link>
        )}
      >
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get an email? Check spam, or{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-foreground underline underline-offset-4"
          >
            try a different email
          </button>
          .
        </p>
      </AuthFormShell>
    )
  }

  return (
    <AuthFormShell
      title="Forgot your password?"
      description="Enter your email and we'll send a reset link."
      footer={(
        <Link href="/login" className="inline-flex items-center gap-1 text-foreground underline underline-offset-4">
          <IconArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      )}
    >
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
        <Button type="submit" disabled={loading || !email} className="w-full">
          {loading ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>
    </AuthFormShell>
  )
}
