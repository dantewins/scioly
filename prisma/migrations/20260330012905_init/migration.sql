-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('WEBSITE_OWNER', 'ADMIN', 'BOARD_MEMBER', 'MEMBER', 'APPLICANT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'ALUMNI', 'REMOVED');

-- CreateEnum
CREATE TYPE "EventEnrollmentStatus" AS ENUM ('INTERESTED', 'TRYOUT_PENDING', 'ACTIVE', 'WAITLISTED', 'DROPPED');

-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('PRACTICE', 'INVITATIONAL', 'REGIONAL', 'STATE', 'NATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('PRACTICE', 'INVITATIONAL', 'REGIONAL', 'STATE', 'NATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('MEMBER', 'CAPTAIN', 'ALTERNATE');

-- CreateEnum
CREATE TYPE "FormCategory" AS ENUM ('WAIVER', 'MEDICAL', 'PERMISSION', 'CODE_OF_CONDUCT', 'TRAVEL', 'PHOTO_RELEASE', 'CLUB_CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('NOT_STARTED', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'CARD', 'ZELLE', 'VENMO', 'PAYPAL', 'OTHER');

-- CreateEnum
CREATE TYPE "HourEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('LINK', 'FILE', 'DOC', 'VIDEO', 'SHEET', 'FOLDER', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceVisibility" AS ENUM ('CLUB', 'EVENT', 'TEAM', 'BOARD_ONLY');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL_MEMBERS', 'BOARD_ONLY', 'EVENT_ONLY', 'TEAM_ONLY');

-- CreateEnum
CREATE TYPE "PartnerPreference" AS ENUM ('NA', 'RECOMMENDED', 'MANDATORY');

-- CreateEnum
CREATE TYPE "ClubEventType" AS ENUM ('MEETING', 'SUPER_SATURDAY', 'FUNDRAISER', 'WORKSHOP', 'FIELD_TRIP', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'SELECT_ALL', 'MATCHING', 'FREE_RESPONSE', 'TRUE_FALSE', 'FILL_IN_BLANK');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "joinCode" TEXT,
    "schoolName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT,
    "gradeLevel" INTEGER,
    "graduationYear" INTEGER,
    "studentNumber" TEXT,
    "phone" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordSetupToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordSetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSeason" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReturning" BOOLEAN NOT NULL DEFAULT false,
    "canTravel" BOOLEAN NOT NULL DEFAULT false,
    "shirtSize" TEXT,
    "notes" TEXT,
    "whyJoin" TEXT,
    "contributionIdeas" TEXT,
    "awards" TEXT,
    "previousEvents" TEXT,
    "scienceClasses" TEXT,
    "mathClasses" TEXT,
    "questions" TEXT,
    "focusPageFileUrl" TEXT,
    "applicationSubmittedAt" TIMESTAMP(3),
    "statusChangedAt" TIMESTAMP(3),
    "statusReason" TEXT,
    "expectedHours" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minParticipants" INTEGER NOT NULL DEFAULT 2,
    "maxParticipants" INTEGER NOT NULL DEFAULT 2,
    "isTrialEvent" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TournamentType" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompetitionType" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSchedule" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "timeSlot" INTEGER NOT NULL,
    "slotLabel" TEXT,

    CONSTRAINT "EventSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "competitionId" TEXT,
    "eventId" TEXT,
    "label" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'DRAFT',
    "memberLimit" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTournament" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "TeamTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEventAssignment" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "TournamentEventAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentMember" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "seatNumber" INTEGER,

    CONSTRAINT "AssignmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "seatNumber" INTEGER,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "TeamAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEnrollment" (
    "id" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "EventEnrollmentStatus" NOT NULL DEFAULT 'INTERESTED',
    "preferenceRank" INTEGER,
    "tryoutScore" DECIMAL(6,2),
    "skillRating" INTEGER,
    "notes" TEXT,
    "partnerPreference" "PartnerPreference" NOT NULL DEFAULT 'NA',
    "partnerNames" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormType" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FormCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "requiresUpload" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formTypeId" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "acknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuesInvoice" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "referenceNumber" TEXT,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourCategory" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiredHours" DECIMAL(5,2),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourEntry" (
    "id" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "totalHours" DECIMAL(5,2) NOT NULL,
    "status" "HourEntryStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEvent" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClubEventType" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "hoursValue" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEventAttendance" (
    "id" TEXT NOT NULL,
    "clubEventId" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hourEntryId" TEXT,

    CONSTRAINT "ClubEventAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "eventId" TEXT,
    "teamId" TEXT,
    "tournamentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceType" NOT NULL DEFAULT 'LINK',
    "visibility" "ResourceVisibility" NOT NULL DEFAULT 'CLUB',
    "url" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "eventId" TEXT,
    "teamId" TEXT,
    "tournamentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL_MEMBERS',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubRole" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRole" (
    "id" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "clubRoleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timeLimitMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "options" JSONB,
    "answerKey" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "stationNumber" INTEGER,
    "stationContext" TEXT,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "memberSeasonId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "totalPoints" INTEGER NOT NULL,
    "earnedPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "pointsEarned" INTEGER,

    CONSTRAINT "TestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Club_joinCode_key" ON "Club"("joinCode");

-- CreateIndex
CREATE INDEX "Season_clubId_isActive_idx" ON "Season"("clubId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Season_clubId_schoolYear_key" ON "Season"("clubId", "schoolYear");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clubId_role_idx" ON "User"("clubId", "role");

-- CreateIndex
CREATE INDEX "User_lastName_firstName_idx" ON "User"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordSetupToken_token_key" ON "PasswordSetupToken"("token");

-- CreateIndex
CREATE INDEX "PasswordSetupToken_userId_idx" ON "PasswordSetupToken"("userId");

-- CreateIndex
CREATE INDEX "MemberSeason_seasonId_membershipStatus_idx" ON "MemberSeason"("seasonId", "membershipStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSeason_userId_seasonId_key" ON "MemberSeason"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "Event_seasonId_sortOrder_idx" ON "Event"("seasonId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Event_seasonId_name_key" ON "Event"("seasonId", "name");

-- CreateIndex
CREATE INDEX "Tournament_seasonId_type_idx" ON "Tournament"("seasonId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_seasonId_name_key" ON "Tournament"("seasonId", "name");

-- CreateIndex
CREATE INDEX "Competition_seasonId_type_idx" ON "Competition"("seasonId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_seasonId_name_key" ON "Competition"("seasonId", "name");

-- CreateIndex
CREATE INDEX "EventSchedule_competitionId_idx" ON "EventSchedule"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSchedule_competitionId_eventId_key" ON "EventSchedule"("competitionId", "eventId");

-- CreateIndex
CREATE INDEX "Team_seasonId_idx" ON "Team"("seasonId");

-- CreateIndex
CREATE INDEX "Team_competitionId_idx" ON "Team"("competitionId");

-- CreateIndex
CREATE INDEX "Team_eventId_idx" ON "Team"("eventId");

-- CreateIndex
CREATE INDEX "TeamTournament_tournamentId_idx" ON "TeamTournament"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamTournament_teamId_tournamentId_key" ON "TeamTournament"("teamId", "tournamentId");

-- CreateIndex
CREATE INDEX "TournamentEventAssignment_tournamentId_teamId_idx" ON "TournamentEventAssignment"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "TournamentEventAssignment_eventId_idx" ON "TournamentEventAssignment"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEventAssignment_tournamentId_teamId_eventId_key" ON "TournamentEventAssignment"("tournamentId", "teamId", "eventId");

-- CreateIndex
CREATE INDEX "AssignmentMember_memberSeasonId_idx" ON "AssignmentMember"("memberSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentMember_assignmentId_memberSeasonId_key" ON "AssignmentMember"("assignmentId", "memberSeasonId");

-- CreateIndex
CREATE INDEX "TeamAssignment_teamId_role_idx" ON "TeamAssignment"("teamId", "role");

-- CreateIndex
CREATE INDEX "TeamAssignment_memberSeasonId_idx" ON "TeamAssignment"("memberSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAssignment_teamId_memberSeasonId_key" ON "TeamAssignment"("teamId", "memberSeasonId");

-- CreateIndex
CREATE INDEX "EventEnrollment_eventId_status_idx" ON "EventEnrollment"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventEnrollment_memberSeasonId_idx" ON "EventEnrollment"("memberSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "EventEnrollment_memberSeasonId_eventId_key" ON "EventEnrollment"("memberSeasonId", "eventId");

-- CreateIndex
CREATE INDEX "FormType_seasonId_category_idx" ON "FormType"("seasonId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "FormType_seasonId_name_key" ON "FormType"("seasonId", "name");

-- CreateIndex
CREATE INDEX "FormSubmission_memberSeasonId_status_idx" ON "FormSubmission"("memberSeasonId", "status");

-- CreateIndex
CREATE INDEX "FormSubmission_verifiedById_idx" ON "FormSubmission"("verifiedById");

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_formTypeId_memberSeasonId_key" ON "FormSubmission"("formTypeId", "memberSeasonId");

-- CreateIndex
CREATE INDEX "DuesInvoice_seasonId_status_idx" ON "DuesInvoice"("seasonId", "status");

-- CreateIndex
CREATE INDEX "DuesInvoice_memberSeasonId_status_idx" ON "DuesInvoice"("memberSeasonId", "status");

-- CreateIndex
CREATE INDEX "PaymentRecord_invoiceId_idx" ON "PaymentRecord"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentRecord_memberSeasonId_idx" ON "PaymentRecord"("memberSeasonId");

-- CreateIndex
CREATE INDEX "PaymentRecord_recordedById_idx" ON "PaymentRecord"("recordedById");

-- CreateIndex
CREATE INDEX "HourCategory_seasonId_idx" ON "HourCategory"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "HourCategory_seasonId_name_key" ON "HourCategory"("seasonId", "name");

-- CreateIndex
CREATE INDEX "HourEntry_memberSeasonId_status_idx" ON "HourEntry"("memberSeasonId", "status");

-- CreateIndex
CREATE INDEX "HourEntry_categoryId_idx" ON "HourEntry"("categoryId");

-- CreateIndex
CREATE INDEX "HourEntry_approvedById_idx" ON "HourEntry"("approvedById");

-- CreateIndex
CREATE INDEX "ClubEvent_seasonId_startsAt_idx" ON "ClubEvent"("seasonId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClubEventAttendance_hourEntryId_key" ON "ClubEventAttendance"("hourEntryId");

-- CreateIndex
CREATE INDEX "ClubEventAttendance_memberSeasonId_idx" ON "ClubEventAttendance"("memberSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubEventAttendance_clubEventId_memberSeasonId_key" ON "ClubEventAttendance"("clubEventId", "memberSeasonId");

-- CreateIndex
CREATE INDEX "Resource_seasonId_visibility_idx" ON "Resource"("seasonId", "visibility");

-- CreateIndex
CREATE INDEX "Resource_eventId_idx" ON "Resource"("eventId");

-- CreateIndex
CREATE INDEX "Resource_teamId_idx" ON "Resource"("teamId");

-- CreateIndex
CREATE INDEX "Resource_tournamentId_idx" ON "Resource"("tournamentId");

-- CreateIndex
CREATE INDEX "Announcement_seasonId_publishedAt_idx" ON "Announcement"("seasonId", "publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_eventId_idx" ON "Announcement"("eventId");

-- CreateIndex
CREATE INDEX "Announcement_teamId_idx" ON "Announcement"("teamId");

-- CreateIndex
CREATE INDEX "Announcement_tournamentId_idx" ON "Announcement"("tournamentId");

-- CreateIndex
CREATE INDEX "ActivityLog_clubId_createdAt_idx" ON "ActivityLog"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ClubRole_seasonId_idx" ON "ClubRole"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubRole_seasonId_name_key" ON "ClubRole"("seasonId", "name");

-- CreateIndex
CREATE INDEX "MemberRole_memberSeasonId_idx" ON "MemberRole"("memberSeasonId");

-- CreateIndex
CREATE INDEX "MemberRole_clubRoleId_idx" ON "MemberRole"("clubRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRole_memberSeasonId_clubRoleId_key" ON "MemberRole"("memberSeasonId", "clubRoleId");

-- CreateIndex
CREATE INDEX "Test_seasonId_idx" ON "Test"("seasonId");

-- CreateIndex
CREATE INDEX "Test_eventId_idx" ON "Test"("eventId");

-- CreateIndex
CREATE INDEX "TestQuestion_testId_order_idx" ON "TestQuestion"("testId", "order");

-- CreateIndex
CREATE INDEX "TestAttempt_testId_idx" ON "TestAttempt"("testId");

-- CreateIndex
CREATE INDEX "TestAttempt_memberSeasonId_idx" ON "TestAttempt"("memberSeasonId");

-- CreateIndex
CREATE INDEX "TestAnswer_attemptId_idx" ON "TestAnswer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "TestAnswer_attemptId_questionId_key" ON "TestAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordSetupToken" ADD CONSTRAINT "PasswordSetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSeason" ADD CONSTRAINT "MemberSeason_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSeason" ADD CONSTRAINT "MemberSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSchedule" ADD CONSTRAINT "EventSchedule_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSchedule" ADD CONSTRAINT "EventSchedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTournament" ADD CONSTRAINT "TeamTournament_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTournament" ADD CONSTRAINT "TeamTournament_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEventAssignment" ADD CONSTRAINT "TournamentEventAssignment_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEventAssignment" ADD CONSTRAINT "TournamentEventAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEventAssignment" ADD CONSTRAINT "TournamentEventAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentMember" ADD CONSTRAINT "AssignmentMember_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TournamentEventAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentMember" ADD CONSTRAINT "AssignmentMember_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormType" ADD CONSTRAINT "FormType_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formTypeId_fkey" FOREIGN KEY ("formTypeId") REFERENCES "FormType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesInvoice" ADD CONSTRAINT "DuesInvoice_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuesInvoice" ADD CONSTRAINT "DuesInvoice_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "DuesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourCategory" ADD CONSTRAINT "HourCategory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourEntry" ADD CONSTRAINT "HourEntry_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourEntry" ADD CONSTRAINT "HourEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HourCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourEntry" ADD CONSTRAINT "HourEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HourCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventAttendance" ADD CONSTRAINT "ClubEventAttendance_clubEventId_fkey" FOREIGN KEY ("clubEventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventAttendance" ADD CONSTRAINT "ClubEventAttendance_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventAttendance" ADD CONSTRAINT "ClubEventAttendance_hourEntryId_fkey" FOREIGN KEY ("hourEntryId") REFERENCES "HourEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubRole" ADD CONSTRAINT "ClubRole_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberRole" ADD CONSTRAINT "MemberRole_clubRoleId_fkey" FOREIGN KEY ("clubRoleId") REFERENCES "ClubRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_memberSeasonId_fkey" FOREIGN KEY ("memberSeasonId") REFERENCES "MemberSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAnswer" ADD CONSTRAINT "TestAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
