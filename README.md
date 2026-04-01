# SciOly Club Manager

A full-stack club management platform for Science Olympiad teams. Handles the entire member lifecycle — from application and approval through hours tracking, dues collection, parent forms, event enrollment, team assignments, and competition scheduling — all in one place.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Custom JWT-based session auth (no NextAuth dependency)
- **Email:** Resend
- **UI:** shadcn/ui + Tailwind CSS + Radix UI primitives
- **Deployment:** Vercel + Neon or Supabase (PostgreSQL)

## Key Features

- **Member applications** — online application flow with focus-page upload; admins approve or reject
- **Approvals & onboarding** — automated password-setup email on approval
- **Hours tracking** — members submit hours by category; admins approve/reject with proof URLs
- **Dues & invoices** — per-member invoices with payment recording (cash, Zelle, etc.)
- **Parent forms** — required form types (waivers, medical, permission slips) with submission tracking
- **Event enrollment** — members express interest and rank events; tryout scores and skill ratings
- **Team management** — assign members to event teams with captain/alternate roles
- **Competition scheduling** — track invitationals, regionals, states, nationals with event time slots
- **Club events & attendance** — meetings, Super Saturdays, fundraisers with automatic hour credit
- **Role-based permissions** — granular permission flags per club role (view/edit members, finances, etc.)
- **Email notifications** — bulk hours warnings, dues reminders, and form reminders via admin dashboard
- **Practice tests** — PDF-based timed tests with answer keys and automatic scoring

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) below).

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing session tokens (min 32 chars) |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) for transactional email |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://yourdomain.com`) |
| `EMAIL_FROM` | Sender address shown in outgoing emails (e.g. `Science Olympiad <noreply@yourdomain.com>`) |

## Deployment

The recommended stack is **Vercel** (hosting) + **Neon** or **Supabase** (managed PostgreSQL).

1. Push the repo to GitHub and import it into Vercel.
2. Set all environment variables in the Vercel project settings.
3. Run `npx prisma migrate deploy` as a build step or one-time command against your production database.
4. Vercel will auto-deploy on every push to `main`.
