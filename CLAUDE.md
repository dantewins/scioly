# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Science Olympiad club management app built with Next.js 16 (App Router), React 19, TypeScript, Prisma 7 (PostgreSQL), and shadcn/ui. Manages members, applications, events, teams, finances, and volunteer hours.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema changes to database
npx prisma studio    # Database GUI
npx tsx prisma/seed.ts  # Seed database
```

## Architecture

**Routing:** Next.js App Router. Public routes: `/`, `/apply`, `/login`. Protected routes: `/dashboard/*`. API routes split into `/api/auth/*`, `/api/admin/*`, `/api/public/*`.

**Auth:** JWT sessions (jose + bcryptjs) stored in HTTP-only cookies (7-day TTL). `lib/auth.ts` handles token creation/verification. `context/AuthContext.tsx` provides user state and role-based permission helpers (`canAccessAdmin`, `canManageMembers`, etc.).

**Roles (RBAC):** `WEBSITE_OWNER > ADMIN > BOARD_MEMBER > MEMBER > APPLICANT`. API routes check roles via `getCurrentUser()` before responding.

**Database:** Prisma ORM with PostgreSQL. Schema at `prisma/schema.prisma` with 15+ models. Prisma client uses singleton pattern (`lib/prisma.ts`). Multi-model mutations use `$transaction`.

**UI:** shadcn/ui (new-york style) components in `components/ui/`. Forms in `components/forms/`. Tables in `components/tables/`. Tailwind CSS 4 for styling. Path alias `@/*` maps to project root.

**Key patterns:**
- API routes return JSON, use standard HTTP verbs
- Forms handle `multipart/form-data` for file uploads
- `@tanstack/react-table` for data tables
- Zod for schema validation
- sonner for toast notifications
