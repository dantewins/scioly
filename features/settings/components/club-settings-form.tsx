// app/dashboard/settings/club-settings-form.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { apiCall } from "@/lib/api-client"

type EmailDomain = {
  id: string
  domain: string
  isPrimary: boolean
}

interface Props {
  club: {
    id: string
    name: string
    schoolName: string | null
    schoolDomain: string | null
    slug: string
  }
  initialDomains: EmailDomain[]
  canManage: boolean
}

export function ClubSettingsForm({ club, initialDomains, canManage }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [domainLoading, setDomainLoading] = useState(false)
  const [domains, setDomains] = useState(initialDomains)
  const [newDomain, setNewDomain] = useState("")
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null)
  const [editingDomainValue, setEditingDomainValue] = useState("")
  const [form, setForm] = useState({
    name: club.name,
    schoolName: club.schoolName ?? "",
    schoolDomain: club.schoolDomain ?? "",
  })

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiCall("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      })
      toast.success("Club settings saved.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.")
    } finally {
      setLoading(false)
    }
  }

  async function addSecondaryDomain() {
    if (!newDomain.trim()) return

    setDomainLoading(true)
    try {
      const data = await apiCall<EmailDomain[]>("/api/admin/settings/domains", {
        method: "POST",
        body: JSON.stringify({ domain: newDomain }),
      })
      setDomains(data)
      setNewDomain("")
      toast.success("Secondary domain added.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add email domain.")
    } finally {
      setDomainLoading(false)
    }
  }

  function startDomainEdit(domain: EmailDomain) {
    setEditingDomainId(domain.id)
    setEditingDomainValue(domain.domain)
  }

  async function saveDomainEdit(domainId: string) {
    if (!editingDomainValue.trim()) return

    setDomainLoading(true)
    try {
      const data = await apiCall<EmailDomain[]>(`/api/admin/settings/domains/${domainId}`, {
        method: "PATCH",
        body: JSON.stringify({ domain: editingDomainValue }),
      })
      setDomains(data)
      setEditingDomainId(null)
      setEditingDomainValue("")
      toast.success("Secondary domain updated.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update email domain.")
    } finally {
      setDomainLoading(false)
    }
  }

  async function removeDomain(domainId: string) {
    setDomainLoading(true)
    try {
      const data = await apiCall<EmailDomain[]>(`/api/admin/settings/domains/${domainId}`, {
        method: "DELETE",
      })
      setDomains(data)
      toast.success("Secondary domain removed.")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove email domain.")
    } finally {
      setDomainLoading(false)
    }
  }

  return (
    <Card>
      <CardContent>
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

          <Card className="space-y-3 border-border/60 px-[var(--card-px)] py-[var(--card-py)]">
            <div className="space-y-1">
              <Label>Secondary School Domains</Label>
              <p className="text-xs text-muted-foreground">
                Add alternate student email domains. The primary domain stays controlled by the field above.
              </p>
            </div>

            {domains.filter((domain) => !domain.isPrimary).length === 0 ? (
              <p className="text-sm text-muted-foreground">No secondary domains configured.</p>
            ) : (
              <div className="space-y-2">
                {domains
                  .filter((domain) => !domain.isPrimary)
                  .map((domain) => (
                    <Card
                      key={domain.id}
                      className="flex flex-col gap-2 border-border/60 px-[var(--card-px)] py-[var(--card-py)] sm:flex-row sm:items-center"
                    >
                      {editingDomainId === domain.id ? (
                        <Input
                          value={editingDomainValue}
                          onChange={(e) => setEditingDomainValue(e.target.value.toLowerCase())}
                          className="sm:flex-1"
                        />
                      ) : (
                        <div className="flex items-center gap-2 sm:flex-1">
                          <span className="font-mono text-sm">{domain.domain}</span>
                          <Badge variant="outline">Secondary</Badge>
                        </div>
                      )}

                      {canManage && (
                        <div className="flex gap-2">
                          {editingDomainId === domain.id ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={domainLoading || !editingDomainValue.trim()}
                                onClick={() => saveDomainEdit(domain.id)}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={domainLoading}
                                onClick={() => {
                                  setEditingDomainId(null)
                                  setEditingDomainValue("")
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={domainLoading}
                                onClick={() => startDomainEdit(domain)}
                              >
                                <IconPencil className="size-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={domainLoading}
                                onClick={() => removeDomain(domain.id)}
                              >
                                <IconTrash className="size-4" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            )}

            {canManage && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                  placeholder="district.k12.org"
                  className="sm:flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={domainLoading || !newDomain.trim()}
                  onClick={addSecondaryDomain}
                >
                  <IconPlus className="mr-1.5 size-[15px]" />
                  Add Domain
                </Button>
              </div>
            )}
          </Card>

          <Button type="submit" disabled={loading || domainLoading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
