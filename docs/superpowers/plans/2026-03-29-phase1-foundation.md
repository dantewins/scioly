# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean schema rewrite, working auth (login/register/set-password), dashboard shell with permission-gated sidebar, club settings + roles management, and a runnable seed.

**Architecture:** Multi-tenant SaaS — every model scoped by `clubId`. Permissions are stored as a flat JSON flag object on `ClubRole` (Discord-style, 52 flags across 13 areas). `WEBSITE_OWNER` bypasses all checks. API routes use `withPermission(flag)` from `lib/api.ts`. Dashboard pages are server components that call `getCurrentUser()` directly.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7 (PostgreSQL), jose (JWT HS256), bcryptjs, Resend, shadcn/ui (new-york), @tabler/icons-react, Sonner, Zod v4

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Rewrite | New schema: simplified UserRole, ClubRole.permissions, PracticeTest models, drop Tournament |
| `prisma/seed.ts` | Rewrite | Sample club, season, WEBSITE_OWNER, default roles |
| `lib/permissions.ts` | Create | PermissionFlag types, hasPermission/canView/canCreate/canEdit/canDelete helpers |
| `lib/auth.ts` | Update | getCurrentUser returns CurrentUser with permissions map |
| `lib/api.ts` | Rewrite | withPermission(flag), withMemberAuth, ok(), err() |
| `lib/db.ts` | Carry forward | getActiveSeason, getMemberSeason — no changes needed |
| `lib/email.ts` | Carry forward | sendPasswordSetupEmail — no changes needed |
| `lib/cookies.ts` | Carry forward | setSessionCookie, clearSessionCookie — no changes needed |
| `lib/prisma.ts` | Carry forward | Prisma client singleton — no changes needed |
| `context/AuthContext.tsx` | Rewrite | Exposes hasPermission/canView/canCreate/canEdit/canDelete, isOwner |
| `middleware.ts` | Update | Redirect unauthenticated from /dashboard; redirect authenticated from /login |
| `app/login/page.tsx` | Carry forward | No changes to UI needed |
| `app/register/page.tsx` | Create | Club self-registration form |
| `app/set-password/page.tsx` | Carry forward | No changes to UI needed |
| `app/api/auth/login/route.ts` | Update | Add schoolDomain enforcement |
| `app/api/auth/logout/route.ts` | Carry forward | No changes needed |
| `app/api/auth/register/route.ts` | Create | Creates club + WEBSITE_OWNER + default roles |
| `app/api/auth/set-password/route.ts` | Carry forward | No changes needed |
| `app/api/admin/settings/route.ts` | Create | PATCH club name/domain |
| `app/api/admin/roles/route.ts` | Create | GET list + POST create role |
| `app/api/admin/roles/[roleId]/route.ts` | Create | PATCH edit + DELETE role |
| `app/api/admin/members/[id]/roles/route.ts` | Create | POST/DELETE assign/remove role from member |
| `app/dashboard/layout.tsx` | Carry forward | No changes needed |
| `components/app-sidebar.tsx` | Rewrite | Use new permission flags for nav gating |
| `app/dashboard/settings/page.tsx` | Create | Club info + roles management UI |
| `app/dashboard/[all other sections]` | Create stubs | Placeholder pages (replaced by Phases 2–4) |

---

## Task 1: Add jose dependency

**Files:**
- Modify: `package.json`

- [x] **Step 1: Install jose**

```bash
npm install jose
```

Expected output: `added 1 package` (jose is used in lib/auth.ts but was missing from package.json).

