# Phase 1 Frontend Design Brief
## Brite SMS — Ghanaian Private Basic School Management System

**Document type:** Design brief for UI/UX redesign  
**Input for:** Claude Design, Lovable, or equivalent design tool  
**Scope:** Phase 1 frontend only — no new features  
**Date:** June 2026

---

> **Critical framing for the design tool:**  
> This is a **school administration system for a Ghanaian private basic school** — not a generic school app, not an LMS, not an inventory system, not a fintech product. The audience is school staff (administrators, headteachers, teachers, admissions officers), not students. The data is Ghanaian: names, phone formats, academic calendar structures, and curriculum designations (GES/ABEKA). The system already works — this is a design pass to make an existing functional interface look and feel professional.

---

## 1. Product Identity

### Product name
**Brite SMS** (School Management System)

### System type
A web-based school management system designed specifically for Ghanaian private basic schools — from Crèche and Nursery through to JHS 3. The Phase 1 system covers school configuration, academic structure, staff and student records, admissions, enrollment, file metadata, and audit logging.

This is an **administrative back-office tool**. It is used by school staff at desks, not by students or parents in the field. The dominant use case is a school administrator managing records, processing admissions, or a headteacher reviewing enrollment data. Speed, clarity, and trust are more important than delight or animation.

### Geographic and academic context
- Country: Ghana
- Curriculum: GES (Ghana Education Service), ABEKA, or both
- School calendar: academic years (e.g., 2026/2027) divided into three terms
- Level groups: Crèche, Nursery, KG, Lower Primary (Basic 1–3), Upper Primary (Basic 4–6), JHS (JHS 1–3)
- Student ID format: `STU-0001`, `STU-0002`
- Staff ID format: `STF-0001`
- Admission number format: `ADM-0001`
- Phone numbers: Ghanaian format, e.g., `024 412 3456` or `+233 24 412 3456`

### Primary users
| Role | Primary pages |
|------|--------------|
| School Admin / Super Admin | All pages |
| Headteacher | Dashboard, Staff, Students, Classrooms, Admissions, Enrollments, Audit Logs |
| Academic Coordinator | Academic Years, Terms, Levels, Classrooms, Enrollments |
| Admissions Officer | Admissions, Students, Guardians, Student-Guardian Links |
| Class Teacher | Students (their class), Classrooms |
| Compliance Officer | Audit Logs, Files, School Settings |
| Future: Parent/Guardian | Parent portal (Phase 2 — do not design) |

Phase 1 is **entirely admin-facing**. No parent-facing or student-facing screens in this phase.

---

## 2. Design Goal

### What this redesign is for
The existing Phase 1 frontend is **fully functional** — all API integrations work, all CRUD flows work, all lifecycle actions (activate, offer, enroll, withdraw, archive) work. The design pass is purely to improve the visual quality, information hierarchy, and usability of the existing interface.

**Do not add, remove, or alter any feature, page, or API call.** The backend API contracts are fixed.

### What the redesign should achieve
- Make the system feel **professional, trusted, and polished** — appropriate for a school that parents are entrusting with their children's records
- Make it **faster to use** — experienced staff should be able to complete common tasks (creating a student, processing an admission) without unnecessary friction
- Make **status and hierarchy obvious** — active vs. inactive academic year, enquiry vs. enrolled admission, archived vs. active staff member
- Make **data dense but readable** — tables need to show enough information to be useful without looking crowded
- Establish a **consistent design language** that can extend to Phase 2 modules (attendance, fees, grading) without a full rebuild

### What the redesign should not do
- Invent new features or screens not in Phase 1
- Introduce a parent portal, student portal, or any Phase 2 concept
- Make the system feel like a children's app, a consumer fintech product, or a generic SaaS dashboard
- Replace any functional behaviour — all forms, dialogs, actions, and page flows stay the same
- Change route names or navigation structure (the URL `/students`, `/admissions`, etc. must remain)

---

## 3. Phase 1 Pages to Design

The following 16 routes are in scope. All exist and function today.

| Route | Page name |
|-------|-----------|
| `/dashboard` | Dashboard |
| `/school` | School Profile |
| `/school/settings` | School Settings |
| `/document-sequences` | Document Sequences |
| `/academic-years` | Academic Years |
| `/terms` | Terms |
| `/levels` | Levels |
| `/staff` | Staff |
| `/classrooms` | Classrooms |
| `/students` | Students |
| `/guardians` | Guardians |
| `/student-guardians` | Student-Guardian Relationships |
| `/admissions` | Admissions |
| `/enrollments` | Enrollments |
| `/files` | Files Metadata |
| `/audit-logs` | Audit Logs |

---

## 4. Pages and Features Not to Design

The following are explicitly out of scope for this design pass. Do not include them in navigation mockups, page templates, or component references.

**People and academic:**
Attendance, timetable, assessments, grading, report cards, class promotions

**Financial:**
Fees, invoices, receipts, payments, payment plans, bank reconciliation

**Communications:**
SMS sending, push notifications, email campaigns, broadcast messages

**Portals:**
Parent portal, student portal, teacher self-service

**Media and documents:**
Binary file upload, file viewer, photo management

**Operations:**
Inventory, library, transport, hostel management, payroll, canteen

**System:**
Backups, restore, security incidents, data subject requests, GDPR tools, user management, role/permission editor

**Infrastructure:**
Audit log export, API key management, webhooks

---

## 5. User Roles and Expectations

### Admin personas

**School Admin / Super Admin**
The main operator of the system. Sets up the school, manages all reference data, creates users. Comfortable with forms and data tables. Uses every section. Needs efficient batch operations and clear feedback.

**Headteacher**
Reviews records and makes decisions. Less likely to create data directly. Needs clear overviews, easy filtering, and status visibility. Values dignity and trust in the interface.

**Academic Coordinator**
Manages academic years, terms, level structure, and classrooms. Moderate technical comfort. Needs the academic structure section to be logical and hard to misconfigure (e.g., cannot have two active terms).

