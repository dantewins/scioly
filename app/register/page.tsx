// app/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { IconAtom } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
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
      if (domain) setForm((f) => ({ ...f, schoolDomain: domain }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? "Registration failed.")
        return
      }
      toast.success("Club registered! Welcome.")
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <IconAtom className="size-8 text-primary" />
          </div>
          <CardTitle>Register Your Club</CardTitle>
          <CardDescription>
            Create a Science Olympiad club management account for your school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clubName">Club Name</Label>
              <Input
                id="clubName"
                placeholder="MAST Science Olympiad"
                value={form.clubName}
                onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                placeholder="Maritime and Science Technology Academy"
                value={form.schoolName}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.edu"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                onBlur={handleEmailBlur}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schoolDomain">
                School Email Domain{" "}
                <span className="text-muted-foreground font-normal text-xs">(auto-filled)</span>
              </Label>
              <Input
                id="schoolDomain"
                placeholder="school.edu"
                value={form.schoolDomain}
                onChange={(e) =>
                  setForm((f) => ({ ...f, schoolDomain: e.target.value.toLowerCase() }))
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
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating club..." : "Create Club"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