- [x] **Step 2: Verify TypeScript can find it**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no "Cannot find module 'jose'" errors (other type errors may exist — that's fine).

- [x] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add jose JWT library"
```

---

## Task 2: Prisma schema rewrite

**Files:**
- Rewrite: `prisma/schema.prisma`

- [x] **Step 1: Write new schema**

Replace the entire contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum UserRole {
  WEBSITE_OWNER
  MEMBER
  APPLICANT
}

enum MembershipStatus {
  PENDING
  ACTIVE
  INACTIVE
  ALUMNI
  REMOVED
}

enum EventEnrollmentStatus {
  INTERESTED
  TRYOUT_PENDING
  ACTIVE
  WAITLISTED
  DROPPED
}

enum CompetitionType {
  PRACTICE
  INVITATIONAL
  REGIONAL
  STATE
  NATIONAL
  OTHER
}

enum TeamMemberRole {
  MEMBER
  CAPTAIN
  ALTERNATE
}

enum FormCategory {
  WAIVER
  MEDICAL
  PERMISSION
  CODE_OF_CONDUCT
  TRAVEL
  PHOTO_RELEASE
  CLUB_CONTRACT
  OTHER
}

enum FormSubmissionStatus {
  NOT_STARTED
  SUBMITTED
  VERIFIED
  REJECTED
  EXPIRED
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PARTIALLY_PAID
  PAID
  VOID
  OVERDUE
}

enum PaymentMethod {
  CASH
  CHECK
  CARD
  ZELLE
  VENMO
  PAYPAL
  OTHER
}

enum HourEntryStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ResourceType {
  LINK
  FILE
  DOC
  VIDEO
  SHEET
  FOLDER
  OTHER
}

enum ClubEventType {
  MEETING
  SUPER_SATURDAY
  FUNDRAISER
  WORKSHOP
  FIELD_TRIP
  OTHER
}

// ─── Core ─────────────────────────────────────────────────────────────────────

model Club {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  schoolName   String?
  schoolDomain String?
  description  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  users        User[]
  seasons      Season[]
  roles        ClubRole[]
  activityLogs ActivityLog[]
}

model Season {
  id         String   @id @default(cuid())
  clubId     String
  name       String
  schoolYear String
  startsAt   DateTime
  endsAt     DateTime
  isActive   Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  club           Club           @relation(fields: [clubId], references: [id], onDelete: Cascade)
  members        MemberSeason[]
  events         Event[]
  competitions   Competition[]
  formTypes      FormType[]
  invoices       DuesInvoice[]
  hourCategories HourCategory[]
  clubEvents     ClubEvent[]
  resources      Resource[]
  announcements  Announcement[]
  practiceTests  PracticeTest[]

  @@unique([clubId, schoolYear])
  @@index([clubId, isActive])
}

model User {
  id             String    @id @default(cuid())
  clubId         String
  email          String    @unique
  passwordHash   String?
  role           UserRole  @default(MEMBER)
  firstName      String
  lastName       String
  displayName    String?
  gradeLevel     Int?
  graduationYear Int?
  studentNumber  String?
  phone          String?
  imageUrl       String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  club                 Club                 @relation(fields: [clubId], references: [id], onDelete: Cascade)
  seasonMemberships    MemberSeason[]
  verifiedForms        FormSubmission[]     @relation("VerifiedForms")
  recordedPayments     PaymentRecord[]      @relation("RecordedPayments")
  approvedHours        HourEntry[]          @relation("ApprovedHours")
  uploadedResources    Resource[]           @relation("UploadedResources")
  createdAnnouncements Announcement[]       @relation("AnnouncementCreator")
  activityLogs         ActivityLog[]        @relation("ActivityActor")
  passwordSetupTokens  PasswordSetupToken[]

  @@index([clubId, role])
  @@index([lastName, firstName])
}

model PasswordSetupToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique @default(cuid())
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model MemberSeason {
  id               String           @id @default(cuid())
  userId           String
  seasonId         String
  membershipStatus MembershipStatus @default(PENDING)
  joinedAt         DateTime         @default(now())
  isReturning      Boolean          @default(false)
  canTravel        Boolean          @default(false)
  shirtSize        String?
  notes            String?

  whyJoin                String?
  contributionIdeas      String?
  awards                 String?
  previousEvents         String?
  scienceClasses         String?
  mathClasses            String?
  questions              String?
  focusPageFileUrl       String?
  applicationSubmittedAt DateTime?
  statusChangedAt        DateTime?
  statusReason           String?

  expectedHours Decimal? @db.Decimal(5, 2)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user             User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  season           Season                @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  eventEnrollments EventEnrollment[]
  teamAssignments  TeamAssignment[]
  formSubmissions  FormSubmission[]
  invoices         DuesInvoice[]
  payments         PaymentRecord[]
  hourEntries      HourEntry[]
  eventAttendances ClubEventAttendance[]
  practiceAttempts PracticeAttempt[]
  roles            MemberRole[]

  @@unique([userId, seasonId])
  @@index([seasonId, membershipStatus])
}

// ─── Roles ────────────────────────────────────────────────────────────────────

// ClubRole is club-scoped (not season-scoped). Members are assigned roles per MemberSeason.
// permissions is a flat JSON object: { "view_members": true, "edit_members": false, ... }
model ClubRole {
  id          String   @id @default(cuid())
  clubId      String
  name        String
  description String?
  permissions Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  club    Club         @relation(fields: [clubId], references: [id], onDelete: Cascade)
  members MemberRole[]

  @@unique([clubId, name])
  @@index([clubId])
}

model MemberRole {
  id             String   @id @default(cuid())
  memberSeasonId String
  clubRoleId     String
  assignedAt     DateTime @default(now())

  memberSeason MemberSeason @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)
  clubRole     ClubRole     @relation(fields: [clubRoleId], references: [id], onDelete: Cascade)

  @@unique([memberSeasonId, clubRoleId])
  @@index([memberSeasonId])
  @@index([clubRoleId])
}

// ─── Events & Competitions ────────────────────────────────────────────────────

model Event {
  id              String   @id @default(cuid())
  seasonId        String
  code            String?
  name            String
  description     String?
  minParticipants Int      @default(2)
  maxParticipants Int      @default(2)
  isTrialEvent    Boolean  @default(false)
  sortOrder       Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  season         Season              @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  enrollments    EventEnrollment[]
  teams          Team[]
  eventSchedules EventSchedule[]
  resources      Resource[]
  announcements  Announcement[]
  practiceTests  PracticeTest[]

  @@unique([seasonId, name])
  @@index([seasonId, sortOrder])
}

model Competition {
  id          String          @id @default(cuid())
  seasonId    String
  name        String
  type        CompetitionType @default(OTHER)
  location    String?
  startsAt    DateTime
  endsAt      DateTime?
  isPublished Boolean         @default(false)
  notes       String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  season         Season          @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  teams          Team[]
  eventSchedules EventSchedule[]
  resources      Resource[]
  announcements  Announcement[]

  @@unique([seasonId, name])
  @@index([seasonId, type])
}

model EventSchedule {
  id            String   @id @default(cuid())
  competitionId String
  eventId       String
  timeSlot      Int
  slotLabel     String?

  competition Competition @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  event       Event       @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([competitionId, eventId])
  @@index([competitionId])
}

model Team {
  id            String         @id @default(cuid())
  seasonId      String
  competitionId String?
  eventId       String?
  label         String
  memberLimit   Int?
  notes         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  season      Season           @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  competition Competition?     @relation(fields: [competitionId], references: [id], onDelete: SetNull)
  event       Event?           @relation(fields: [eventId], references: [id], onDelete: SetNull)
  assignments TeamAssignment[]
  resources   Resource[]
  announcements Announcement[]

  @@index([seasonId])
  @@index([competitionId])
  @@index([eventId])
}

model TeamAssignment {
  id             String         @id @default(cuid())
  teamId         String
  memberSeasonId String
  role           TeamMemberRole @default(MEMBER)
  seatNumber     Int?
  assignedAt     DateTime       @default(now())
  notes          String?

  team         Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  memberSeason MemberSeason @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)

  @@unique([teamId, memberSeasonId])
  @@index([teamId, role])
  @@index([memberSeasonId])
}

model EventEnrollment {
  id                String                @id @default(cuid())
  memberSeasonId    String
  eventId           String
  status            EventEnrollmentStatus @default(INTERESTED)
  preferenceRank    Int?
  tryoutScore       Decimal?              @db.Decimal(6, 2)
  skillRating       Int?
  notes             String?
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  memberSeason MemberSeason @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)
  event        Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([memberSeasonId, eventId])
  @@index([eventId, status])
  @@index([memberSeasonId])
}

// ─── Hours ────────────────────────────────────────────────────────────────────

model HourCategory {
  id                 String   @id @default(cuid())
  seasonId           String
  name               String
  description        String?
  requiredHours      Decimal? @db.Decimal(5, 2)
  requiresApproval   Boolean  @default(true)
  proofInstructions  String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  season      Season      @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  hourEntries HourEntry[]
  clubEvents  ClubEvent[]

  @@unique([seasonId, name])
  @@index([seasonId])
}

model HourEntry {
  id              String          @id @default(cuid())
  memberSeasonId  String
  categoryId      String
  title           String
  description     String?
  totalHours      Decimal         @db.Decimal(5, 2)
  proofUrl        String?
  status          HourEntryStatus @default(PENDING)
  submittedAt     DateTime        @default(now())
  approvedAt      DateTime?
  approvedById    String?
  rejectionReason String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  memberSeason MemberSeason         @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)
  category     HourCategory         @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  approvedBy   User?                @relation("ApprovedHours", fields: [approvedById], references: [id], onDelete: SetNull)
  attendance   ClubEventAttendance?

  @@index([memberSeasonId, status])
  @@index([categoryId])
  @@index([approvedById])
}

// ─── Club Events ──────────────────────────────────────────────────────────────

model ClubEvent {
  id         String        @id @default(cuid())
  seasonId   String
  name       String
  type       ClubEventType @default(OTHER)
  location   String?
  startsAt   DateTime
  endsAt     DateTime?
  hoursValue Decimal       @db.Decimal(5, 2) @default(0)
  categoryId String?
  notes      String?
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  season     Season                @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  category   HourCategory?         @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  attendance ClubEventAttendance[]

  @@index([seasonId, startsAt])
}

model ClubEventAttendance {
  id             String   @id @default(cuid())
  clubEventId    String
  memberSeasonId String
  markedAt       DateTime @default(now())
  hourEntryId    String?  @unique

  clubEvent    ClubEvent    @relation(fields: [clubEventId], references: [id], onDelete: Cascade)
  memberSeason MemberSeason @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)
  hourEntry    HourEntry?   @relation(fields: [hourEntryId], references: [id], onDelete: SetNull)

  @@unique([clubEventId, memberSeasonId])
  @@index([memberSeasonId])
}

// ─── Finances ─────────────────────────────────────────────────────────────────

model DuesInvoice {
  id              String        @id @default(cuid())
  seasonId        String
  memberSeasonId  String
  title           String
  description     String?
  amountCents     Int
  amountPaidCents Int           @default(0)
  status          InvoiceStatus @default(OPEN)
  dueAt           DateTime?
  issuedAt        DateTime      @default(now())
  paidAt          DateTime?
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  season       Season          @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  memberSeason MemberSeason    @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)
  payments     PaymentRecord[]

  @@index([seasonId, status])
  @@index([memberSeasonId, status])
}

model PaymentRecord {
  id              String        @id @default(cuid())
  invoiceId       String
  memberSeasonId  String
  amountCents     Int
  method          PaymentMethod @default(OTHER)
  referenceNumber String?
  receiptUrl      String?
  notes           String?
  paidAt          DateTime      @default(now())
  recordedById    String?
  createdAt       DateTime      @default(now())

  invoice      DuesInvoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  memberSeason MemberSeason @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)
  recordedBy   User?        @relation("RecordedPayments", fields: [recordedById], references: [id], onDelete: SetNull)

  @@index([invoiceId])
  @@index([memberSeasonId])
  @@index([recordedById])
}

// ─── Forms ────────────────────────────────────────────────────────────────────

model FormType {
  id             String       @id @default(cuid())
  seasonId       String
  name           String
  category       FormCategory @default(OTHER)
  description    String?
  isRequired     Boolean      @default(true)
  requiresUpload Boolean      @default(false)
  dueAt          DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  season      Season           @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  submissions FormSubmission[]

  @@unique([seasonId, name])
  @@index([seasonId, category])
}

model FormSubmission {
  id              String               @id @default(cuid())
  formTypeId      String
  memberSeasonId  String
  status          FormSubmissionStatus @default(NOT_STARTED)
  acknowledgement Boolean              @default(false)
  fileUrl         String?
  submittedAt     DateTime?
  verifiedAt      DateTime?
  verifiedById    String?
  rejectionReason String?
  notes           String?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  formType     FormType     @relation(fields: [formTypeId], references: [id], onDelete: Cascade)
  memberSeason MemberSeason @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)
  verifiedBy   User?        @relation("VerifiedForms", fields: [verifiedById], references: [id], onDelete: SetNull)

  @@unique([formTypeId, memberSeasonId])
  @@index([memberSeasonId, status])
  @@index([verifiedById])
}

// ─── Resources & Announcements ────────────────────────────────────────────────

model Resource {
  id            String       @id @default(cuid())
  seasonId      String
  eventId       String?
  teamId        String?
  competitionId String?
  title         String
  description   String?
  type          ResourceType @default(LINK)
  url           String
  uploadedById  String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  season      Season       @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  event       Event?       @relation(fields: [eventId], references: [id], onDelete: SetNull)
  team        Team?        @relation(fields: [teamId], references: [id], onDelete: SetNull)
  competition Competition? @relation(fields: [competitionId], references: [id], onDelete: SetNull)
  uploadedBy  User?        @relation("UploadedResources", fields: [uploadedById], references: [id], onDelete: SetNull)

  @@index([seasonId])
  @@index([eventId])
  @@index([teamId])
  @@index([competitionId])
}

model Announcement {
  id            String    @id @default(cuid())
  seasonId      String
  eventId       String?
  teamId        String?
  competitionId String?
  title         String
  body          String
  isPinned      Boolean   @default(false)
  publishedAt   DateTime?
  expiresAt     DateTime?
  createdById   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  season      Season       @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  event       Event?       @relation(fields: [eventId], references: [id], onDelete: SetNull)
  team        Team?        @relation(fields: [teamId], references: [id], onDelete: SetNull)
  competition Competition? @relation(fields: [competitionId], references: [id], onDelete: SetNull)
  createdBy   User?        @relation("AnnouncementCreator", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([seasonId, publishedAt])
  @@index([eventId])
  @@index([teamId])
  @@index([competitionId])
}

// ─── Practice Tests ───────────────────────────────────────────────────────────

model PracticeTest {
  id               String   @id @default(cuid())
  seasonId         String
  eventId          String?
  title            String
  pdfUrl           String
  timeLimitMinutes Int?
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  season   Season          @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  event    Event?          @relation(fields: [eventId], references: [id], onDelete: SetNull)
  answerKey AnswerKey?
  attempts PracticeAttempt[]

  @@index([seasonId])
  @@index([eventId])
}

// answers is an ordered JSON array: ["A", "B", "C2H6", ...]
model AnswerKey {
  id             String   @id @default(cuid())
  practiceTestId String   @unique
  answers        Json
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  practiceTest PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
}

// answers is an ordered JSON array matching the answer key indices
model PracticeAttempt {
  id             String    @id @default(cuid())
  practiceTestId String
  memberSeasonId String
  answers        Json      @default("[]")
  score          Int?
  startedAt      DateTime  @default(now())
  submittedAt    DateTime?
  createdAt      DateTime  @default(now())

  practiceTest PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  memberSeason MemberSeason @relation(fields: [memberSeasonId], references: [id], onDelete: Cascade)

  @@index([practiceTestId])
  @@index([memberSeasonId])
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

model ActivityLog {
  id         String   @id @default(cuid())
  clubId     String
  actorId    String?
  entityType String
  entityId   String
  action     String
  metadata   Json?
  createdAt  DateTime @default(now())

  club  Club  @relation(fields: [clubId], references: [id], onDelete: Cascade)
  actor User? @relation("ActivityActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([clubId, createdAt])
  @@index([actorId])
  @@index([entityType, entityId])
}
```

- [x] **Step 2: Push schema to database**

```bash
npx prisma db push --force-reset
```

Expected: `Your database is now in sync with your Prisma schema.`

> `--force-reset` drops and recreates all tables. This is fine during development — we're doing a clean wipe.

- [x] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`.

- [x] **Step 4: Verify TypeScript sees new types**

```bash
npx tsc --noEmit 2>&1 | grep -i "UserRole\|ClubRole\|permissions" | head -20
```

Expected: no errors referencing these types.

- [x] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: rewrite — simplified UserRole, ClubRole permissions, practice tests, drop Tournament"
```

---

## Task 3: Create lib/permissions.ts

**Files:**
- Create: `lib/permissions.ts`

- [x] **Step 1: Write the file**

```ts
// lib/permissions.ts
// Permission flag system — 52 flags across 13 areas (view/create/edit/delete × 13).
// ClubRole.permissions stores a flat { [flag]: boolean } JSON object.
// WEBSITE_OWNER bypasses all checks — never call these helpers for WEBSITE_OWNERs.

export const PERMISSION_AREAS = [
  "members",
  "teams",
  "events",
  "competitions",
  "hours",
  "finances",
  "forms",
  "club_events",
  "resources",
  "announcements",
  "practice",
  "roles",
  "club_settings",
] as const

export type PermissionArea = (typeof PERMISSION_AREAS)[number]

export type PermissionFlag =
  | `view_${PermissionArea}`
  | `create_${PermissionArea}`
  | `edit_${PermissionArea}`
  | `delete_${PermissionArea}`

// Flat permissions map stored on ClubRole and returned by getCurrentUser
export type PermissionMap = Partial<Record<PermissionFlag, boolean>>

// All 52 flags set to true — used for WEBSITE_OWNER
export function allPermissions(): PermissionMap {
  const map: PermissionMap = {}
  for (const area of PERMISSION_AREAS) {
    ;(map as Record<string, boolean>)[`view_${area}`] = true
    ;(map as Record<string, boolean>)[`create_${area}`] = true
    ;(map as Record<string, boolean>)[`edit_${area}`] = true
    ;(map as Record<string, boolean>)[`delete_${area}`] = true
  }
  return map
}

// Default role permission sets — used in seed and club registration

export function adminPermissions(): PermissionMap {
  return allPermissions()
}

export function boardMemberPermissions(): PermissionMap {
  const map: PermissionMap = {}
  for (const area of PERMISSION_AREAS) {
    ;(map as Record<string, boolean>)[`view_${area}`] = true
    ;(map as Record<string, boolean>)[`create_${area}`] = true
    ;(map as Record<string, boolean>)[`edit_${area}`] = true
    // Board Members can delete hours and resources but nothing else
    if (area === "hours" || area === "resources") {
      ;(map as Record<string, boolean>)[`delete_${area}`] = true
    }
  }
  return map
}

export function memberPermissions(): PermissionMap {
  const map: PermissionMap = {}
  for (const area of PERMISSION_AREAS) {
    ;(map as Record<string, boolean>)[`view_${area}`] = true
  }
  // Members can submit hours and attempt practice tests
  ;(map as PermissionMap).create_hours = true
  ;(map as PermissionMap).create_practice = true
  return map
}

// ─── Runtime helpers ──────────────────────────────────────────────────────────
// These operate on the permissions map returned by getCurrentUser, NOT on raw ClubRole records.

export function hasPermission(permissions: PermissionMap, flag: PermissionFlag): boolean {
  return permissions[flag] === true
}

export function canView(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `view_${area}`)
}

export function canCreate(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `create_${area}`)
}

export function canEdit(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `edit_${area}`)
}

export function canDelete(permissions: PermissionMap, area: PermissionArea): boolean {
  return hasPermission(permissions, `delete_${area}`)
}

// Merge an array of raw ClubRole.permissions JSON objects into one PermissionMap (union)
export function mergePermissions(roleMaps: unknown[]): PermissionMap {
  const result: PermissionMap = {}
  for (const raw of roleMaps) {
    if (!raw || typeof raw !== "object") continue
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value === true) {
        ;(result as Record<string, boolean>)[key] = true
      }
    }
  }
  return result
}
```

- [x] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | grep "lib/permissions" | head -10
```

Expected: no output (no errors in this file).

- [x] **Step 3: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat: add lib/permissions.ts with 52-flag permission system"
```

---

## Task 4: Update lib/auth.ts

getCurrentUser now returns a `CurrentUser` object that includes a `permissions` map. This is what gets passed to AuthContext and used in dashboard pages.

**Files:**
- Modify: `lib/auth.ts`

- [x] **Step 1: Write updated lib/auth.ts**

```ts
// lib/auth.ts
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { NextRequest } from "next/server"
import { UserRole } from "@prisma/client"
import { prisma } from "./prisma"
import { allPermissions, mergePermissions, type PermissionMap } from "./permissions"

const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET!)
const ALG = "HS256"

export interface CurrentUser {
  id: string
  clubId: string
  email: string
  firstName: string
  lastName: string
  displayName: string | null
  role: UserRole
  permissions: PermissionMap
}

export async function signSession(payload: { sub: string }, ttl = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret)
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] })
  return payload as { sub: string; iat: number; exp: number }
}

export async function getUserId(
  req?: NextRequest,
  { strict = true }: { strict?: boolean } = {},
): Promise<string | null> {
  const token = req
    ? req.cookies.get("app_session")?.value
    : (await cookies()).get("app_session")?.value

  if (!token) {
    if (strict) throw new Error("UNAUTHENTICATED")
    return null
  }

  try {
    const { sub } = await verifySession(token)
    return sub as string
  } catch {
    if (strict) throw new Error("UNAUTHENTICATED")
    return null
  }
}

export async function getCurrentUser(req?: NextRequest): Promise<CurrentUser | null> {
  const sub = await getUserId(req, { strict: false })
  if (!sub) return null

  const user = await prisma.user.findUnique({
    where: { id: sub },
    select: {
      id: true,
      clubId: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      role: true,
    },
  })
  if (!user) return null

  // WEBSITE_OWNER has all permissions — bypass DB role lookup
  if (user.role === UserRole.WEBSITE_OWNER) {
    return { ...user, permissions: allPermissions() }
  }

  // APPLICANT has no dashboard permissions
  if (user.role === UserRole.APPLICANT) {
    return { ...user, permissions: {} }
  }

  // MEMBER: union permissions from all assigned club roles for the active season
  const activeSeason = await prisma.season.findFirst({
    where: { clubId: user.clubId, isActive: true },
    select: { id: true },
  })
  if (!activeSeason) return { ...user, permissions: {} }

  const memberSeason = await prisma.memberSeason.findUnique({
    where: { userId_seasonId: { userId: user.id, seasonId: activeSeason.id } },
    select: {
      roles: {
        select: { clubRole: { select: { permissions: true } } },
      },
    },
  })
  if (!memberSeason) return { ...user, permissions: {} }

  const permissions = mergePermissions(
    memberSeason.roles.map((r) => r.clubRole.permissions),
  )

  return { ...user, permissions }
}
```

- [x] **Step 2: Check types compile**

```bash
npx tsc --noEmit 2>&1 | grep "lib/auth" | head -10
```

Expected: no output.

- [x] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: getCurrentUser returns permissions map"
```

---

## Task 5: Rewrite lib/api.ts

**Files:**
- Rewrite: `lib/api.ts`

- [x] **Step 1: Write new lib/api.ts**

```ts
// lib/api.ts
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { getCurrentUser, type CurrentUser } from "./auth"
import { hasPermission, type PermissionFlag } from "./permissions"

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function err(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status })
}

