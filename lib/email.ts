import { Resend } from "resend"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not set.")
  return new Resend(key)
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
}

function getEmailFrom() {
  const from = process.env.EMAIL_FROM?.trim()
  if (!from) throw new Error("EMAIL_FROM is not set.")
  return from
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function sendPasswordSetupEmail(
  to: string,
  token: string,
  firstName: string
) {
  const url = `${getAppUrl()}/set-password?token=${encodeURIComponent(token)}`
  const safeFirstName = escapeHtml(firstName)
  const safeUrl = escapeHtml(url)
  return getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject: "Welcome! Set up your account",
    html: `
      <p>Hi ${safeFirstName},</p>
      <p>Your application has been approved — welcome to Science Olympiad!</p>
      <p><a href="${safeUrl}">Click here to set your password</a> and log in to your member account.</p>
      <p>This link expires in <strong>72 hours</strong>. If it expires, contact an admin to resend it.</p>
    `,
  })
}

export async function sendHoursWarningEmail(
  to: string,
  firstName: string,
  earnedHours: number,
  requiredHours: number
) {
  const remaining = Math.max(0, requiredHours - earnedHours)
  const safeFirstName = escapeHtml(firstName)
  return getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject: "Reminder: Club hour requirement",
    html: `
      <p>Hi ${safeFirstName},</p>
      <p>This is a reminder that you currently have <strong>${earnedHours} approved hours</strong> out of your required <strong>${requiredHours} hours</strong> this season.</p>
      <p>You need <strong>${remaining} more hours</strong> to meet the requirement.</p>
      <p>Log in to your member portal to view and submit hours.</p>
    `,
  })
}

export async function sendDuesReminderEmail(
  to: string,
  firstName: string,
  invoiceTitle: string,
  amountDueCents: number,
  dueAt?: Date | null
) {
  const amount = (amountDueCents / 100).toFixed(2)
  const dueStr = dueAt
    ? ` due on <strong>${escapeHtml(dueAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}</strong>`
    : ""
  const safeFirstName = escapeHtml(firstName)
  const safeInvoiceTitle = escapeHtml(invoiceTitle)
  return getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject: "Reminder: Dues payment required",
    html: `
      <p>Hi ${safeFirstName},</p>
      <p>You have an outstanding dues invoice: <strong>${safeInvoiceTitle}</strong> for <strong>$${amount}</strong>${dueStr}.</p>
      <p>Please arrange payment with your club admin as soon as possible.</p>
    `,
  })
}

export async function sendFormReminderEmail(
  to: string,
  firstName: string,
  formName: string,
  dueAt?: Date | null
) {
  const dueStr = dueAt
    ? ` by <strong>${escapeHtml(dueAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}</strong>`
    : ""
  const safeFirstName = escapeHtml(firstName)
  const safeFormName = escapeHtml(formName)
  return getResend().emails.send({
    from: getEmailFrom(),
    to,
    subject: `Action required: ${formName}`,
    html: `
      <p>Hi ${safeFirstName},</p>
      <p>You have a required form that needs to be submitted: <strong>${safeFormName}</strong>${dueStr}.</p>
      <p>Please log in to your member portal to submit or upload this form.</p>
    `,
  })
}
