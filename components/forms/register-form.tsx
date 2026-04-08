"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { apiCall } from "@/lib/api-client"
import { AuthFormShell } from "./auth-form-shell"

export function RegisterForm() {
  const router = useRouter()
  const { refreshUser } = useAuth()

  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState({
    clubName: "",
    schoolName: "",
    schoolDomain: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })

  function handleEmailBlur() {
    if (form.email && !form.schoolDomain) {
      const domain = form.email.split("@")[1]
      if (domain) {
        setForm((current) => ({ ...current, schoolDomain: domain.toLowerCase() }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      await apiCall("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      })
      toast.success("Club registered! Welcome.")
      await refreshUser()
      router.replace("/dashboard")
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      )
      setLoading(false)
    }
  }

  return (
    <AuthFormShell
      title="Register your club"
      description="Create your Science Olympiad workspace and primary admin account."
      footer={(
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      )}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clubName">Club Name</Label>
            <Input
              id="clubName"
              placeholder="Lincoln High Science Olympiad"
              value={form.clubName}
              onChange={(e) => setForm((current) => ({ ...current, clubName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              placeholder="Lincoln High School"
              value={form.schoolName}
              onChange={(e) => setForm((current) => ({ ...current, schoolName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                placeholder="Avery"
                onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                placeholder="Nguyen"
                onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Your Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="captain@school.edu"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              onBlur={handleEmailBlur}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="schoolDomain">
              School Email Domain{" "}
              <span className="text-xs font-normal text-muted-foreground">(auto-filled)</span>
            </Label>
            <Input
              id="schoolDomain"
              placeholder="school.edu"
              value={form.schoolDomain}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  schoolDomain: e.target.value.toLowerCase(),
                }))
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Members will need an email ending in @{form.schoolDomain || "school.edu"} to log in.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Choose at least 8 characters"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Creating club…
              </>
            ) : (
              "Create Club"
            )}
          </Button>
        </form>
    </AuthFormShell>
  )
}