type Handler<TContext = unknown> = (
  request: Request,
  context: TContext,
  currentUser: CurrentUser,
) => Promise<NextResponse>

// Require a specific permission flag. WEBSITE_OWNER always passes.
export function withPermission<TContext = unknown>(
  flag: PermissionFlag,
  handler: Handler<TContext>,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return err("Unauthorized.", 401)

      // WEBSITE_OWNER has all permissions (permissions map already has all flags true)
      if (!hasPermission(currentUser.permissions, flag)) {
        return err("Forbidden.", 403)
      }

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error(`[withPermission:${flag}]`, error)
      return err("Internal server error.", 500)
    }
  }
}

// Require any authenticated non-applicant user
export function withMemberAuth<TContext = unknown>(
  handler: Handler<TContext>,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return async (request: Request, context: TContext): Promise<NextResponse> => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return err("Unauthorized.", 401)
      if (currentUser.role === UserRole.APPLICANT) return err("Forbidden.", 403)

      return await handler(request, context, currentUser)
    } catch (error) {
      console.error("[withMemberAuth]", error)
      return err("Internal server error.", 500)
    }
  }
}

// Convenience alias: requires edit_club_settings
export function withAdminAuth<TContext = unknown>(
  handler: Handler<TContext>,
  _label?: string,
): (request: Request, context: TContext) => Promise<NextResponse> {
  return withPermission("edit_club_settings", handler)
}
```

- [x] **Step 2: Check types**

```bash
npx tsc --noEmit 2>&1 | grep "lib/api" | head -10
```

Expected: no output.

- [x] **Step 3: Commit**

```bash
git add lib/api.ts
git commit -m "feat: rewrite lib/api.ts with withPermission flag-based auth"
```

---

## Task 6: Rewrite context/AuthContext.tsx

**Files:**
- Rewrite: `context/AuthContext.tsx`

- [x] **Step 1: Write new AuthContext**

```tsx
// context/AuthContext.tsx
"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { CurrentUser } from "@/lib/auth"
import {
  hasPermission,
  canView,
  canCreate,
  canEdit,
  canDelete,
  type PermissionFlag,
  type PermissionArea,
} from "@/lib/permissions"
import { UserRole } from "@prisma/client"

