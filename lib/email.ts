import { Resend } from "resend"
import { renderEmail } from "./email-template"

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

function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

interface SendPayload {
  to: string
  subject: string
  html: string
}

// Dev convenience: with RESEND_DEV_LOG_ONLY=1, log the payload instead of
// calling Resend. Lets developers exercise email flows without a real API key.
async function sendOrLog(payload: SendPayload): Promise<{ id?: string }> {
  const devLog =
    process.env.RESEND_DEV_LOG_ONLY === "1" ||
    process.env.RESEND_DEV_LOG_ONLY?.toLowerCase() === "true"
  if (devLog) {
    console.log(
      `[email] (dev-log) to=${payload.to} subject=${JSON.stringify(payload.subject)}\n${payload.html}`,
    )
    return { id: "dev-log" }
  }
  const result = await getResend().emails.send({
    from: getEmailFrom(),
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  })
  return { id: result.data?.id }
}

// ─── Applicant lifecycle ────────────────────────────────────────────────────

export async function sendPasswordSetupEmail(
  to: string,
  token: string,
  firstName: string,
) {
  const url = `${getAppUrl()}/set-password?token=${encodeURIComponent(token)}`
  const safeName = escapeHtml(firstName)
  const html = renderEmail({
    heading: "Welcome aboard",
    intro: `Hi ${safeName}, your application was approved — welcome to Science Olympiad!`,
    body:
      "Set your password to log in to your member account. This link expires in <strong>72 hours</strong>; if it lapses, your club admin can resend it.",
    ctaLabel: "Set your password",
    ctaUrl: url,
  })
  return sendOrLog({ to, subject: "Welcome! Set up your account", html })
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  firstName: string,
) {
  const url = `${getAppUrl()}/set-password?token=${encodeURIComponent(token)}`
  const safeName = escapeHtml(firstName)
  const html = renderEmail({
    heading: "Reset your password",
    intro: `Hi ${safeName}, we got a request to reset your password.`,
    body:
      "Click the button below to choose a new password. This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.",
    ctaLabel: "Set a new password",
    ctaUrl: url,
  })
  return sendOrLog({ to, subject: "Reset your password", html })
}

export async function sendApplicationReceivedEmail(
  to: string,
  firstName: string,
  clubName: string,
) {
  const safeName = escapeHtml(firstName)
  const safeClub = escapeHtml(clubName)
  const html = renderEmail({
    heading: "Application received",
    intro: `Hi ${safeName}, thanks for applying to ${safeClub}.`,
    body:
      "An admin will review your application soon. We'll email you when there's a decision — usually within a few days.",
  })
  return sendOrLog({ to, subject: "We got your application", html })
}

export async function sendApplicationRejectedEmail(
  to: string,
  firstName: string,
  clubName: string,
  decisionNotes?: string | null,
) {
  const safeName = escapeHtml(firstName)
  const safeClub = escapeHtml(clubName)
  const reasonBlock = decisionNotes?.trim()
    ? `<p style="margin:12px 0;padding:12px 14px;background:#f6f7fb;border-radius:8px;color:#475569;font-size:14px;">${escapeHtml(decisionNotes.trim())}</p>`
    : ""
  const html = renderEmail({
    heading: "Application decision",
    intro: `Hi ${safeName}, thanks for your interest in ${safeClub}.`,
    body: `Unfortunately, we aren't able to offer you a spot this season.${reasonBlock}<p style="margin:12px 0 0 0;">You're welcome to apply again next season. If you have questions, reach out to your club admin.</p>`,
  })
  return sendOrLog({ to, subject: "Application update", html })
}

export async function sendApplicationWaitlistedEmail(
  to: string,
  firstName: string,
  clubName: string,
  decisionNotes?: string | null,
) {
  const safeName = escapeHtml(firstName)
  const safeClub = escapeHtml(clubName)
  const reasonBlock = decisionNotes?.trim()
    ? `<p style="margin:12px 0;padding:12px 14px;background:#f6f7fb;border-radius:8px;color:#475569;font-size:14px;">${escapeHtml(decisionNotes.trim())}</p>`
    : ""
  const html = renderEmail({
    heading: "You're on the waitlist",
    intro: `Hi ${safeName}, your ${safeClub} application has been waitlisted.`,
    body: `If a spot opens up, you'll hear from us. No action needed for now.${reasonBlock}`,
  })
  return sendOrLog({ to, subject: "Application update — waitlisted", html })
}

// ─── Review notifications ───────────────────────────────────────────────────

export async function sendHoursReviewedEmail(
  to: string,
  firstName: string,
  entryTitle: string,
  hours: number,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string | null,
) {
  const safeName = escapeHtml(firstName)
  const safeTitle = escapeHtml(entryTitle)
  const hoursStr = hours.toFixed(1)
  const approved = status === "APPROVED"
  const heading = approved ? "Hours approved" : "Hours rejected"
  const intro = approved
    ? `Hi ${safeName}, your hour entry <strong>${safeTitle}</strong> (${hoursStr}h) was approved.`
    : `Hi ${safeName}, your hour entry <strong>${safeTitle}</strong> (${hoursStr}h) was not approved.`
  const reasonBlock =
    !approved && rejectionReason?.trim()
      ? `<p style="margin:12px 0;padding:12px 14px;background:#f6f7fb;border-radius:8px;color:#475569;font-size:14px;"><strong>Reason:</strong> ${escapeHtml(rejectionReason.trim())}</p>`
      : ""
  const html = renderEmail({
    heading,
    intro,
    body: approved
      ? "Your approved hours now count toward your season total."
      : `You can edit and resubmit this entry from your hours page.${reasonBlock}`,
    ctaLabel: "View your hours",
    ctaUrl: `${getAppUrl()}/dashboard/hours`,
  })
  return sendOrLog({ to, subject: `Hours ${approved ? "approved" : "rejected"}: ${entryTitle}`, html })
}

