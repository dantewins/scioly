import { z } from "zod"

// ── Enums & Labels ──────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  "MEETING",
  "SUPER_SATURDAY",
  "FUNDRAISER",
  "WORKSHOP",
  "FIELD_TRIP",
  "OTHER",
] as const

export const TYPE_LABELS: Record<string, string> = {
  MEETING: "Meeting",
  SUPER_SATURDAY: "Super Saturday",
  FUNDRAISER: "Fundraiser",
  WORKSHOP: "Workshop",
  FIELD_TRIP: "Field Trip",
  OTHER: "Other",
}

export const TYPE_COLORS: Record<string, string> = {
  MEETING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  SUPER_SATURDAY:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  FUNDRAISER:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  WORKSHOP:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  FIELD_TRIP:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

// ── Schemas ─────────────────────────────────────────────────────────────────

export const clubEventSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().default(""),
  startsAt: z.string().default(""),
  endsAt: z.string().default(""),
  hoursValue: z.number().default(0),
  attendeeCount: z.number().default(0),
  isEnded: z.boolean().default(false),
})

export type ClubEventSummary = z.infer<typeof clubEventSummarySchema>

export const pagedClubEventsSchema = z.object({
  items: z.array(clubEventSummarySchema),
  total: z.number(),
})

export const hourCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
})

export type HourCategory = z.infer<typeof hourCategorySchema>

export const memberAttendeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  attended: z.boolean(),
})

export const clubEventDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().default(""),
  startsAt: z.string().default(""),
  endsAt: z.string().default(""),
  hoursValue: z.number().default(0),
  categoryId: z.string().nullable().default(null),
  categoryName: z.string().nullable().default(null),
  notes: z.string().default(""),
  attendeeCount: z.number().default(0),
  members: z.array(memberAttendeeSchema).default([]),
})

export type ClubEventDetail = z.infer<typeof clubEventDetailSchema>

// ── Form State ──────────────────────────────────────────────────────────────

export type ClubEventFormState = {
  name: string
  type: string
  location: string
  startsAt: string
  endsAt: string
  hoursValue: string
  categoryId: string
  notes: string
}

export const emptyClubEventForm: ClubEventFormState = {
  name: "",
  type: "MEETING",
  location: "",
  startsAt: "",
  endsAt: "",
  hoursValue: "0",
  categoryId: "",
  notes: "",
}

// ── Shared style ────────────────────────────────────────────────────────────

export const selectClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"