interface AuthContextValue {
  user: CurrentUser | null
  isOwner: boolean
  signOut: () => Promise<void>
  hasPermission: (flag: PermissionFlag) => boolean
  canView: (area: PermissionArea) => boolean
  canCreate: (area: PermissionArea) => boolean
  canEdit: (area: PermissionArea) => boolean
  canDelete: (area: PermissionArea) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function handleSignOut() {
  await fetch("/api/auth/logout", { method: "POST" })
  window.location.href = "/login"
}

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUser | null
  children: ReactNode
}) {
  const perms = initialUser?.permissions ?? {}

  const value: AuthContextValue = {
    user: initialUser,
    isOwner: initialUser?.role === UserRole.WEBSITE_OWNER,
    signOut: handleSignOut,
    hasPermission: (flag) => hasPermission(perms, flag),
    canView: (area) => canView(perms, area),
    canCreate: (area) => canCreate(perms, area),
    canEdit: (area) => canEdit(perms, area),
    canDelete: (area) => canDelete(perms, area),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
```

- [x] **Step 2: Check types**

```bash
npx tsc --noEmit 2>&1 | grep "AuthContext" | head -10
```

Expected: no output.

- [x] **Step 3: Commit**

```bash
git add context/AuthContext.tsx
git commit -m "feat: rewrite AuthContext with permission flag helpers"
```

---

## Task 7: Update middleware.ts

**Files:**
- Modify: `middleware.ts`

- [x] **Step 1: Write middleware**

```ts
// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isDashboard = pathname.startsWith("/dashboard")
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/set-password"

  const userId = await getUserId(req, { strict: false })

  if (isDashboard && !userId) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isAuthPage && userId) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/set-password"],
}
```

- [x] **Step 2: Check types**

```bash
npx tsc --noEmit 2>&1 | grep "middleware" | head -10
```

Expected: no output.

- [x] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: middleware redirects unauthenticated from /dashboard"
```

---

## Task 8: Clean wipe — delete old routes, create placeholder pages

