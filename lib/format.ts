export function formatDate(value: Date | null | undefined): string {
  if (!value) return ""
  return value.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatDateOnly(value: Date | null | undefined): string {
  if (!value) return ""
  return value.toLocaleDateString("en-US", { dateStyle: "medium" })
}

export function extractUploadedFileName(notes: string | null | undefined): string {
  if (!notes) return ""
  const match = notes.match(/^Uploaded file:\s(.+?)\s\(/)
  return match?.[1] ?? ""
}
