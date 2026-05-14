# SciOly Club Manager

A full-stack club management platform for Science Olympiad teams. Handles the entire member lifecycle — from application and approval through hours tracking, dues collection, parent forms, event enrollment, team assignments, and competition scheduling — all in one place.

## What This Is

SciOly Club Manager is a private web app for a Science Olympiad team. It replaces spreadsheets and scattered Google Forms with a single dashboard that tracks everything that happens in a season.

**Admins** can:
- Review and approve/reject member applications (automated password-setup email on approval)
- Manage member profiles, roles, and season status
- Configure Science Olympiad events and manage event enrollment + tryout scores
- Build teams and assign members with captain/alternate roles
- Schedule competitions (invitationals, regionals, states) with per-event time slots
- Create and schedule club events (meetings, Super Saturdays, fundraisers) with attendance tracking
- Approve or reject member-submitted hours across configurable categories
- Issue invoices and record payments (cash, Zelle, check, etc.)
- Define required parent forms (waivers, medical, permission slips) and track submission status
- Send bulk email reminders for hours, dues, and missing forms
- Manage club settings, seasons, and granular role permissions

**Members** can:
- Apply to join through a public application page
- View their own hours, dues balance, and form submission status
- Submit hours entries for admin review
- Submit parent forms with file URL upload
- See their event enrollments and team assignments

## Tech Stack

- **Next.js 16** — App Router, Server Components, API routes
- **TypeScript** — strict mode throughout
- **Prisma + PostgreSQL** — full relational data model
- **Custom JWT auth** — httpOnly cookie sessions, no NextAuth
- **Resend** — transactional email
- **shadcn/ui + Tailwind CSS** — component library and styling

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_JWT_SECRET` | Secret for signing session tokens (min 32 chars). `JWT_SECRET` is accepted as a legacy fallback. |
| `RESEND_API_KEY` | API key from resend.com for email |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://yourdomain.com`) |
| `EMAIL_FROM` | Sender shown in outgoing emails |