**Admissions Officer**
Processes enquiries and converts them to enrollments. Handles the full admissions pipeline. Needs a clear status-driven workflow — what stage is each applicant at, what is the next step?

**Class Teacher**
Looks up student information for their class. Primarily reads; rarely creates. Needs fast search and clear student profiles.

**Compliance Officer**
Reviews audit logs, checks file records, monitors system settings. Values the audit log being visually read-only and trustworthy.

### Key UX expectation
All users are Ghanaian school professionals. The system should feel like software they would trust to hold official school records. It should not feel like a startup MVP or a demo.

---

## 6. Core Workflows to Preserve

These workflows are fully implemented. The design should make each one faster and clearer, not change the steps.

### 1. Login and access
User enters email and password → lands on Dashboard. Session is maintained across navigation. On session expiry, they are redirected to login and return to the page they were on after re-authenticating.

### 2. School profile and settings
Admin views and edits the school's name, address, contact, motto, and registration number. Separately, system configuration keys (such as default curriculum, storage bucket) can be updated inline.

### 3. Academic structure setup
Admin creates academic years → creates terms within years (Term 1, Term 2, Term 3) → activates one year and one term at a time → creates curriculum levels (KG 1, Basic 1 … JHS 3) → creates classrooms (Basic 3A, JHS 2 Gold) assigned to levels and years.

### 4. Staff management
Admin creates staff records with a staff number, role category (teacher/admin/support), employment type, and NTC (National Teaching Council) status. Staff can be archived when they leave.

### 5. Student management
Admin creates student records with a student number, full name, date of birth, and gender. Students can be searched, edited, and archived. Guardians linked to a student are visible in an expandable row on the students list.

### 6. Guardian management
Admin creates guardian records with a primary phone number. Guardians can be linked to students with relationship labels (mother, father, uncle). One guardian per student can be designated as primary.

### 7. Admissions pipeline
Admissions Officer creates an enquiry (source: walk-in, referral, website, etc.) → records interest in a level and curriculum → makes a formal offer → converts the offered admission to an enrollment (selecting classroom, academic year, and curriculum track).

### 8. Enrollment management
Admin creates enrollments directly (student + classroom + academic year + curriculum track). Duplicate active enrollments per year are prevented by the system. Active enrollments can be withdrawn with an exit date and optional reason.

### 9. File metadata registration
Admin registers metadata records for documents associated with students, staff, or admissions. No actual file upload — metadata only (file name, type, size, storage location). Records can be archived.

### 10. Audit log review
Compliance Officer views the chronological audit log of all system actions. Logs are read-only. Entries can be expanded to show the before/after state of changed data. Logs can be filtered by module, action, or entity type.

---

## 7. Page Design Requirements

### 7.1 Dashboard (`/dashboard`)

**Purpose:** Landing page after login. Gives a quick sense of the school's current state.

**Current state:** Placeholder only. Phase 2 will add summary widgets.

**Design what you can show:** A skeleton/placeholder dashboard that establishes the layout — a two-or-three column grid of metric cards (empty for now), a recent activity or quick-links panel. The design should make it obvious where these widgets will go when Phase 2 builds them. The page should not feel abandoned — it should feel "coming soon" in a professional way.

**Header:** School name + current academic year + current term (if active).

**Quick-links:** Shortcuts to commonly used pages — New Student, New Admission, View Audit Logs.

**Primary action:** None (read-only in Phase 1).

**Empty state:** "Set up your academic year and classrooms to get started. — [Go to Academic Years]"

---

### 7.2 School Profile (`/school`)

**Purpose:** View and update the school's identity — name, address, contact details, motto, logo URL, registration number.

**Primary action:** Edit (opens a dialog with all fields pre-filled).

**Secondary actions:** None.

**Important fields:** Name, address, Ghana POST GPS, phone, email, motto, registration number, logo URL.

**Layout:** A card with the school's key details laid out in a readable format. The edit button is clearly placed but not dominant — this page is rarely changed.

**Loading state:** Card with skeleton lines in each field position.

**Error state:** Alert with retry option.

**Form/dialog:** All fields in a single scrollable dialog. Fields are clearly labelled. Phone shown in Ghanaian format. No mandatory validation except name.

---

### 7.3 School Settings (`/school/settings`)

**Purpose:** View and update system-wide configuration key/value pairs, grouped by namespace (e.g., `auth.*`, `files.*`, `sms.*`).

**Primary action:** Edit individual setting (inline edit icon per row).

**Layout:** A single table with columns: Key, Value, Description, Edit icon. Settings grouped visually by namespace with a section separator or background band.

**Value types:** String values, numeric values, boolean values. Each type should have an appropriate input in the edit dialog (checkbox for boolean, number input for numeric, text for string).

**Loading state:** Table with skeleton rows.

**Empty state:** Not expected — the system always has at least one setting.

**Form/dialog:** Single-field edit dialog per setting. The current value is pre-filled. The description is shown as help text below the field.

---

### 7.4 Document Sequences (`/document-sequences`)

**Purpose:** Configure how auto-generated ID numbers are formatted — prefix, padding length, and reset policy for each document type.

**Document types:** Student Number, Admission Number, Staff Number, Invoice Number, Receipt Number.

**Primary action:** Edit (per row, opens a small dialog).

**Layout:** A compact 5-row table. Columns: Type label, Prefix, Current Number, Padding, Reset Policy, Edit icon.

**Important:** The current number is displayed but cannot be changed from this UI. This must be visually clear — e.g., a muted/read-only style for that column.

**Prefix examples:** `STU`, `ADM`, `STF`, `INV`, `RCT`

**Padding example:** Padding 4 + prefix `STU` = `STU-0001`

**Form/dialog:** Three editable fields: Prefix (text), Padding Length (number, 1–10), Reset Policy (text). Current number shown as read-only. Label the formatted preview: *"Next number will be: STU-0005"*

---

### 7.5 Academic Years (`/academic-years`)

**Purpose:** Manage the school's annual academic cycles. Only one year can be active at a time.

