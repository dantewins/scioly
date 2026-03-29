# Science Olympiad Platform Implementation Roadmap

This roadmap outlines the planned foundational changes for the SciOly Platform, focusing specifically on updating the data modeling and designing the exam portal system. No code has been altered during the generation of this document.

---

## 1. Prisma Schema Realignment
The first goal is to adjust the database schema so that relationships perfectly map onto real-world Science Olympiad structures. We will migrate from an isolated user-event model to a robust multi-tenant hierarchy.

### Club & Membership Core
- **Clubs**: Will include a `joinCode` (unique string) property. Admin roles (`WEBSITE_OWNER` or `ADMIN`) distribute this code, allowing students to register themselves while defaulting to a `PENDING` status for security.
- **Roles**: Enforce a strict `UserRole` enum (`WEBSITE_OWNER`, `ADMIN`, `BOARD_MEMBER`, `MEMBER`, `APPLICANT`) to control what dashboards users can see.

### Teams, Tournaments, and Assignments
Currently, a "Team" ambiguously represents an event pair. This will be structurally refactored:
- **`Team` Model**: Remapped to represent the actual 15-person rosters (e.g., "Varsity", "JV A"). Holds relationships to multiple `MemberSeason`s.
- **`Tournament` Model**: Renamed from `Competition` to clarify intent. This model represents meets like the "MIT Invitational" or "State Competition".
- **`TeamTournament` Join**: Exists to denote that an entire team (e.g. "Varsity") is traveling to a specific Tournament.
- **`TournamentEventAssignment` Model**: The central hub for competitive mapping. This links `Tournament`, `Team`, `Event`, and up to 3 `AssignmentMember`s. (e.g., "At the MIT Invitational, on the Varsity team, Alice and Bob are doing Anatomy & Physiology").

### Hour Logging
- **`HourCategory` Enhancements**: Will include a `requiredHours Decimal?` field. This enables administrators to gently request criteria (e.g., "States Builders requirement: 5.0 hours") without creating strict rules that break user flows. We want this tracking to remain flexible.

---

## 2. The Practice Exam Portal System
An AI text-parser algorithm is unfeasible given the diagrams, visual stations, and specialized formulas on most test PDFs. The robust MVP approach will lean heavily into a **Side-by-Side Examiner Interface**.

### Data Models
We will add structurally rigid models to map out digital answer sheets without needing the test file's text content.
- **`PracticeExam`**: Contains standard properties (title, event reference) along with a `testPdfUrl`.
- **`ExamSection`**: Allows tests mapping for "Stations" based formatting.
- **`ExamQuestion`**: Contains the correct answer, points possible, and question types (multiple choice, free response).
- **`ExamAttempt` & `ExamAnswer`**: Links a student's `MemberSeason` to their submitted values.

### The Exam Interface User Flow
1. **Creation (Dashboard)**: A board member uploads a PDF file to the standard SciOly test source. Using the `PracticeExam` tools, they can create digital "Bubble Sheets" (mapping out how many MCQs and short answers there are into the `ExamQuestion` entries) and apply correct key values.
2. **Taking the Exam (Client)**: A student opens the exam interface. The UI will render with a split-screen view:
   - **Left Half**: The standard test PDF, manipulatable with built-in pinch/zoom/scroll capabilities.
   - **Right Half**: The digital form mapping (bubble sheet and text areas) generated from the database.
3. **Grading Output**: All multiple-choice data is instantly evaluated against the `ExamQuestion.correctAnswer`. The student can visualize what they missed in a review sheet after submitting, enabling efficient self and peer evaluations.

---

## Summary of Next Steps
1. Execute structural deletes and `schema.prisma` renames.
2. Run database migration tools (`npx prisma migrate dev`).
3. Build the Exam Viewer side-by-side UI blocks securely linking to database schemas. All logic will reside under protected routing.