Delete all API routes that will be owned by later agents. Replace all dashboard pages with stubs so the shell compiles cleanly.

**Files:**
- Delete: `app/api/admin/applicants/`, `app/api/admin/club-events/`, `app/api/admin/dues/`, `app/api/admin/email/`, `app/api/admin/events/`, `app/api/admin/forms/`, `app/api/admin/hour-categories/`, `app/api/admin/hours/`, `app/api/admin/members/`, `app/api/admin/teams/`, `app/api/admin/tests/`
- Delete: `app/api/member/events/`, `app/api/member/tests/`
- Delete: `app/api/public/apply/`, `app/api/public/events/`
- Delete: `app/apply/`
- Replace with stubs: `app/dashboard/applications/`, `app/dashboard/club-events/`, `app/dashboard/competitions/`, `app/dashboard/events/`, `app/dashboard/members/`, `app/dashboard/practice/`, `app/dashboard/teams/`, `app/dashboard/tests/`

- [x] **Step 1: Delete old routes**

```bash
rm -rf \
  app/api/admin/applicants \
  app/api/admin/club-events \
  app/api/admin/dues \
  app/api/admin/email \
  app/api/admin/events \
  app/api/admin/forms \
  app/api/admin/hour-categories \
  app/api/admin/hours \
  app/api/admin/members \
  app/api/admin/teams \
  app/api/admin/tests \
  app/api/member/events \
  app/api/member/tests \
  app/api/public/apply \
  app/api/public/events \
  app/apply \
  app/dashboard/applications \
  app/dashboard/club-events \
  app/dashboard/competitions \
  app/dashboard/events \
  app/dashboard/members \
  app/dashboard/practice \
  app/dashboard/teams \
  app/dashboard/tests
```

- [x] **Step 2: Create placeholder pages**

For each of the following paths, create a `page.tsx` with this content (substitute the section label):

`app/dashboard/applications/page.tsx`:
```tsx
export default function ApplicationsPage() {
  return <div className="p-6 text-muted-foreground">Applications — coming in Phase 2</div>
}
```

`app/dashboard/members/page.tsx`:
```tsx
export default function MembersPage() {
  return <div className="p-6 text-muted-foreground">Members — coming in Phase 2</div>
}
```

`app/dashboard/events/page.tsx`:
```tsx
export default function EventsPage() {
  return <div className="p-6 text-muted-foreground">Events — coming in Phase 2</div>
}
```

`app/dashboard/competitions/page.tsx`:
```tsx
export default function CompetitionsPage() {
  return <div className="p-6 text-muted-foreground">Competitions — coming in Phase 2</div>
}
```

`app/dashboard/teams/page.tsx`:
```tsx
export default function TeamsPage() {
  return <div className="p-6 text-muted-foreground">Teams — coming in Phase 2</div>
}
```

`app/dashboard/hours/page.tsx`:
```tsx
export default function HoursPage() {
  return <div className="p-6 text-muted-foreground">Hours — coming in Phase 2</div>
}
```

`app/dashboard/finances/page.tsx`:
```tsx
export default function FinancesPage() {
  return <div className="p-6 text-muted-foreground">Finances — coming in Phase 2</div>
}
```

`app/dashboard/club-events/page.tsx`:
```tsx
export default function ClubEventsPage() {
  return <div className="p-6 text-muted-foreground">Club Events — coming in Phase 2</div>
}
```

`app/dashboard/practice/page.tsx`:
```tsx
export default function PracticePage() {
  return <div className="p-6 text-muted-foreground">Practice Tests — coming in Phase 3</div>
}
```

- [x] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: wipe old routes, add placeholder pages for Phases 2-3"
```

---

## Task 9: Auth API routes — login and logout

**Files:**
- Modify: `app/api/auth/login/route.ts`
- Carry forward: `app/api/auth/logout/route.ts` (no changes needed)
- Carry forward: `app/api/auth/set-password/route.ts` (no changes needed)

- [x] **Step 1: Write login route with schoolDomain enforcement**

```ts
// app/api/auth/login/route.ts
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { signSession } from "@/lib/auth"
import { setSessionCookie } from "@/lib/cookies"
import { err, ok } from "@/lib/api"

export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return err("Invalid email or password.", 400)

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) return err("Invalid email or password.", 401)

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return err("Invalid email or password.", 401)

    // Domain enforcement — WEBSITE_OWNER bypasses
    if (user.role !== "WEBSITE_OWNER") {
      const club = await prisma.club.findUnique({
        where: { id: user.clubId },
        select: { schoolDomain: true },
      })
      if (club?.schoolDomain) {
        const emailDomain = email.split("@")[1]?.toLowerCase()
        if (emailDomain !== club.schoolDomain.toLowerCase()) {
          return err("Your email domain does not match this club's school domain.", 403)
        }
      }
    }

    const token = await signSession({ sub: user.id })
    const response = ok({ ok: true })
    setSessionCookie(response, token)
    return response
  } catch (e) {
    console.error("[login]", e)
    return err("Login failed.", 500)
  }
}
```

- [x] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "api/auth/login" | head -10
```

Expected: no output.

- [x] **Step 3: Commit**

```bash
git add app/api/auth/login/route.ts
git commit -m "feat: login enforces schoolDomain per club"
```

---

## Task 10: Club self-registration — API route

**Files:**
- Create: `app/api/auth/register/route.ts`

This route creates the club, the WEBSITE_OWNER user account, and the three default club roles in a single transaction.

- [x] **Step 1: Write registration route**

```ts
// app/api/auth/register/route.ts
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { signSession } from "@/lib/auth"
import { setSessionCookie } from "@/lib/cookies"
import { err, ok } from "@/lib/api"
import {
  adminPermissions,
  boardMemberPermissions,
  memberPermissions,
} from "@/lib/permissions"

export const dynamic = "force-dynamic"

const schema = z.object({
  clubName: z.string().min(2).max(100),
  schoolName: z.string().min(2).max(100).optional(),
  schoolDomain: z
    .string()
    .regex(/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/, "Invalid domain format")
    .toLowerCase(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
})

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return err(parsed.error.errors[0]?.message ?? "Invalid input.", 400)
    }

    const { clubName, schoolName, schoolDomain, firstName, lastName, email, password } =
      parsed.data

    // Check email not already registered
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return err("An account with this email already exists.", 409)

    const passwordHash = await bcrypt.hash(password, 12)

    // Generate a unique slug
    let baseSlug = toSlug(clubName)
    let slug = baseSlug
    let attempt = 0
    while (await prisma.club.findUnique({ where: { slug } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const result = await prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: { name: clubName, slug, schoolName, schoolDomain },
      })

      const user = await tx.user.create({
        data: {
          clubId: club.id,
          email,
          passwordHash,
          role: "WEBSITE_OWNER",
          firstName,
          lastName,
        },
      })

      // Create default club roles
      await tx.clubRole.createMany({
        data: [
          {
            clubId: club.id,
            name: "Admin",
            description: "Full access to all club management features.",
            permissions: adminPermissions(),
          },
          {
            clubId: club.id,
            name: "Board Member",
            description: "Can view, create, and edit most content. Cannot delete.",
            permissions: boardMemberPermissions(),
          },
          {
            clubId: club.id,
            name: "Member",
            description: "View access plus ability to submit hours and attempt practice tests.",
            permissions: memberPermissions(),
          },
        ],
      })

      return { club, user }
    })

    const token = await signSession({ sub: result.user.id })
    const response = ok({ ok: true, clubSlug: result.club.slug })
    setSessionCookie(response, token)
    return response
  } catch (e) {
    console.error("[register]", e)
    return err("Registration failed.", 500)
  }
}
```