**Primary action:** New Academic Year (button in page header).

**Row actions:** Edit (pencil icon), Activate (outline button — only on inactive years), Close (outline button — only on the active year).

**Important fields in table:** Label (e.g., `2026/2027`), Start Date, End Date, Status badge (Active / Inactive).

**Status badges:**
- Active → green badge
- Inactive → grey badge

**Business rule to make visible:** The Activate button should have a subtle warning tooltip or colour that hints at "this will deactivate the current active year" — not alarming, just clear.

**Empty state:** "No academic years yet. Create one to start your school year. — [New Academic Year]"

**Loading state:** Table with skeleton rows.

**Error state:** Alert card with retry. The error message from the server (e.g., "Another academic year is already active") should appear as a toast notification, not a page-level error.

**Form/dialog:** Three fields: Label, Start Date, End Date. Date inputs. End-before-start validation shown inline.

---

### 7.6 Terms (`/terms`)

**Purpose:** Manage academic terms within years. Only one term can be active at a time.

**Relationship:** Terms belong to an academic year. The page shows all terms across all years by default, with a filter to narrow by year.

**Primary action:** New Term.

**Filter:** Dropdown to filter by academic year — always visible at the top of the page.

**Row actions:** Edit (pencil icon), Activate (only on Draft or Pending terms), Close (only on the Active term).

**Status flow:** Draft → Pending → Active → Closed *(Note: backend creates terms as Draft)*

**Status badges:**
- Draft → grey/slate badge ("Draft")
- Pending → amber badge ("Pending")
- Active → green badge ("Active")
- Closed → muted badge ("Closed")

**Important fields in table:** Year label, Term number, Label (e.g., "Term 1"), Date range, Status badge.

**Curriculum scope:** Terms can optionally be tagged GES_NACCA, ABEKA, or BOTH — show as a small tag/chip if present.

**Empty state (no filter):** "No terms yet. Create a term within an academic year. — [New Term]"

**Empty state (filtered):** "No terms for 2026/2027 yet. — [New Term for this year]"

**Form/dialog:** Academic Year (pre-selected if filtering), Term Number (1–4), Label, Start Date, End Date, Exam Start (optional), Exam End (optional), Curriculum Scope (optional select). Date validation inline.

---

### 7.7 Levels (`/levels`)

**Purpose:** Define the curriculum levels/grades offered by the school.

**Level groups (Ghanaian context):**
- CRECHE
- NURSERY
- KG (Kindergarten)
- LOWER_PRIMARY (Basic 1–3)
- UPPER_PRIMARY (Basic 4–6)
- JHS (JHS 1–3)

**Primary action:** New Level.

**Row actions:** Edit (pencil icon), Archive (archive icon — only on active levels).

**Sort:** Always by `orderIndex` (ascending). This reflects the progression from Crèche through JHS 3.

**Important fields in table:** Name (e.g., "Basic 1"), Level Group chip, GES designation (e.g., "Basic 1"), ABEKA designation (optional), Order Index, Status.

**Archived levels:** Dimmed rows. No archive action shown for already-archived levels.

**Empty state:** "No levels yet. Add your school's curriculum levels. — [New Level]"

**Sample level names:**
- Crèche, Baby Class, Nursery 1, Nursery 2, KG 1, KG 2, Basic 1, Basic 2, Basic 3, Basic 4, Basic 5, Basic 6, JHS 1, JHS 2, JHS 3

**Form/dialog:** Name, GES Designation, ABEKA Designation (optional), Level Group (select), Order Index (number).

---

### 7.8 Staff (`/staff`)

**Purpose:** Maintain all teaching and support staff records.

**Primary action:** New Staff Member.

**Row actions:** Edit (pencil icon), Archive (archive icon — only on active staff).

**Important fields in table:** Staff Number (code-styled), Full Name + email (two lines), Role Category badge, Employment Type, NTC Status, Active/status badge.

**Role categories:**
- Teacher → blue chip
- Admin → purple chip
- Support → grey chip

**NTC (National Teaching Council) statuses:**
- Licensed → green
- Induction → amber
- Unlicensed → red
- N/A → grey (most admin/support staff)

**Employment types:** Full-time, Part-time, Contract

**Staff status badges:**
- Active → green
- On Leave → amber
- Resigned → grey (dimmed row)
- Terminated → red (dimmed row)

**Sample staff names:** Akosua Mensah-Boateng, Kwesi Asante-Boateng, Abena Adjei, Emmanuel Yeboah, Patience Agyemang

**Loading state:** Table skeleton with 5–8 rows.

**Empty state:** "No staff members yet. Add your first staff member to get started. — [New Staff Member]"

**Form/dialog:** Staff Number, First Name, Last Name, Phone, Email, Role Category (required select), Employment Type (optional select), NTC Status (select — default N/A), NTC Registration Number (optional), Joined Date. Two-column layout for names, phone/email, role/employment pairs.

---

### 7.9 Classrooms (`/classrooms`)

**Purpose:** Manage class groups — each classroom is a combination of a level and an academic year, with a section label and optional capacity.

**Primary action:** New Classroom.

**Row actions:** Assign Teacher (person icon), Edit (pencil icon), Archive (archive icon — only on active classrooms).

**Important fields in table:** Display Name (e.g., "Basic 3A"), Level badge, Academic Year, Capacity (if set), Active status, Assigned teacher name (or "—" if not assigned).

**Sample classroom names:** Crèche Blue, Nursery A, KG 1 Gold, KG 2 Silver, Basic 1A, Basic 1B, Basic 2A, Basic 3A, Basic 4A, Basic 5A, Basic 6A, JHS 1A, JHS 2 Gold, JHS 3A

**Section label examples:** A, B, Gold, Silver, Blue, Green, Red

**Assign teacher flow:** A small dialog with a single dropdown listing active teachers. Pre-selects the currently assigned teacher if one exists.

**Loading state:** Table skeleton.

**Empty state:** "No classrooms yet. Create classrooms by selecting a level and academic year. — [New Classroom]"

