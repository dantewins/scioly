# Phase 3 - Assessment System

## Goal

Replace the current "practice test equals one PDF and one answer array" assumption with a PDF-first assessment system that supports straight tests, stations, and hybrid formats.

## UX constraints

- preserve the current dashboard shell, spacing, and typography
- keep server-page plus client-manager structure
- reuse the current card, dialog, table, and page-header patterns
- do not introduce a new visual language for practice/admin pages

## Core product rule

The MVP does not parse question text from PDFs. Admins upload the source material, define assessment structure, and create answer slots. Parsing is optional future automation.

## Data model

- `Assessment`
- `AssessmentAsset`
- `AssessmentPart`
- `AssessmentPrompt`
- `AssessmentAttempt`
- `AssessmentResponse`

## Build order

### 1. Admin authoring

- create assessment
- attach one or more PDFs/assets
- choose format: `TEST`, `STATIONS`, or `HYBRID`
- create sections/stations with page ranges and instructions
- generate numbered response slots without typing full question text

### 2. Answer-key and scoring setup

- support MCQ, short-text, numeric, boolean, and manual-score prompts
- allow per-prompt points
- support answer-key text for auto-scoreable prompts
- allow prompts with no auto key for rubric/manual grading

### 3. Member attempt flow

- split-view or dual-panel UI
- PDF/resource viewer on one side
- response slots on the other
- station-aware navigation for station-based assessments
- autosave drafts

### 4. Results and review

- immediate scoring when fully auto-gradable
- partial scoring when mixed auto/manual
- attempt history by member and by event

### 5. Legacy bridge

- keep current `PracticeTest` screens working during rollout
- add migration utilities to convert a legacy practice test into a minimal `Assessment`

## Acceptance criteria

- admins can create an assessment without typing the full question set into the site
- a station-based assessment with multiple PDFs or page segments can be represented cleanly
- members can submit an attempt against numbered slots
- the data model supports both objective and rubric-based prompts

## Explicit non-goals

- OCR or semantic parsing of arbitrary PDFs
- perfect FRQ grading
- public exam marketplace features