export async function sendFormReviewedEmail(
  to: string,
  firstName: string,
  formName: string,
  status: "VERIFIED" | "REJECTED",
  rejectionReason?: string | null,
) {
  const safeName = escapeHtml(firstName)
  const safeForm = escapeHtml(formName)
  const verified = status === "VERIFIED"
  const heading = verified ? "Form verified" : "Form rejected"
  const intro = verified
    ? `Hi ${safeName}, your <strong>${safeForm}</strong> submission was verified.`
    : `Hi ${safeName}, your <strong>${safeForm}</strong> submission was rejected.`
  const reasonBlock =
    !verified && rejectionReason?.trim()
      ? `<p style="margin:12px 0;padding:12px 14px;background:#f6f7fb;border-radius:8px;color:#475569;font-size:14px;"><strong>Reason:</strong> ${escapeHtml(rejectionReason.trim())}</p>`
      : ""
  const html = renderEmail({
    heading,
    intro,
    body: verified
      ? "Thanks — this form is now marked complete on your account."
      : `Please review and resubmit when you can.${reasonBlock}`,
    ctaLabel: "View your forms",
    ctaUrl: `${getAppUrl()}/dashboard/forms`,
  })
  return sendOrLog({ to, subject: `Form ${verified ? "verified" : "rejected"}: ${formName}`, html })
}

export async function sendInvoiceIssuedEmail(
  to: string,
  firstName: string,
  invoiceTitle: string,
  amountCents: number,
  dueAt?: Date | null,
) {
  const safeName = escapeHtml(firstName)
  const safeTitle = escapeHtml(invoiceTitle)
  const amount = (amountCents / 100).toFixed(2)
  const dueStr = dueAt ? ` It's due on <strong>${escapeHtml(formatDateLong(dueAt))}</strong>.` : ""
  const html = renderEmail({
    heading: "New invoice issued",
    intro: `Hi ${safeName}, a new invoice has been issued to you.`,
    body: `<strong>${safeTitle}</strong> for <strong>$${amount}</strong>.${dueStr}<br/><br/>Talk to your club admin about how to pay.`,
    ctaLabel: "View your finances",
    ctaUrl: `${getAppUrl()}/dashboard/finances`,
  })
  return sendOrLog({ to, subject: `Invoice: ${invoiceTitle}`, html })
}

// ─── Reminder emails (admin-triggered bulk sends — unchanged behavior) ───────

export async function sendHoursWarningEmail(
  to: string,
  firstName: string,
  earnedHours: number,
  requiredHours: number,
) {
  const remaining = Math.max(0, requiredHours - earnedHours)
  const safeName = escapeHtml(firstName)
  const html = renderEmail({
    heading: "Hours reminder",
    intro: `Hi ${safeName}, here's where your hours stand this season.`,
    body: `You have <strong>${earnedHours} approved hours</strong> out of your required <strong>${requiredHours}</strong>. You need <strong>${remaining} more</strong> to meet the requirement.`,
    ctaLabel: "Log hours",
    ctaUrl: `${getAppUrl()}/dashboard/hours`,
  })
  return sendOrLog({ to, subject: "Reminder: Club hour requirement", html })
}

export async function sendDuesReminderEmail(
  to: string,
  firstName: string,
  invoiceTitle: string,
  amountDueCents: number,
  dueAt?: Date | null,
) {
  const amount = (amountDueCents / 100).toFixed(2)
  const dueStr = dueAt ? ` It's due on <strong>${escapeHtml(formatDateLong(dueAt))}</strong>.` : ""
  const safeName = escapeHtml(firstName)
  const safeTitle = escapeHtml(invoiceTitle)
  const html = renderEmail({
    heading: "Dues reminder",
    intro: `Hi ${safeName}, you have an outstanding dues invoice.`,
    body: `<strong>${safeTitle}</strong> for <strong>$${amount}</strong>.${dueStr}<br/><br/>Please arrange payment with your club admin as soon as possible.`,
    ctaLabel: "View your finances",
    ctaUrl: `${getAppUrl()}/dashboard/finances`,
  })
  return sendOrLog({ to, subject: "Reminder: Dues payment required", html })
}

export async function sendFormReminderEmail(
  to: string,
  firstName: string,
  formName: string,
  dueAt?: Date | null,
) {
  const dueStr = dueAt ? ` by <strong>${escapeHtml(formatDateLong(dueAt))}</strong>` : ""
  const safeName = escapeHtml(firstName)
  const safeForm = escapeHtml(formName)
  const html = renderEmail({
    heading: "Form reminder",
    intro: `Hi ${safeName}, you have a required form to submit.`,
    body: `Please complete <strong>${safeForm}</strong>${dueStr}.<br/><br/>Log in to your member portal to submit or upload it.`,
    ctaLabel: "Open forms",
    ctaUrl: `${getAppUrl()}/dashboard/forms`,
  })
  return sendOrLog({ to, subject: `Action required: ${formName}`, html })
}