**Form/dialog:** Level (dropdown of active levels), Academic Year (dropdown), Section Label (short text), Display Name (text, e.g., auto-composed from level + section), Capacity (optional number).

---

### 7.10 Students (`/students`)

**Purpose:** The central student register. View, search, create, and manage all students.

**Primary action:** New Student.

**Search:** Always-visible search bar filters by name or student number.

**Row actions:** Edit (pencil icon), Archive (archive icon — only on active students).

**Expandable row:** Each student row has an expand chevron (▶/▼) on the far left. Expanding shows the student's linked guardians inline. If no guardians are linked, show "No guardians linked." with a link to the Student-Guardian Links page.

**Important fields in table:** Student Number (code-styled), Full Name (preferred name shown in parentheses if set), Gender badge, Date of Birth, Status badge.

**Student status badges:**
- Active → green
- Withdrawn → amber
- Archived → grey (dimmed row)

**Status visibility:** Archived/withdrawn students have a dimmed row (reduced opacity). A visual filter or toggle to show/hide archived students would be helpful.

**Sample student names:** Ama Owusu-Barimah, Kofi Asante-Mensah, Yaa Koomson, Nana Ama Adjei, Kwame Boateng, Efua Sarkodie, Fiifi Agyeman, Akosua Tetteh, Yaw Annan, Afua Asiedu

**Empty state:** "No students found. — [New Student]" (or "No students match your search." if searching)

**Loading state:** Table skeleton with 8–10 rows plus the expand chevron column.

**Form/dialog:** Student Number, First Name, Middle Name (optional), Last Name, Preferred Name (optional), Date of Birth (required), Gender (required select: Male/Female/Other), Nationality (optional, default "Ghanaian"), Religion (optional), Ghana Card ID (optional note: *this can be added later*), Previous School (optional), Admission Date (optional). Three-column name row, two-column other fields.

---

### 7.11 Guardians (`/guardians`)

**Purpose:** The guardian/parent register. Independent from students — a guardian can be linked to multiple students.

**Primary action:** New Guardian.

**Search:** Always-visible search bar.

**Row actions:** Edit (pencil icon), Archive (archive icon — only on unarchived guardians).

**Expandable row:** Expand chevron shows linked students. If none, "No students linked." with a link to Student-Guardian Links.

**Important fields in table:** Full Name, Primary Phone (prominent — this is the key contact field), Email, Occupation, Archive status (dimmed row if archived).

**Archived guardians:** Dimmed rows. Archive icon replaced with no action.

**Sample guardian names:** Kwame Owusu, Abena Asante, Yaa Acheampong, Emmanuel Mensah, Akosua Boateng-Annan, Josephine Asiedu, Kofi Tetteh

**Sample phone numbers:** 024 412 3456, 050 123 4567, 027 987 6543, 020 234 5678

**Empty state:** "No guardians yet. Add guardians to link them to students. — [New Guardian]"

**Form/dialog:** First Name, Last Name, Primary Phone (required), Secondary Phone (optional), Email (optional), Occupation (optional), Address (optional). Two-column layout for names, phones.

---

### 7.12 Student-Guardian Relationships (`/student-guardians`)

**Purpose:** Manage the many-to-many links between students and guardians. The relationship label (mother, father, uncle, family friend, etc.) lives on the link — not on the guardian record.

**Layout:** Unlike other pages, this is not a standard CRUD table. It shows a student list (same search-as-you-type behaviour as the Students page), and each student has a collapsible panel showing their linked guardians.

**Per-student panel actions:** "Link Guardian" button at the top right of the panel.

**Per-link actions:** Set Primary (only shown if the guardian is not already primary), Edit (pencil), Unlink (bin icon).

**Primary guardian indicator:** A star icon ★ next to the guardian's name if they are the primary guardian. The primary guardian should be visually distinct.

**Emergency contact indicator:** A small icon or tag if the guardian is flagged as an emergency contact.

**Permission flags shown as small chips:** "Can receive SMS", "Can access portal" — styled as small muted chips, not bold.

**Important design note:** This page's purpose is easy to misread as "edit the guardian." The design should make it clear that you are managing the *relationship link*, not the guardian record itself. A small contextual note near the page description: *"Relationship labels and permissions belong to the link, not the guardian. The same guardian can be linked to multiple students with different labels."*

**Empty panel:** "No guardians linked. — [Link Guardian]"

**Loading state:** Per-student panel shows a skeleton row.

**Link form/dialog:** Select Guardian (dropdown of active guardians, showing name + phone), Relationship label (free text: "mother", "father", "uncle", "family friend"), Checkboxes: Primary Guardian, Emergency Contact, Can receive SMS, Can access portal.

---

### 7.13 Admissions (`/admissions`)

**Purpose:** Track prospective students through the admissions pipeline: enquiry → offered → enrolled.

**Status flow:** Enquiry → (Application →) Offered → Enrolled. Also: Withdrawn, Rejected.

**Primary action:** New Admission.

**Filter:** Status dropdown always visible — filter by Enquiry, Offered, Enrolled, Withdrawn, Rejected.

**Row actions (context-sensitive — depend on current status):**
- Enquiry/Application → Edit (pencil), Offer button
- Offered → Edit (pencil), Enroll button
- Enrolled/Withdrawn/Rejected → No actions (read-only rows)

**Status badges:**
- Enquiry → amber/yellow
- Application → light blue
- Offered → blue
- Enrolled → green
- Withdrawn → grey
- Rejected → red (muted)

**Important fields in table:** Admission Number (code, if assigned — otherwise `—`), Enquiry Source, Curriculum Interest, Application Date (if present), Status badge, Enrolled At date (if enrolled).

**Enquiry source labels:** Walk-in, Referral, Website, Social Media, Advertisement, Other

**Important UX note for the Offer and Enroll buttons:** These are **status-transition actions**, not navigation. Style them distinctly from the edit action — perhaps as small labelled icon-buttons (gift icon for Offer, graduation cap or tick icon for Enroll) with a colour that suggests "move forward."

