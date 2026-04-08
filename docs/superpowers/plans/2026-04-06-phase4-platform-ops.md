# Phase 4 - Platform Operations

## Goal

Finish the platform-level concerns that make this a real multi-school system rather than a single-club prototype.

## Workstreams

### 1. School access management

- manage multiple allowed student domains per club
- support non-student accounts such as coaches or advisors
- add UI for domain policy and exceptions

### 2. Admissions lifecycle

- migrate review screens to `MembershipApplication`
- support reapply, withdraw, waitlist, and archived decision history
- separate applicant history from active membership history

### 3. Competition operations

- migrate new roster planning to `SeasonRoster` and `CompetitionRoster`
- show competition assignments by event, roster, and participant
- preserve legacy team pages only until the roster UI is complete

### 4. Hours and accountability

- add hour-program management for campaign-style logs
- represent program-specific evidence rules
- build rollups by program, category, and member

### 5. Finance

- expand beyond dues into ledger-based club finance
- capture donations, reimbursements, fundraiser income, snacks, supplies, and registration costs
- expose account balances and season summaries

### 6. Assets and storage

- move proof/forms/receipts/PDFs onto real asset-backed storage
- keep URL fields only as migration fallback
- document upload provider and retention policy

### 7. Historical views

- add season switchers for admin reports
- support alumni lookups, prior competition history, and year-over-year comparisons

## Acceptance criteria

- the platform can represent a real school club with multiple email domains, archived seasons, competition rosters, hours campaigns, and non-dues finances
- no new product work depends on the legacy `Team` or legacy practice ontology
