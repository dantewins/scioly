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