**Enroll dialog (opens when clicking Enroll):**
- Optional: Select Student (dropdown — shown only if no student is already linked to this admission)
- Required: Select Classroom (dropdown — active classrooms only)
- Required: Select Academic Year (dropdown)
- Required: Curriculum Track (GES_NACCA / ABEKA)

**Empty state:** "No admissions yet. Record your first enquiry. — [New Admission]"

**Filtered empty state:** "No admissions with status 'Offered'. — [Clear filter]"

**Form/dialog (create/edit):** Student (optional dropdown), Intended Level (optional dropdown), Enquiry Source (optional select), Curriculum Interest (optional select: GES_NACCA / ABEKA / BOTH), Notes (optional textarea).

---

### 7.14 Enrollments (`/enrollments`)

**Purpose:** The formal record of which student is in which classroom for which academic year.

**Business rule to make visible:** One active enrollment per student per year. The system prevents duplicates; the UI should show a clear rejection message when this is triggered.

**Primary action:** New Enrollment.

**Filter:** Status dropdown (Active, Withdrawn, Transferred, Completed).

**Row actions:** Withdraw (only on Active enrollments — shown as a "Withdraw" labelled button or exit-door icon).

**Important note:** Enrollments **cannot be edited** after creation (backend limitation). If a student needs to move classrooms, the workflow is withdraw → re-enroll. Make this clear in the empty actions state for non-active enrollments: *"Withdrawn enrollments cannot be modified."*

**Important fields in table:** Student (name + student number, two lines), Classroom name, Academic Year, Curriculum Track, Enrollment Date, Status badge, Exit Date (if withdrawn).

**Status badges:**
- Active → green
- Withdrawn → grey
- Transferred → amber
- Completed → blue

**Withdraw dialog:** Exit Date (required date picker), Exit Reason (optional textarea — examples: "Family relocation", "Transfer to another school", "Medical leave").

**Empty state:** "No enrollments yet. Create one by selecting a student and classroom. — [New Enrollment]"

**409 duplicate error:** This must surface as a clear toast notification: *"This student already has an active enrollment for 2026/2027 (GES_NACCA). Withdraw the existing enrollment first."*

**Form/dialog:** Student (dropdown, active only), Classroom (dropdown, active only), Academic Year (dropdown), Curriculum Track (GES_NACCA / ABEKA — required select), Enrollment Date (optional date).

---

### 7.15 Files Metadata (`/files`)

**Purpose:** A register of document metadata linked to students, staff, admissions, or the school. Phase 1 stores only metadata — no file upload or download.

**Critical note to make visible in the UI:** A notice at the top of the page or in the page description: *"Phase 1 stores file metadata only. File upload and download will be available in Phase 2."*

**Owner types:** Student, Staff, Guardian, Admission, School, User, Other

**Primary action:** New File Record.

**Filter:** Owner Type dropdown.

**Row actions:** Archive (archive icon — only on non-archived files).

**Important fields in table:** File Name, Owner Type badge, MIME Type (small muted text), Size (formatted as KB or MB, not raw bytes), Public? (Yes/No chip), Archived At (date if archived, otherwise "—").

**Archived rows:** Dimmed. Archive icon removed.

**Size formatting:** 1024 → "1 KB", 204800 → "200 KB", 2097152 → "2 MB"

**Empty state:** "No file records yet. Register document metadata below. — [New File Record]"

**Form/dialog:** Owner Type (required select), Owner ID (optional UUID text field — labelled "Owner record ID"), File Name (required), MIME Type (required — hint text: "e.g. application/pdf, image/jpeg"), Size in bytes (required number), Storage Bucket (required), Storage Key (required — labelled "Storage path"), Category (optional text — e.g., "report", "photo", "certificate"), Public (checkbox).

*Note: Storage Bucket and Storage Key are technical fields. Label them clearly and add hint text: "Provided by your system administrator."*

---

### 7.16 Audit Logs (`/audit-logs`)

**Purpose:** A tamper-proof, chronological record of all significant actions in the system. Strictly read-only.

**Critical visual requirement:** The page must **clearly communicate that this is read-only**. A persistent notice at the top is required — not just a tooltip. Suggested: a soft blue information bar with a lock icon: *"Audit logs are immutable. No entries can be added, edited, or deleted."*

**There are no create, edit, or delete buttons on this page. None.**

**Filter bar:** Three text inputs — Filter by Module (e.g., `admissions`), Filter by Action (e.g., `student.create`), Filter by Entity Type (e.g., `student`). A "Clear filters" link appears when any filter is active.

**Pagination:** The audit log can have hundreds of entries. Pagination is essential. Show page number and total entry count clearly.

**Important fields in table:** Timestamp (formatted date + time, displayed prominently), Action (bold), Module (muted chip), Actor Type (user/system chip), Entity Type + Entity ID (two lines, entity ID truncated), User ID (truncated, with copy-on-click if possible).

**Expandable rows:** Only rows where `changes` data exists have an expand arrow. Expanding shows:
- **Before:** JSON object showing previous state (light red background or neutral)
- **After:** JSON object showing new state (light green background or neutral)
- IP address and user agent shown in a small muted line below the change block

**Timestamp format:** `5 Jun 2026, 09:14:32` — always show seconds for audit context.

**Loading state:** Table skeleton with 10 rows.

**Empty state (filtered):** "No audit events match your filters. — [Clear filters]"

**Empty state (no data at all):** Not expected in a running system, but if shown: "No audit events recorded yet."

---

## 8. Navigation Structure

### Sidebar grouping (recommended)

```
[Brite SMS logo + school name]

─── Overview ─────────────────
  Dashboard

─── School Setup ─────────────
  School Profile
  School Settings
  Document Sequences

─── Academic Structure ────────
  Academic Years
  Terms
  Levels
  Classrooms

─── People ───────────────────
  Staff
  Students
  Guardians
  Student-Guardian Links

─── Admissions & Enrollment ──
  Admissions
  Enrollments

─── Records ──────────────────
  Files
  Audit Logs

─── [bottom] ─────────────────
  [User email / avatar]
  Sign out
```

