"use client"

import { type FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IconAtom, IconLock, IconEye, IconEyeOff } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiCall } from "@/lib/api-client"

interface SetPasswordClientProps {
  token: string
}

export function SetPasswordClient({ token }: SetPasswordClientProps) {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token || token.length < 20) setError("Invalid or missing token.")
  }, [token])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      await apiCall("/api/auth/set-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })
      setDone(true)
      setTimeout(() => router.push("/login"), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-[var(--page-px)] py-[var(--page-py)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground">
            <IconAtom className="size-6" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-semibold">Set your password</h1>
          <p className="text-sm text-muted-foreground">
            Create a password to access your member account.
          </p>
        </div>

        {done ? (
          <div className="rounded-[var(--radius)] border border-green-200 bg-green-50 px-[var(--card-px)] py-[var(--card-py)] text-center text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            Password set! Redirecting to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose at least 8 characters"
                  required
                  disabled={!token}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((value) => !value)}
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <IconLock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  className="pl-9"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  disabled={!token}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-[var(--radius)] bg-destructive/10 px-[var(--card-px)] py-[var(--card-py)] text-xs text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? "Setting password…" : "Set password & log in"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
