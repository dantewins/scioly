import type { ZodError, ZodIssue } from "zod"

/**
 * Convert a Zod validation error into a single user-facing string.
 *
 * Standard form: `path.to.field: human message`. Empty path → just the
 * message. Both first issues only — multi-issue forms are out of scope
 * (the UI surfaces this in a toast).
 */
export function formatZodError(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return "Invalid input."
  return formatZodIssue(issue)
}

export function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") + ": " : ""
  return `${path}${issue.message}`
}