### Navigation behaviour
- The sidebar is always visible on desktop (≥1024px)
- On tablets and mobile, the sidebar collapses to a hamburger/drawer
- The active page is highlighted with the primary brand colour
- Group headings are non-clickable section separators
- Groups do **not** expand/collapse (unlike the current implementation) — all items are always visible. The groups are visual separators, not accordion panels. This reduces click friction for experienced users.
- The school name is shown at the top of the sidebar, below the logo
- Current academic year and term (if active) are shown in a small status strip below the school name or in the header

### Page header pattern
Every page has a consistent header:
- Page title (h1)
- Brief description (one line, muted)
- Primary action button (right-aligned) where applicable
- Optional filter/search bar immediately below the header

---

## 9. Visual Direction

### Overall feel
**Professional, calm, and trustworthy.** This system holds official school records. The design should feel like serious administrative software — not a consumer app, not a toy, not a games company's dashboard. Think: a well-designed university management system, a government service with good UX, or a respected medical records system. Clean, quiet, and purposeful.

### What to avoid
- Bright, saturated primary-school colours (reds, yellows, greens used as backgrounds)
- Playful rounded shapes or hand-drawn style elements
- Consumer fintech aesthetics (gradient cards, large coin icons, glowing accents)
- LMS aesthetics (course grids, progress bars, badges/achievements)
- Dark mode as default (admins work in offices in daylight; light mode is primary)
- Heavy shadows and glassmorphism — keep it flat-to-subtle
- Decorative illustrations — data is the content

### What to lean into
- Whitespace as a tool — generous padding in cards and tables
- Typography-first hierarchy — use font weight and size more than colour to establish hierarchy
- Subtle, purposeful use of colour — mostly neutral backgrounds, colour reserved for status and primary actions
- Data density that doesn't feel cluttered — tables that hold meaningful information without wrapping excessively
- Consistency above novelty — the same button style, the same card style, the same table style everywhere

### Ghanaian context
The system should not feel generic Western SaaS. Small details matter:
- Phone number format: `024 412 3456` (not `(024) 412-3456`)
- Date format: `5 Jun 2026` or `05/06/2026` (day-first)
- Level names: Crèche, KG 1, Basic 1–6, JHS 1–3 (not Grade 1, not Year 1)
- Term labels: Term 1, Term 2, Term 3 (not Semester 1)
- Curriculum tags: GES_NACCA, ABEKA, BOTH

---

## 10. Suggested Colour Direction

### Primary palette

**Option A — Deep Navy + Gold** *(recommended)*
- Primary: `#1E3A5F` (deep navy)
- Primary hover: `#16304F`
- Accent: `#C9952A` (gold/amber) — used for highlights, active indicators, primary action buttons
- Sidebar background: `#0F2240` (darker navy)
- Sidebar active item: `#C9952A` (gold)
- Sidebar text: `#B8C9DC` (muted light blue-grey)

**Option B — Teal + Amber**
- Primary: `#1A5F6E` (deep teal)
- Primary hover: `#14505D`
- Accent: `#D97706` (amber)
- Sidebar background: `#0D3F4A`
- Sidebar active item: `#D97706`

**Option C — Slate Blue + Green**
- Primary: `#2563EB` (Tailwind blue-600)
- Accent: `#16A34A` (Tailwind green-600)
- Sidebar: `#1E293B` (Tailwind slate-800)

### Neutral palette (shared across all options)
- Page background: `#F8FAFC` (near-white, slightly cool)
- Card background: `#FFFFFF`
- Table header background: `#F1F5F9`
- Table row hover: `#F8FAFC`
- Border: `#E2E8F0`
- Muted text: `#64748B`
- Body text: `#1E293B`

### Status colours (semantic, shared)
- Success / Active: `#16A34A` (green) — backgrounds at 10% opacity with full-opacity text
- Warning / Pending / On Leave: `#D97706` (amber)
- Draft / Inactive: `#64748B` (slate)
- Error / Archived / Terminated: `#DC2626` (red)
- Info / Offered / Application: `#2563EB` (blue)
- Closed / Completed: `#475569` (slate, slightly muted)

### Typography
- Font: Inter (already in the stack) — clean, readable, neutral
- Scale: Use a clear 4-level hierarchy: page title (24px semibold), section heading (16px semibold), body (14px regular), muted detail (12px regular)
- Monospace for code values (student numbers, staff IDs, storage keys): `font-mono`, slightly smaller

---

## 11. Layout Requirements