- [x] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "api/auth/register" | head -10
```

Expected: no output.

- [x] **Step 3: Commit**

```bash
git add app/api/auth/register/route.ts
git commit -m "feat: club self-registration API — creates club, owner, default roles"
```

---

## Task 11: Register page (UI)

**Files:**
- Create: `app/register/page.tsx`

- [x] **Step 1: Write register page**

```tsx
// app/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { IconAtom } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    clubName: "",
    schoolName: "",
    schoolDomain: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  })

  function handleEmailBlur() {
    if (form.email && !form.schoolDomain) {
      const domain = form.email.split("@")[1]
      if (domain) setForm((f) => ({ ...f, schoolDomain: domain }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? "Registration failed.")
        return
      }
      toast.success("Club registered! Welcome.")
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <IconAtom className="size-8 text-primary" />
          </div>
          <CardTitle>Register Your Club</CardTitle>
          <CardDescription>
            Create a Science Olympiad club management account for your school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clubName">Club Name</Label>
              <Input
                id="clubName"
                placeholder="MAST Science Olympiad"
                value={form.clubName}
                onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                placeholder="Maritime and Science Technology Academy"
                value={form.schoolName}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.edu"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                onBlur={handleEmailBlur}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schoolDomain">
                School Email Domain{" "}
                <span className="text-muted-foreground font-normal text-xs">(auto-filled)</span>
              </Label>
              <Input
                id="schoolDomain"
                placeholder="school.edu"
                value={form.schoolDomain}
                onChange={(e) =>
                  setForm((f) => ({ ...f, schoolDomain: e.target.value.toLowerCase() }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Members will need an email ending in @{form.schoolDomain || "school.edu"} to log in.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating club..." : "Create Club"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [x] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "register" | head -10
```

Expected: no output.

- [x] **Step 3: Commit**

```bash
git add app/register/
git commit -m "feat: club self-registration page"
```

---

## Task 12: Update login page to link to /register

**Files:**
- Modify: `app/login/page.tsx`

- [x] **Step 1: Read current login page**

```bash
cat app/login/page.tsx
```

- [x] **Step 2: Ensure "Register your club" link exists**

If the login page does not already have a link to `/register`, add one below the sign-in button. Find the section near the bottom of the form and add:

```tsx
<p className="text-center text-sm text-muted-foreground">
  New school?{" "}
  <Link href="/register" className="text-foreground underline underline-offset-4">
    Register your club
  </Link>
</p>
```

- [x] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: login page links to /register"
```

---

## Task 13: Rewrite app-sidebar.tsx

Replace old role-based checks (`canAccessAdmin`) with permission flag checks.

**Files:**
- Rewrite: `components/app-sidebar.tsx`

- [x] **Step 1: Write new sidebar**

```tsx
// components/app-sidebar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconAtom,
  IconCalendarEvent,
  IconChartBar,
  IconClock,
  IconFileCheck,
  IconSettings,
  IconTrophy,
  IconUsers,
  IconUserCheck,
  IconWallet,
  IconBooks,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { NavUser, type NavUserData } from "@/components/nav-user"
import { useAuth } from "@/context/AuthContext"

function buildNavUser(user: { email: string; displayName: string | null; firstName: string; lastName: string } | null): NavUserData | null {
  if (!user) return null
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ")
  return {
    name: user.displayName || fullName || user.email,
    email: user.email,
    avatarUrl: null,
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut, canView, canEdit, isOwner } = useAuth()
  const pathname = usePathname()
  const navUser = React.useMemo(() => buildNavUser(user), [user])

  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  const managementItems = [
    canView("members") && {
      href: "/dashboard/applications",
      label: "Applications",
      icon: IconUserCheck,
    },
    canView("members") && {
      href: "/dashboard/members",
      label: "Members",
      icon: IconUsers,
    },
    canView("events") && {
      href: "/dashboard/events",
      label: "Events",
      icon: IconAtom,
    },
    canView("competitions") && {
      href: "/dashboard/competitions",
      label: "Competitions",
      icon: IconTrophy,
    },
    canView("teams") && {
      href: "/dashboard/teams",
      label: "Teams",
      icon: IconChartBar,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ElementType }[]

  const activityItems = [
    canView("hours") && {
      href: "/dashboard/hours",
      label: "Hours",
      icon: IconClock,
    },
    canView("finances") && {
      href: "/dashboard/finances",
      label: "Finances",
      icon: IconWallet,
    },
    canView("club_events") && {
      href: "/dashboard/club-events",
      label: "Club Events",
      icon: IconCalendarEvent,
    },
    canView("forms") && {
      href: "/dashboard/forms",
      label: "Forms",
      icon: IconFileCheck,
    },
    canView("practice") && {
      href: "/dashboard/practice",
      label: "Practice Tests",
      icon: IconBooks,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ElementType }[]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconAtom className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">Science Olympiad</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[130px]">
                    {user?.email ?? ""}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active(item.href)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activityItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Activity</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activityItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active(item.href)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(isOwner || canEdit("club_settings")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Club</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={active("/dashboard/settings")}>
                    <Link href="/dashboard/settings">
                      <IconSettings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {navUser && <NavUser user={navUser} onSignOut={signOut} />}
      </SidebarFooter>
    </Sidebar>
  )
}
```

> Note: `NavUser` component signature may differ from current. Read `components/nav-user.tsx` before writing — if `onSignOut` prop doesn't exist, adapt accordingly.

- [x] **Step 2: Check NavUser props**

```bash
grep -n "NavUserData\|onSignOut\|signOut" components/nav-user.tsx | head -20
```

Adjust the `NavUser` usage in step 1 to match the actual props.

- [x] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "app-sidebar\|nav-user" | head -10
```

Expected: no output.

- [x] **Step 4: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: sidebar uses permission flags for nav gating"
```

---

## Task 14: Settings API routes (club settings + roles)

**Files:**
- Create: `app/api/admin/settings/route.ts`
- Create: `app/api/admin/roles/route.ts`
- Create: `app/api/admin/roles/[roleId]/route.ts`
- Create: `app/api/admin/members/[id]/roles/route.ts`

- [x] **Step 1: Club settings PATCH**

```ts
// app/api/admin/settings/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  schoolDomain: z
    .string()
    .regex(/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/)
    .toLowerCase()
    .optional(),
  schoolName: z.string().max(100).optional(),
})

export const PATCH = withPermission("edit_club_settings", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Invalid input.", 400)

  const club = await prisma.club.update({
    where: { id: user.clubId },
    data: parsed.data,
    select: { id: true, name: true, schoolDomain: true, schoolName: true, slug: true },
  })
  return ok(club)
})

export const GET = withPermission("view_club_settings", async (_req, _ctx, user) => {
  const club = await prisma.club.findUnique({
    where: { id: user.clubId },
    select: { id: true, name: true, schoolDomain: true, schoolName: true, slug: true },
  })
  return ok(club)
})
```

- [x] **Step 2: Roles list + create**

```ts
// app/api/admin/roles/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

export const GET = withPermission("view_roles", async (_req, _ctx, user) => {
  const roles = await prisma.clubRole.findMany({
    where: { clubId: user.clubId },
    orderBy: { name: "asc" },
  })
  return ok(roles)
})

const createSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
  permissions: z.record(z.boolean()).default({}),
})

export const POST = withPermission("create_roles", async (req, _ctx, user) => {
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Invalid input.", 400)

  const existing = await prisma.clubRole.findUnique({
    where: { clubId_name: { clubId: user.clubId, name: parsed.data.name } },
  })
  if (existing) return err("A role with this name already exists.", 409)

  const role = await prisma.clubRole.create({
    data: { clubId: user.clubId, ...parsed.data },
  })
  return ok(role, 201)
})
```

- [x] **Step 3: Role edit + delete**

```ts
// app/api/admin/roles/[roleId]/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional(),
  permissions: z.record(z.boolean()).optional(),
})

export const PATCH = withPermission(
  "edit_roles",
  async (req, ctx: { params: Promise<{ roleId: string }> }, user) => {
    const { roleId } = await ctx.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Invalid input.", 400)

    const existing = await prisma.clubRole.findFirst({
      where: { id: roleId, clubId: user.clubId },
    })
    if (!existing) return err("Role not found.", 404)

    const role = await prisma.clubRole.update({
      where: { id: roleId },
      data: parsed.data,
    })
    return ok(role)
  },
)

export const DELETE = withPermission(
  "delete_roles",
  async (_req, ctx: { params: Promise<{ roleId: string }> }, user) => {
    const { roleId } = await ctx.params

    const existing = await prisma.clubRole.findFirst({
      where: { id: roleId, clubId: user.clubId },
    })
    if (!existing) return err("Role not found.", 404)

    await prisma.clubRole.delete({ where: { id: roleId } })
    return ok({ ok: true })
  },
)
```

- [x] **Step 4: Assign/remove role from member**

```ts
// app/api/admin/members/[id]/roles/route.ts
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPermission, ok, err } from "@/lib/api"

export const dynamic = "force-dynamic"

// POST body: { roleId, seasonId }
const assignSchema = z.object({
  roleId: z.string(),
  seasonId: z.string(),
})

export const POST = withPermission(
  "edit_roles",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: targetUserId } = await ctx.params
    const body = await req.json()
    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) return err("Invalid input.", 400)

    const { roleId, seasonId } = parsed.data

    // Verify role belongs to this club
    const role = await prisma.clubRole.findFirst({
      where: { id: roleId, clubId: user.clubId },
    })
    if (!role) return err("Role not found.", 404)

    // Find member season
    const ms = await prisma.memberSeason.findFirst({
      where: { userId: targetUserId, seasonId, season: { clubId: user.clubId } },
    })
    if (!ms) return err("Member season not found.", 404)

    const memberRole = await prisma.memberRole.upsert({
      where: { memberSeasonId_clubRoleId: { memberSeasonId: ms.id, clubRoleId: roleId } },
      create: { memberSeasonId: ms.id, clubRoleId: roleId },
      update: {},
    })
    return ok(memberRole, 201)
  },
)

// DELETE body: { roleId, seasonId }
export const DELETE = withPermission(
  "edit_roles",
  async (req, ctx: { params: Promise<{ id: string }> }, user) => {
    const { id: targetUserId } = await ctx.params
    const body = await req.json()
    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) return err("Invalid input.", 400)

    const { roleId, seasonId } = parsed.data

    const ms = await prisma.memberSeason.findFirst({
      where: { userId: targetUserId, seasonId, season: { clubId: user.clubId } },
    })
    if (!ms) return err("Member season not found.", 404)

    await prisma.memberRole.deleteMany({
      where: { memberSeasonId: ms.id, clubRoleId: roleId },
    })
    return ok({ ok: true })
  },
)
```

- [x] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "api/admin" | head -20
```

Expected: no output.

- [x] **Step 6: Commit**

```bash
git add app/api/admin/settings/ app/api/admin/roles/ app/api/admin/members/
git commit -m "feat: settings and roles management API routes"
```

---

## Task 15: Settings page UI

**Files:**
- Create: `app/dashboard/settings/page.tsx`

- [x] **Step 1: Write settings page**

```tsx
// app/dashboard/settings/page.tsx
import { redirect } from "next/navigation"
import { IconSettings, IconShield } from "@tabler/icons-react"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canEdit, canView } from "@/lib/permissions"
import { ClubSettingsForm } from "./club-settings-form"
import { RolesManager } from "./roles-manager"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const canEditSettings = user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "club_settings")
  const canViewRoles = user.role === "WEBSITE_OWNER" || canView(user.permissions, "roles")

  if (!canEditSettings && !canViewRoles) redirect("/dashboard")

  const [club, roles] = await Promise.all([
    prisma.club.findUnique({
      where: { id: user.clubId },
      select: { id: true, name: true, schoolName: true, schoolDomain: true, slug: true },
    }),
    prisma.clubRole.findMany({
      where: { clubId: user.clubId },
      orderBy: { name: "asc" },
    }),
  ])

  if (!club) redirect("/dashboard")

  return (
    <div className="flex flex-col gap-8 px-4 py-4 lg:px-6 md:py-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your club information and role permissions.
        </p>
      </div>

      {canEditSettings && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <IconSettings className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Club Information</h2>
          </div>
          <ClubSettingsForm club={club} />
        </section>
      )}

      {canViewRoles && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <IconShield className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Roles & Permissions</h2>
          </div>
          <RolesManager
            roles={roles}
            canManage={user.role === "WEBSITE_OWNER" || canEdit(user.permissions, "roles")}
          />
        </section>
      )}
    </div>
  )
}
```

- [x] **Step 2: Create ClubSettingsForm client component**

```tsx
// app/dashboard/settings/club-settings-form.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  club: {
    id: string
    name: string
    schoolName: string | null
    schoolDomain: string | null
    slug: string
  }
}

