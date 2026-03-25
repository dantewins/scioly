import { Resend } from "resend"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not set.")
  return new Resend(key)
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const FROM = process.env.EMAIL_FROM ?? "Science Olympiad <noreply@yourdomain.com>"

export async function sendPasswordSetupEmail(
  to: string,
  token: string,
  firstName: string
) {
  const url = `${APP_URL}/set-password?token=${token}`
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Welcome! Set up your account",
    html: `
      <p>Hi ${firstName},</p>
      <p>Your application has been approved — welcome to Science Olympiad!</p>
      <p><a href="${url}">Click here to set your password</a> and log in to your member account.</p>
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
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Reminder: Club hour requirement",
    html: `
      <p>Hi ${firstName},</p>
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
    ? ` due on <strong>${dueAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>`
    : ""
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Reminder: Dues payment required",
    html: `
      <p>Hi ${firstName},</p>
      <p>You have an outstanding dues invoice: <strong>${invoiceTitle}</strong> for <strong>$${amount}</strong>${dueStr}.</p>
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
    ? ` by <strong>${dueAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>`
    : ""
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Action required: ${formName}`,
    html: `
      <p>Hi ${firstName},</p>
      <p>You have a required form that needs to be submitted: <strong>${formName}</strong>${dueStr}.</p>
      <p>Please log in to your member portal to submit or upload this form.</p>
    `,
  })
}