### Page structure
```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main content area              │
│                         │  ┌────────────────────────────┐ │
│  [Logo + school name]   │  │ Top bar (height: 56px)     │ │
│  [Year/term strip]      │  │ [Breadcrumb]  [User menu]  │ │
│                         │  └────────────────────────────┘ │
│  Navigation groups      │  ┌────────────────────────────┐ │
│                         │  │ Page header                │ │
│                         │  │ [Title]    [Primary action]│ │
│                         │  │ [Description]              │ │
│                         │  └────────────────────────────┘ │
│                         │  ┌────────────────────────────┐ │
│  [User / sign out]      │  │ Filter bar (if applicable) │ │
│                         │  └────────────────────────────┘ │
│                         │  ┌────────────────────────────┐ │
│                         │  │ Content (table / cards)    │ │
│                         │  │                            │ │
│                         │  │                            │ │
│                         │  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Responsive breakpoints
- **Desktop (≥1024px):** Sidebar fixed, full table layout
- **Tablet (768–1023px):** Sidebar collapses to icon-only or slides to drawer on hamburger tap. Table columns may reduce — keep name, status, and actions; hide secondary columns.
- **Mobile (<768px):** Drawer navigation. Tables scroll horizontally or convert to card stacks. Forms are full-width single-column.

### Table layout rules
- First column: always the primary identifier (student number, staff number, etc.)
- Last column: always the Actions column, right-aligned
- Row height: comfortable (48px minimum) — not compressed, not oversized
- Alternating row shading is optional but must be very subtle if used
- The sort and filter controls should be in a dedicated bar above the table, not inside the table header
- Column widths: identifier columns are narrow (fixed width); name columns are wider; date columns are fixed-width; status badge columns are fixed-width; action column is fixed-width

### Dialog/form layout
- Max width: 480px (small), 560px (medium), 640px (large forms like Student)
- All dialogs have: title, optional description, scrollable content area, sticky footer with Cancel + Save
- Backdrop is a semi-transparent overlay; the dialog itself is centered, elevated with subtle shadow
- Tab order follows visual layout
- Required field asterisk (*) in label, not on the input

### Spacing system
Use Tailwind's default 4px base unit. Key values:
- Card internal padding: 24px (p-6)
- Table cell padding: 12px vertical, 16px horizontal
- Form field gap: 12px
- Section gap within a dialog: 16px
- Page padding (main content): 32px horizontal, 24px top

---

## 12. Component Requirements

### Status badge
Inline pill badge. Small (font-size 11px, padding: 2px 8px). Rounded-full. Colour fills the background at ~10–15% opacity, full-opacity text. No border. Variants: active (green), pending/warning (amber), inactive/closed (slate), archived/error (red), info/blue (blue).

Show the status label as a readable string, not a database enum. `GES_NACCA` → show as `GES/NACCA`. `on_leave` → `On Leave`. `not_applicable` → `N/A`.

### Data table
Clean rows, no heavy grid lines. A single bottom border per row (1px, `#E2E8F0`). Sticky header. Hover state: `#F8FAFC` row background. Selected state: `#EFF6FF` row background (if multi-select is ever needed).

Column header: 12px uppercase, 400 weight, slate muted colour — labels, not decoration.

### Form dialog
Modal with backdrop. Dialog: white card, 8px border radius, subtle shadow (`0 20px 60px rgba(0,0,0,0.12)`). Header: title in 18px semibold + close button (×). Content: scrollable if tall. Footer: sticky at bottom, right-aligned, Cancel (outline) + Save (filled primary).

### Empty state
Centred in the table body. Icon (optional, small and muted, not illustrative). Heading: "No [items] found." Body copy: one line of context. Optional CTA link. No decorative illustration.

### Loading skeleton
Table skeleton: a set of grey animated shimmer bars in the same column layout as the real table. Match the column widths of the live table. 3–8 skeleton rows depending on expected data density.

### API error panel
A soft red or amber card/alert below the page header. Icon (alert triangle). Heading: "Could not load [page name]." Body: the actual server error message. Retry button on the right.

### Confirmation dialog
Used for destructive actions (Archive, Withdraw, Unlink). Smaller dialog (max 400px). Red accent for the confirm button. Clear statement of what will happen. Cancel is default-focused.

### Toast notifications
Bottom-right corner. Auto-dismiss after 4 seconds. Success (green), Error (red), Info (blue). Short text only — one line. No action button needed for Phase 1.

### Expandable table row
A chevron icon (▶/▼) in a narrow first column (32px wide). On click, a sub-row expands below with a slightly different background (`#F8FAFC`). The expand animation is a smooth height transition.

### Page header component
Consistent across all pages: title (h1, 22–24px semibold), description (14px muted, max 80 chars), primary action button (right-aligned, always the same style). Optional secondary badge (e.g., "Read-only" for Audit Logs).

### Code value chip
For values like student numbers, staff numbers, file storage keys. Monospace font, muted background (`#F1F5F9`), subtle border, slightly smaller than body text. `STU-0012` styled this way.

---

## 13. UX Principles

### Forms
- Only ask for what is needed. Required fields are clearly marked.
- Pre-fill forms when editing — never make a user re-enter data they already provided.
- Validate inline, not on submit — show errors as the user types or on field blur.
- Long forms (e.g., New Student) are divided into clear visual sections, not one long scroll.
- Dropdowns pre-filter for relevance — e.g., the Classroom dropdown in Enroll shows only **active** classrooms.

### Destructive actions
- Archive, Withdraw, Unlink — require a confirmation dialog, not just a single click.
- The confirmation dialog states clearly what will happen: *"Archive Akosua Mensah? Her record will no longer appear in active lists. This can be reviewed in archived records."*
- Destructive buttons are never the default/primary button.

### Status transitions
- Lifecycle actions (Activate, Close, Offer, Enroll, Withdraw) are visually distinct from edit/delete actions.
- Show status-transition buttons **only when the transition is valid** for the current state. An already-enrolled admission does not show an Offer button.
- If a transition would be rejected (e.g., activating a second academic year), the system must show a clear message explaining why — not a generic error.

### Labels over database values
- Never show raw enum values to users: `GES_NACCA` → `GES / NACCA`, `not_applicable` → `N/A`, `full_time` → `Full-time`, `lower_primary` → `Lower Primary`.
- Date display: always human-readable — `5 Jun 2026`, never `2026-06-05`.
- Phone display: Ghanaian format — `024 412 3456`.

### Empty states
- Never just "No data." — always give context and a path forward.
- *"No students in this class yet. Students are enrolled via the Enrollments page."*
- If a search/filter is applied: *"No students match your search. [Clear search]"*

### Read-only communication
- The Audit Logs page must visually communicate its immutability. A persistent, non-dismissible notice strip at the top. Lock icon. The phrasing should be matter-of-fact, not alarming: *"Audit logs are a tamper-proof record. Entries cannot be edited or deleted."*
- The Files Metadata page should have a similar note: *"Phase 1 stores file information only. File upload will be available in Phase 2."*

---

## 14. Data Realism

All sample data and placeholder text in mockups should use realistic Ghanaian school data.

### Student names
Ama Owusu-Barimah, Kofi Asante-Mensah, Yaa Koomson, Nana Ama Adjei, Kwame Boateng, Efua Sarkodie, Fiifi Agyeman, Akosua Tetteh, Yaw Annan, Abena Asiedu, Kwabena Darko, Maame Serwaa Gyasi