export function ClubSettingsForm({ club }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: club.name,
    schoolName: club.schoolName ?? "",
    schoolDomain: club.schoolDomain ?? "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to save.")
        return
      }
      toast.success("Club settings saved.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clubName">Club Name</Label>
            <Input
              id="clubName"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              value={form.schoolName}
              onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schoolDomain">School Email Domain</Label>
            <Input
              id="schoolDomain"
              value={form.schoolDomain}
              onChange={(e) =>
                setForm((f) => ({ ...f, schoolDomain: e.target.value.toLowerCase() }))
              }
              placeholder="school.edu"
            />
            <p className="text-xs text-muted-foreground">
              Members must use an email ending in @{form.schoolDomain || "school.edu"}.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Club URL</Label>
            <Input value={`/apply/${club.slug}`} readOnly className="bg-muted text-muted-foreground" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [x] **Step 3: Create RolesManager client component**

```tsx
// app/dashboard/settings/roles-manager.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconTrash, IconEdit } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PERMISSION_AREAS, type PermissionArea } from "@/lib/permissions"

const AREA_LABELS: Record<PermissionArea, string> = {
  members: "Members",
  teams: "Teams",
  events: "Events",
  competitions: "Competitions",
  hours: "Hours",
  finances: "Finances",
  forms: "Forms",
  club_events: "Club Events",
  resources: "Resources",
  announcements: "Announcements",
  practice: "Practice Tests",
  roles: "Roles",
  club_settings: "Club Settings",
}

const CRUD_LABELS = ["view", "create", "edit", "delete"] as const

interface Role {
  id: string
  name: string
  description: string | null
  permissions: Record<string, boolean>
}

interface Props {
  roles: Role[]
  canManage: boolean
}

export function RolesManager({ roles: initialRoles, canManage }: Props) {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!newRoleName.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName.trim(), permissions: {} }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message ?? "Failed to create role.")
        return
      }
      const role = await res.json()
      setRoles((r) => [...r, role])
      setNewRoleName("")
      setShowCreate(false)
      toast.success("Role created.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(roleId: string) {
    if (!confirm("Delete this role? Members with this role will lose its permissions.")) return
    const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete role.")
      return
    }
    setRoles((r) => r.filter((x) => x.id !== roleId))
    toast.success("Role deleted.")
  }

  async function handleSavePermissions(role: Role) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: role.permissions }),
      })
      if (!res.ok) {
        toast.error("Failed to save permissions.")
        return
      }
      setRoles((r) => r.map((x) => (x.id === role.id ? role : x)))
      setEditingRole(null)
      toast.success("Permissions saved.")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(role: Role, flag: string) {
    setEditingRole((r) =>
      r
        ? { ...r, permissions: { ...r.permissions, [flag]: !r.permissions[flag] } }
        : null,
    )
  }

  return (
    <div className="space-y-3">
      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{role.name}</CardTitle>
                {role.description && (
                  <CardDescription className="text-xs mt-0.5">{role.description}</CardDescription>
                )}
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingRole({ ...role, permissions: { ...role.permissions } })}
                  >
                    <IconEdit className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                    <IconTrash className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1">
              {Object.entries(role.permissions)
                .filter(([, v]) => v)
                .slice(0, 8)
                .map(([flag]) => (
                  <Badge key={flag} variant="secondary" className="text-xs font-normal">
                    {flag.replace("_", " ")}
                  </Badge>
                ))}
              {Object.values(role.permissions).filter(Boolean).length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{Object.values(role.permissions).filter(Boolean).length - 8} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {canManage && (
        <Button variant="outline" onClick={() => setShowCreate(true)} className="w-full">
          <IconPlus className="size-4 mr-1.5" />
          Add Role
        </Button>
      )}

      {/* Create role dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Vice President"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !newRoleName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit permissions dialog */}
      {editingRole && (
        <Dialog open onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Permissions — {editingRole.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {PERMISSION_AREAS.map((area) => (
                <div key={area}>
                  <p className="text-sm font-medium mb-2">{AREA_LABELS[area]}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CRUD_LABELS.map((crud) => {
                      const flag = `${crud}_${area}`
                      // club_settings has no create/delete
                      if (area === "club_settings" && (crud === "create" || crud === "delete")) {
                        return null
                      }
                      return (
                        <div key={flag} className="flex items-center gap-2">
                          <Switch
                            id={flag}
                            checked={!!editingRole.permissions[flag]}
                            onCheckedChange={() => togglePermission(editingRole, flag)}
                          />
                          <Label htmlFor={flag} className="text-xs capitalize cursor-pointer">
                            {crud}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRole(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleSavePermissions(editingRole)} disabled={loading}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
```

- [x] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "settings" | head -20
```

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add app/dashboard/settings/
git commit -m "feat: settings page with club info and roles management UI"
```

---

## Task 16: Seed script

**Files:**
- Rewrite: `prisma/seed.ts`

- [x] **Step 1: Write seed script**

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { adminPermissions, boardMemberPermissions, memberPermissions } from "../lib/permissions"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clean slate
  await prisma.club.deleteMany()

  const passwordHash = await bcrypt.hash("password123", 12)

  // Create club
  const club = await prisma.club.create({
    data: {
      name: "MAST Science Olympiad",
      slug: "mast-scioly",
      schoolName: "Maritime and Science Technology Academy",
      schoolDomain: "mast.edu",
    },
  })

  // Create WEBSITE_OWNER
  const owner = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "owner@mast.edu",
      passwordHash,
      role: "WEBSITE_OWNER",
      firstName: "Alex",
      lastName: "Rivera",
    },
  })

  // Create a regular member
  const member = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "member@mast.edu",
      passwordHash,
      role: "MEMBER",
      firstName: "Jordan",
      lastName: "Smith",
    },
  })

  // Default club roles
  const [adminRole, boardRole, memberRole] = await Promise.all([
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Admin",
        description: "Full access to all club management features.",
        permissions: adminPermissions(),
      },
    }),
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Board Member",
        description: "Can view, create, and edit most content. Cannot delete.",
        permissions: boardMemberPermissions(),
      },
    }),
    prisma.clubRole.create({
      data: {
        clubId: club.id,
        name: "Member",
        description: "View access plus ability to submit hours and attempt practice tests.",
        permissions: memberPermissions(),
      },
    }),
  ])

  // Active season
  const season = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "2025–2026 Season",
      schoolYear: "2025-2026",
      startsAt: new Date("2025-09-01"),
      endsAt: new Date("2026-06-01"),
      isActive: true,
    },
  })

  // MemberSeason for owner
  await prisma.memberSeason.create({
    data: {
      userId: owner.id,
      seasonId: season.id,
      membershipStatus: "ACTIVE",
    },
  })

  // MemberSeason for member + assign Member role
  const ms = await prisma.memberSeason.create({
    data: {
      userId: member.id,
      seasonId: season.id,
      membershipStatus: "ACTIVE",
    },
  })

  await prisma.memberRole.create({
    data: { memberSeasonId: ms.id, clubRoleId: memberRole.id },
  })

  // Sample Science Olympiad events
  const eventNames = [
    { name: "Anatomy & Physiology", code: "ANP" },
    { name: "Astronomy", code: "AST" },
    { name: "Chemistry Lab", code: "CLB" },
    { name: "Codebusters", code: "COD" },
    { name: "Disease Detectives", code: "DIS" },
    { name: "Dynamic Planet", code: "DPN" },
  ]

  await prisma.event.createMany({
    data: eventNames.map(({ name, code }, i) => ({
      seasonId: season.id,
      name,
      code,
      minParticipants: 2,
      maxParticipants: 2,
      sortOrder: i,
    })),
  })

  // Sample competition
  await prisma.competition.create({
    data: {
      seasonId: season.id,
      name: "Spring Invitational 2026",
      type: "INVITATIONAL",
      location: "MAST Academy",
      startsAt: new Date("2026-04-15"),
      isPublished: true,
    },
  })

  // Hour category
  await prisma.hourCategory.create({
    data: {
      seasonId: season.id,
      name: "Study Sessions",
      description: "Independent or group study for Science Olympiad events.",
      requiresApproval: false,
    },
  })

  console.log("Seed complete.")
  console.log("  WEBSITE_OWNER: owner@mast.edu / password123")
  console.log("  Member:        member@mast.edu / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [x] **Step 2: Run seed**

```bash
npx tsx prisma/seed.ts
```

Expected:
```
Seeding database...
Seed complete.
  WEBSITE_OWNER: owner@mast.edu / password123
  Member:        member@mast.edu / password123
```

- [x] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed script with sample club, roles, events, season"
```

---

## Task 17: Final integration check

- [x] **Step 1: Full TypeScript compile**

```bash
npx tsc --noEmit 2>&1
```

Fix any remaining errors before proceeding. Common issues:
- Prisma client not updated after schema change → run `npx prisma generate`
- Old `UserRole.ADMIN` / `UserRole.BOARD_MEMBER` references in carry-forward files → replace with `UserRole.MEMBER`
- `canAccessAdmin` still referenced in files not yet updated → replace with `canView("club_settings")` or `canEdit("club_settings")`

- [x] **Step 2: Start dev server**

```bash
npm run dev
```

Expected: server starts on port 3000 with no errors.

- [x] **Step 3: Manual smoke test**

1. Navigate to `http://localhost:3000/register`
2. Fill out the registration form, submit → should redirect to `/dashboard`
3. Sign out, go to `/login`
4. Log in as `owner@mast.edu` / `password123` → should land on `/dashboard`
5. Navigate to `/dashboard/settings` → should see Club Information and Roles sections
6. Edit a role's permissions → save → should persist
7. Log out, try to access `/dashboard` → should redirect to `/login`

- [x] **Step 4: Commit final fixes**

```bash
git add -A
git commit -m "fix: Phase 1 integration — TypeScript errors and smoke test fixes"
```

---

## Spec Coverage Checklist

| Spec requirement | Covered |
|---|---|
| New Prisma schema (UserRole simplified, ClubRole.permissions, PracticeTest/AnswerKey/PracticeAttempt, Tournament removed) | Task 2 |
| lib/permissions.ts with hasPermission/canView/canCreate/canEdit/canDelete | Task 3 |
| getCurrentUser returns permissions map | Task 4 |
| withPermission(flag) API wrapper | Task 5 |
| AuthContext with permission flag helpers | Task 6 |
| middleware.ts protected route redirects | Task 7 |
| Clean wipe of old routes, placeholder pages | Task 8 |
| Login with schoolDomain enforcement | Task 9 |
| Club self-registration (/register) creates club + WEBSITE_OWNER + default roles | Tasks 10–11 |
| Dashboard shell sidebar gated by permission flags | Task 13 |
| Club settings page (club name, domain) | Task 15 |
| Roles management UI (create/edit/delete roles, toggle flags) | Task 15 |
| Role assignment API (assign/remove role from member) | Task 14 |
| Default roles seeded: Admin, Board Member, Member | Task 10 (registration) + Task 16 (seed) |
| Seed script with sample club, season, WEBSITE_OWNER | Task 16 |
| WEBSITE_OWNER bypasses all permission checks | Tasks 4, 5 |
| schoolDomain auto-extracted from email on registration | Task 11 |
| /set-password token flow | Carry-forward (no changes needed) |
