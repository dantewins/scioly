export function formatDateOnly(value: Date | null | undefined): string {
  if (!value) return ""
  return value.toLocaleDateString("en-US", { dateStyle: "medium" })
}

export function formatMonthYear(value: Date | null | undefined): string {
  if (!value) return ""
  return value.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function formatMonthDay(value: string | Date | null | undefined): string {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// "MAR 15" — compact uppercase month + day for editorial card meta.
export function formatDateCompact(value: string | Date | null | undefined): string {
  if (!value) return ""
  const date = typeof value === "string" ? new Date(value) : value
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  const day = date.getDate()
  return `${month} ${day}`
}

// Human relative-date copy: "today", "tomorrow", "in 12 days", "3 weeks ago".
// Returns null if input is null/undefined.
export function formatRelativeDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = typeof value === "string" ? new Date(value) : value

  const startOfDay = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const days = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000)

  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days === -1) return "yesterday"
  if (days > 1 && days < 14) return `in ${days} days`
  if (days >= 14 && days < 60) return `in ${Math.round(days / 7)} weeks`
  if (days >= 60) return `in ${Math.round(days / 30)} months`
  if (days < -1 && days > -14) return `${-days} days ago`
  if (days <= -14 && days > -60) return `${Math.round(-days / 7)} weeks ago`
  return `${Math.round(-days / 30)} months ago`
}