### Staff names
Akosua Mensah-Boateng, Kwesi Asante-Boateng, Abena Adjei, Emmanuel Yeboah, Patience Agyemang, Kofi Amoah, Adwoa Amponsah, Yaw Darko

### Guardian names
Kwame Owusu, Abena Asante, Yaa Acheampong, Emmanuel Mensah, Josephine Asiedu, Kofi Tetteh, Ama Boateng-Annan

### Phone numbers
`024 412 3456`, `050 123 4567`, `027 987 6543`, `020 234 5678`, `033 201 4567`

### Academic years
2024/2025, 2025/2026, 2026/2027, 2027/2028

### Term labels
Term 1 (September – December), Term 2 (January – April), Term 3 (May – July)

### Level names (full Ghanaian sequence)
Crèche, Baby Class, Nursery 1, Nursery 2, KG 1, KG 2, Basic 1, Basic 2, Basic 3, Basic 4, Basic 5, Basic 6, JHS 1, JHS 2, JHS 3

### Classroom names
Crèche Blue, Nursery A, Nursery B, KG 1 Gold, KG 2 Silver, Basic 1A, Basic 1B, Basic 2A, Basic 2B, Basic 3A, Basic 4A, Basic 5A, Basic 6A, JHS 1A, JHS 2 Gold, JHS 2 Silver, JHS 3A

### Student numbers
STU-0001 through STU-0250 (typical small private school)

### Staff numbers
STF-0001 through STF-0025

### Admission numbers
ADM-0001 through ADM-0050

### Enquiry sources
Walk-in, Referral, Website, Social Media, Advertisement, Community outreach

### Relationship labels
Mother, Father, Uncle, Aunt, Grandmother, Grandfather, Guardian, Elder Sibling, Family Friend

### Curriculum tracks
GES/NACCA, ABEKA, Both

---

## 15. Output Expected from the Design Tool

The design tool should produce the following deliverables:

### 1. Design system foundation
- Colour tokens (primary, accent, neutral, semantic)
- Typography scale (4 levels: page title, section heading, body, detail)
- Spacing scale (4px base, key values documented)
- Border radius, shadow, and elevation tokens
- Icon set recommendation (Lucide Icons is already in use — maintain compatibility)

### 2. Core component designs
- Status badge (all variants: active, pending, inactive, closed, archived, info)
- Data table (header, row, hover, selected, expanded sub-row)
- Form dialog (small, medium, large)
- Page header (with and without primary action)
- Empty state (table context, card context)
- Loading skeleton (table)
- API error panel
- Confirmation dialog
- Toast notification (success, error, info)
- Filter/search bar
- Code value chip (for IDs)
- Sidebar navigation (expanded, active state, section separator)

### 3. Full page designs (high fidelity)
Priority screens — produce these first:

| Screen | Notes |
|--------|-------|
| Login | Full page with form, branding |
| Dashboard | Layout established, widgets placeholder |
| Students list | Search bar, table with expand row, pagination |
| New Student dialog | Full form, two-column layout |
| Admissions list | Status filter, context-sensitive action buttons |
| Admissions → Enroll dialog | Three required fields, student picker if needed |
| Academic Years list | Activate/Close buttons, status badges |
| Terms list | Year filter, Draft/Pending/Active/Closed badges |
| Audit Logs | Read-only notice, filter bar, expandable rows, pagination |
| Classrooms list | Level badge, assign teacher action |

### 4. Implementation notes
- The system is built in **Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui**
- All dialogs use a custom `FormDialog` component wrapping `@base_ui/react` Dialog
- Toast notifications use `sonner`
- Icon library: `lucide-react` — maintain this, do not introduce new icon sets
- All forms use React Hook Form + Zod
- The design must be implementable without adding new npm packages beyond what already exists in the stack
- CSS custom properties (HSL) for theme tokens are already in `globals.css` — new colours should be provided as HSL values for Tailwind integration
- Sidebar is a fixed-width client component — the new design's sidebar dimensions must remain consistent

---

## 16. Constraints

### Hard constraints
- **Do not change any backend API contract.** No new endpoints, no renamed fields, no changed response shapes.
- **Do not add any new routes.** The 16 routes listed in Section 3 are the full Phase 1 scope.
- **Do not introduce any Phase 2 feature** through design — no attendance widgets, no fee cards, no grade charts, even as empty placeholders that imply functionality.
- **Do not change the fundamental page flows** — the steps to create a student, process an admission, or view an audit log must remain the same.

### Technical constraints
- The implementation target is Next.js 16 + Tailwind CSS + shadcn/ui. The design must be buildable within this stack without adding significant new dependencies.
- All data tables must support pagination — the design must accommodate next/previous pagination controls.
- Dialogs must be accessible (keyboard navigation, focus trapping, ARIA labels).
- Colour contrast must meet WCAG AA (4.5:1 for body text, 3:1 for large text and UI components).
- The design must work on screens from 1024px (desktop minimum) down to 375px (mobile).

### Operational constraints
- Ghana's internet can be variable. The design should look good and function correctly even when data takes 1–3 seconds to load — skeleton loading states are not optional.
- The system will be used by staff ranging from highly computer-literate to occasional users. Error messages and empty states must be written for the least technical user, not the most technical.

---

## 17. Reference Documents

The following documents are available in the project repository and provide additional context:

- [PHASE_1_FRONTEND_COMPLETION_REPORT.md](PHASE_1_FRONTEND_COMPLETION_REPORT.md) — Technical summary of what was built, API integrations, bugs found and fixed, and QA results.
- [STAKEHOLDER_FRONTEND_TESTING_GUIDE_PHASE_1.md](STAKEHOLDER_FRONTEND_TESTING_GUIDE_PHASE_1.md) — End-user testing guide describing every page's expected behaviour in plain language. Useful for understanding what users expect from each page.

---

*End of design brief.*
