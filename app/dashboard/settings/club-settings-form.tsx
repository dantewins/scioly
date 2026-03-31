// app/dashboard/settings/club-settings-form.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  club: {
    id: string
    name: string
    schoolName: string | null
    schoolDomain: string | null
    slug: string
  }
}

export function ClubSettingsForm({ club }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: club.name,
    schoolName: club.schoolName ?? "",
    schoolDomain: club.schoolDomain ?? "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to save.")
        return
      }
      toast.success("Club settings saved.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clubName">Club Name</Label>
            <Input
              id="clubName"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              value={form.schoolName}
              onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schoolDomain">School Email Domain</Label>
            <Input
              id="schoolDomain"
              value={form.schoolDomain}
              onChange={(e) =>
                setForm((f) => ({ ...f, schoolDomain: e.target.value.toLowerCase() }))
              }
              placeholder="school.edu"
            />
            <p className="text-xs text-muted-foreground">
              Members must use an email ending in @{form.schoolDomain || "school.edu"}.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Club URL</Label>
            <Input value={`/apply/${club.slug}`} readOnly className="bg-muted text-muted-foreground" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
