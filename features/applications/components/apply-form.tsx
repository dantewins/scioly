"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { IconCheck } from "@tabler/icons-react"
import { apiCall } from "@/lib/api-client"

interface EventOption {
  id: string
  name: string
  code: string | null
  isTrialEvent: boolean
}

interface Props {
  clubSlug: string
  events: EventOption[]
}

export function ApplyForm({ clubSlug, events }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    gradeLevel: "", shirtSize: "", isReturning: false, canTravel: false,
    whyJoin: "", contributionIdeas: "", awards: "",
    previousEvents: "", scienceClasses: "", mathClasses: "", questions: "",
  })

  function toggleEvent(eventId: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : prev.length < 6
          ? [...prev, eventId]
          : prev,
    )
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await apiCall("/api/public/apply", {
        method: "POST",
        body: JSON.stringify({
          clubSlug,
          ...form,
          gradeLevel: form.gradeLevel ? parseInt(form.gradeLevel) : undefined,
          eventChoices: selectedEvents,
        }),
      })
      setSubmitted(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="flex justify-center">
            <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
              <IconCheck className="size-6 text-green-600" />
            </div>
          </div>
          <h2 className="font-semibold">Application Submitted!</h2>
          <p className="text-sm text-muted-foreground">
            Your application has been received. You&apos;ll get an email when it&apos;s reviewed.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section: Personal Info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-sm">Personal Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="Avery"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Nguyen"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="name@school.edu"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Grade Level</Label>
              <Select value={form.gradeLevel} onValueChange={(v) => setForm(f => ({ ...f, gradeLevel: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose your grade" /></SelectTrigger>
                <SelectContent>
                  {["9","10","11","12"].map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shirt Size</Label>
              <Select value={form.shirtSize} onValueChange={(v) => setForm(f => ({ ...f, shirtSize: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a size" /></SelectTrigger>
                <SelectContent>
                  {["XS","S","M","L","XL","XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="isReturning" checked={form.isReturning} onCheckedChange={(v) => setForm(f => ({ ...f, isReturning: !!v }))} />
              <Label htmlFor="isReturning">I am a returning member</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="canTravel" checked={form.canTravel} onCheckedChange={(v) => setForm(f => ({ ...f, canTravel: !!v }))} />
              <Label htmlFor="canTravel">I can travel to competitions</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Event Preferences */}
      {events.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div>
              <h2 className="font-semibold text-sm">Event Preferences</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Select up to 6 events you&apos;re interested in (in any order).</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`event-${event.id}`}
                    checked={selectedEvents.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                    disabled={!selectedEvents.includes(event.id) && selectedEvents.length >= 6}
                  />
                  <Label htmlFor={`event-${event.id}`} className="text-sm font-normal cursor-pointer">
                    {event.name}{event.isTrialEvent && " (Trial)"}
                  </Label>
                </div>
              ))}
            </div>
            {selectedEvents.length >= 6 && (
              <p className="text-xs text-muted-foreground">Maximum 6 events selected.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section: Essay */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-sm">About You</h2>
          {(
            [
              ["whyJoin", "Why do you want to join Science Olympiad?"],
              ["contributionIdeas", "How do you plan to contribute to the team?"],
              ["previousEvents", "What Science Olympiad events have you done before?"],
              ["scienceClasses", "What science classes are you currently taking or have completed?"],
              ["mathClasses", "What math classes are you currently taking or have completed?"],
              ["awards", "List any academic awards or achievements (optional)."],
              ["questions", "Any questions or comments? (optional)"],
            ] as [keyof typeof form, string][]
          ).map(([field, label]) => (
            <div key={field} className="space-y-1.5">
              <Label>{label}</Label>
              <Textarea
                className="min-h-[96px] resize-y"
                value={form[field] as string}
                onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={
                  field === "whyJoin" ? "Share what excites you about Science Olympiad." :
                  field === "contributionIdeas" ? "Explain how you plan to help your team, events, or club culture." :
                  field === "previousEvents" ? "List past Science Olympiad events, if any." :
                  field === "scienceClasses" ? "Examples: Honors Chemistry, AP Biology, Physics." :
                  field === "mathClasses" ? "Examples: Algebra II, Precalculus, AP Calculus AB." :
                  field === "awards" ? "List competitions, honor roll, awards, or relevant recognitions." :
                  "Add anything else your officers should know."
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  )
}
