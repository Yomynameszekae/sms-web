# Stakeholder Frontend Testing Guide — Phase 1
## Brite SMS School Management System

**Version:** Phase 1  
**Audience:** Stakeholders and end-user testers  
**Purpose:** Confirm that all Phase 1 features work correctly through the web interface  
**Date:** June 2026

---

> **Before you start:** This guide is written for people who will test through the web browser, not through any technical tools. You do not need to be a developer to follow these steps. If something does not behave the way this guide says it should, that is a bug — please report it using the format in Section 11.

---

## Table of Contents

1. [What Phase 1 Includes](#1-what-phase-1-includes)
2. [What Phase 1 Does Not Include Yet](#2-what-phase-1-does-not-include-yet)
3. [How to Access the Web App](#3-how-to-access-the-web-app)
4. [How to Log In](#4-how-to-log-in)
5. [What to Do If Your Session Expires](#5-what-to-do-if-your-session-expires)
6. [Suggested Testing Order](#6-suggested-testing-order)
7. [Test Scenarios by Page](#7-test-scenarios-by-page)
8. [What to Report as a Bug](#8-what-to-report-as-a-bug)
9. [What Is Not a Bug](#9-what-is-not-a-bug)
10. [Known Limitations](#10-known-limitations)
11. [Bug Report Format](#11-bug-report-format)
12. [Feedback Format](#12-feedback-format)
13. [Sign-off Checklist](#13-sign-off-checklist)

---

## 1. What Phase 1 Includes

Phase 1 gives you a working web interface for the following areas of school management:

**School configuration**
- School profile (name, address, contact details, motto)
- School settings (system-wide configuration)
- Document sequences (how ID numbers are formatted)

**Academic structure**
- Academic years
- Terms within each year
- Curriculum levels (e.g., Basic 1, Basic 2, KG 1)
- Classrooms (class groups assigned to levels and years)

**People**
- Staff records
- Student records
- Guardian records
- Student-guardian relationships (linking a guardian to a student with a relationship label)

**Admissions and enrollment**
- Admissions pipeline (from first enquiry through to formal enrollment)
- Enrollments (assigning a student to a classroom for an academic year)

**Records**
- File metadata (a register of documents linked to students, staff, or other records)
- Audit logs (a read-only history of everything that has happened in the system)

---

## 2. What Phase 1 Does Not Include Yet

The following features are planned for later phases and are **not available in Phase 1**. Please do not report these as bugs.

| Not available yet | Planned for |
|-------------------|-------------|
| Attendance marking and registers | Phase 2 |
| Assessments, grading, and report cards | Phase 2 |
| Fees, invoices, and payments | Phase 2 |
| SMS and notification sending | Phase 2 |
| Parent/guardian portal | Phase 2 |
| Uploading actual files (photos, PDFs) | Phase 2 |
| Dashboard summary statistics | Phase 2 |
| Data backup and restore | Phase 2 |

**The current visual design is also not final.** The interface is clean and functional, but the colours, layout, and styling will be refined in a later phase. Please evaluate whether the features work correctly, not how they look.

---

## 3. How to Access the Web App

Open your web browser and go to:

```
http://localhost:3000
```

If you see a login screen, the application is running. If the page does not load, ask your system administrator to confirm the server is running.

**Supported browsers:** Chrome, Edge, Brave, Safari, Firefox (any recent version).

---

## 4. How to Log In

1. Go to `http://localhost:3000` — you will be taken to the login page automatically.
2. Enter the administrator email address and password provided to you.
3. Click **Sign in**.
4. You will be taken to the Dashboard.

The sidebar on the left shows all the pages available to you.

---

## 5. What to Do If Your Session Expires

If you are in the middle of testing and the page suddenly shows the login screen again, your session has expired. This is normal security behaviour.

1. Log in again with the same credentials.
2. Navigate back to the page you were testing.
3. Your data is not lost — the session expiry only means you need to re-authenticate.

You do not need to report a session expiry as a bug unless it happens within a few minutes of logging in without any inactivity.

---

## 6. Suggested Testing Order

Work through the pages in this order. Each section builds on the previous, so testing in sequence will help you spot data inconsistencies.

| Order | Page | Why this order |
|-------|------|---------------|
| 1 | Login | Must work before anything else |
| 2 | School Profile | Foundation data |
| 3 | School Settings | System configuration |
| 4 | Document Sequences | Controls how ID numbers are generated |
| 5 | Academic Years | Required before creating terms |
| 6 | Terms | Required before creating classrooms or enrollments |
| 7 | Levels | Required before creating classrooms |
| 8 | Classrooms | Required before creating enrollments |
| 9 | Staff | Can be done at any point |
| 10 | Students | Can be done at any point |
| 11 | Guardians | Should be done before linking |
| 12 | Student-Guardian Relationships | Requires both a student and a guardian |
| 13 | Admissions | Independent pipeline |
| 14 | Enrollments | Requires a student and a classroom |
| 15 | Files Metadata | Can be done at any point |
| 16 | Audit Logs | Do last — you will see the full history of your testing |

---

## 7. Test Scenarios by Page

---

### 7.1 Login

#### Scenario A — Successful login

**What to do:**
1. Go to `http://localhost:3000`.
2. Enter your email address and password.
3. Click **Sign in**.

**What should happen:**
- The button shows a loading state while the request is processing.
- You are taken to the Dashboard page.
- The sidebar is visible on the left.

**What to report if it fails:**
- The page does not redirect after clicking Sign in.
- An error message appears even with the correct credentials.
- The page crashes or shows a blank white screen.

---

#### Scenario B — Wrong password

**What to do:**
1. Go to `http://localhost:3000/login`.
2. Enter your email address but type the wrong password.
3. Click **Sign in**.

**What should happen:**
- An error message appears saying something like "Invalid credentials."
- You remain on the login page.
- The password field is not cleared (you can correct it and try again).

**What to report if it fails:**
- No error message appears and you are left on the login page with no feedback.
- The page crashes.

---

#### Scenario C — Empty form submission

**What to do:**
1. Go to the login page.
2. Leave both fields blank.
3. Click **Sign in**.

**What should happen:**
- Validation messages appear below the empty fields (e.g., "Email is required").
- The form does not submit to the server.

---

### 7.2 Dashboard

**What to do:**
1. After logging in, verify you are on the Dashboard.
2. Look at the sidebar — note all the navigation items.

**What should happen:**
- The sidebar shows these sections: Dashboard, School (with sub-items Profile, Settings, Document Sequences), Academic Structure (with sub-items Academic Years, Terms, Levels, Classrooms), and individual links for Staff, Students, Guardians, Student-Guardian Links, Admissions, Enrollments, Files, Audit Logs.
- Clicking a group heading (e.g., "School") expands or collapses its sub-items.

**What to report if it fails:**
- Any navigation item from the list above is missing.
- Clicking a link produces an error or a blank page.
- The sidebar does not appear at all.

> **Note:** The Dashboard currently shows a placeholder page. A summary with statistics and recent activity is planned for Phase 2.

---

### 7.3 School Profile

#### Scenario A — View school profile

**What to do:**
1. Click **School → Profile** in the sidebar.

**What should happen:**
- The school's name, address, phone, email, motto, and registration number are displayed on the page.
- There is an **Edit** button.

**What to report if it fails:**
- The page shows an error instead of the school data.
- The page is blank or shows placeholder text like "Coming Soon."

---

#### Scenario B — Edit school profile

**What to do:**
1. On the School Profile page, click **Edit**.
2. Change the motto field (for example, type: "Excellence in Education").
3. Click **Save**.

**What should happen:**
- A dialog appears with the form pre-filled with the current values.
- After clicking Save, the dialog closes.
- A success notification (toast) appears at the bottom of the screen.
- The updated motto is visible on the page.

**What to report if it fails:**
- The dialog does not open when you click Edit.
- The form is blank instead of pre-filled.
- After saving, the page still shows the old value.
- No success notification appears.

---

### 7.4 School Settings

#### Scenario A — View settings

**What to do:**
1. Click **School → Settings** in the sidebar.

**What should happen:**
- A list of configuration settings is displayed, grouped by category.
- Each setting shows a key name, the current value, and an edit icon.

**What to report if it fails:**
- The page shows an error.
- No settings are listed even though the school is set up.

---

#### Scenario B — Edit a setting

**What to do:**
1. Click the edit icon (pencil) next to any setting.
2. Change the value.
3. Click **Save**.

**What should happen:**
- An edit dialog appears with the current value pre-filled.
- After saving, the dialog closes with a success notification.
- The updated value appears in the list.

**What to report if it fails:**
- The edit icon does not open a dialog.
- The saved value does not update in the list.

---

### 7.5 Document Sequences

Document sequences control how ID numbers (student numbers, staff numbers, admission numbers) are formatted — for example, `STU-0001`.

#### Scenario A — View sequences

**What to do:**
1. Click **School → Document Sequences** in the sidebar.

**What should happen:**
- A table shows all 5 sequence types: Student Number, Admission Number, Staff Number, Invoice Number, Receipt Number.
- For each, you can see the current prefix, the current number, the padding length, and the reset policy.

---

#### Scenario B — Edit a sequence

**What to do:**
1. Click the edit icon (pencil) next to **Student Number**.
2. Observe the current values.
3. Change the Padding Length to **5**.
4. Click **Save**.

**What should happen:**
- The dialog shows the current prefix, padding, and reset policy.
- After saving, the table updates to show Padding: 5.
- A success notification appears.

**What to report if it fails:**
- The dialog does not open.
- The padding value does not update after saving.

> **Note:** You cannot change the current number directly from this screen. If a sequence number needs to be reset, that is a system-level operation.

---

### 7.6 Academic Years

#### Scenario A — View academic years

**What to do:**
1. Click **Academic Structure → Academic Years** in the sidebar.

**What should happen:**
- A table lists all academic years with their label, start date, end date, and status (Active or Inactive).
- The currently active year is clearly marked.

---

#### Scenario B — Create a new academic year

**What to do:**
1. Click **New Academic Year**.
2. Enter a label (e.g., `2031/2032`).
3. Enter a start date (e.g., `2031-09-01`) and end date (e.g., `2032-07-31`).
4. Click **Save**.

**What should happen:**
- The new year appears in the table with an Inactive status.
- A success notification appears.

---

#### Scenario C — Attempt to activate a second year (should be rejected)

**What to do:**
1. Find a year in the table that is **not** currently active.
2. Click **Activate** next to it.

**What should happen:**
- If another year is already active, a notification appears saying something like "Another academic year is already active." The attempt is rejected.
- If no year is currently active, the activation succeeds and the status changes to Active.

**What to report if it fails:**
- Two years are marked Active at the same time.
- Clicking Activate has no visible effect and no notification appears.

---

#### Scenario D — Close the active year

**What to do:**
1. Find the currently active academic year.
2. Click **Close** next to it.

**What should happen:**
- The year's status changes from Active to Inactive.
- A success notification appears.

---

### 7.7 Terms

#### Scenario A — View terms

**What to do:**
1. Click **Academic Structure → Terms** in the sidebar.

**What should happen:**
- All terms are listed with their year, term number, label, date range, and status.
- There is a **Filter by year** dropdown at the top. Selecting a year narrows the list.

---

#### Scenario B — Create a term

**What to do:**
1. Click **New Term**.
2. Select an academic year from the dropdown.
3. Enter: Term Number `1`, Label `Term 1`, Start Date `2031-09-01`, End Date `2031-12-15`.
   (Exam dates and Curriculum Scope are optional — leaving Curriculum Scope on **— Any —** is valid.)
4. Click **Create**.

**What should happen:**
- The new term appears in the table with status **Draft**.
- A success notification appears.

---

#### Scenario C — Activate a term

**What to do:**
1. Find a term with status **Draft**.
2. Click **Activate**.

**What should happen:**
- The term's status changes to Active.
- If another term is already active, the attempt is rejected with an appropriate notification.

---

#### Scenario D — Close a term

**What to do:**
1. Find the currently active term.
2. Click **Close**.

**What should happen:**
- The term status changes to Closed.
- A success notification appears.

---

#### Scenario E — Validation: end date before start date

**What to do:**
1. Click **New Term**.
2. Enter a Start Date that is **later** than the End Date (e.g., Start: `2031-12-01`, End: `2031-09-01`).
3. Click **Save**.

**What should happen:**
- A validation error appears below the End Date field: "End date must be after start date."
- The form does not submit.

---

### 7.8 Levels

Levels are the curriculum grades (e.g., KG 1, Basic 1, Basic 2, JHS 1).

#### Scenario A — View levels

**What to do:**
1. Click **Academic Structure → Levels** in the sidebar.

**What should happen:**
- All curriculum levels are listed, sorted by their order index.
- Each row shows the level name, level group (e.g., KG, Lower Primary, JHS), and whether it is active.

---

#### Scenario B — Create a level

**What to do:**
1. Click **New Level**.
2. Enter: Name `Basic 4`, Level Group `Lower Primary`, Order Index `4`.
3. Click **Save**.

**What should happen:**
- The new level appears in the table.
- A success notification appears.

---

#### Scenario C — Archive a level

**What to do:**
1. Find an active level in the list.
2. Click the archive icon (the box/archive icon in the Actions column).

**What should happen:**
- The row dims to indicate it is no longer active.
- A success notification appears.

**What to report if it fails:**
- The archive icon has no effect.
- The row does not dim after archiving.

---

### 7.9 Staff

#### Scenario A — View staff

**What to do:**
1. Click **Staff** in the sidebar.

**What should happen:**
- All staff members are listed with their staff number, name, role category (Teacher, Admin, Support), employment type, NTC status, and current status (Active, On Leave, etc.).

---

#### Scenario B — Create a staff member

**What to do:**
1. Click **New Staff Member**.
2. Fill in:
   - Staff Number: `STF-001` (if not already used, otherwise use `STF-T001`)
   - First Name: `Akosua`
   - Last Name: `Mensah`
   - Role Category: `Teacher`
3. Leave Employment Type and NTC Status at their defaults.
4. Click **Save**.

**What should happen:**
- The dialog closes.
- The new staff member appears in the table.
- A success notification appears.

**What to report if it fails:**
- Required fields (First Name, Last Name, Staff Number, Role Category) do not show a validation error when left blank.
- The record does not appear in the table after saving.

---

#### Scenario C — Edit a staff member

**What to do:**
1. Find a staff member in the table.
2. Click the edit icon (pencil) in their row.
3. Change their Employment Type to **Full-time**.
4. Click **Save**.

**What should happen:**
- The dialog opens pre-filled with their current details.
- After saving, the updated employment type appears in the table.

---

#### Scenario D — Archive a staff member

**What to do:**
1. Find an **Active** staff member.
2. Click the archive icon in their row.

**What should happen:**
- The row dims to indicate the staff member is no longer active.
- A success notification appears.
- The archive icon is replaced by a **Restore** button.

---

#### Scenario E — Restore an archived staff member

**What to do:**
1. Find an archived (dimmed) staff member.
2. Click **Restore** in their row.

**What should happen:**
- The staff member returns to **Active** status and the row undims.

---

### 7.10 Classrooms

#### Scenario A — View classrooms

**What to do:**
1. Click **Academic Structure → Classrooms** in the sidebar.

**What should happen:**
- All classrooms are listed with their name, level, academic year, capacity, and active status.

---

#### Scenario B — Create a classroom

**What to do:**
1. Click **New Classroom**.
2. Select a **Level** from the dropdown (e.g., Basic 4).
3. Select an **Academic Year** (e.g., 2031/2032).
4. Enter Section Label: `A`.
5. Enter Display Name: `Basic 4A`.
6. Optionally enter Capacity: `30`.
7. Click **Save**.

**What should happen:**
- The new classroom appears in the table.
- A success notification appears.

---

#### Scenario C — Assign a class teacher

**What to do:**
1. Find an active classroom in the list.
2. Click the assign-teacher icon (the person-with-tick icon) in its row.
3. Select a staff member from the dropdown.
4. Click **Assign**.

**What should happen:**
- The dialog closes.
- A success notification appears.

---

### 7.11 Students

#### Scenario A — View students

**What to do:**
1. Click **Students** in the sidebar.

**What should happen:**
- All student records are listed with student number, full name, gender, date of birth, and status.
- There is a search bar at the top. Typing a name or student number filters the list.

---

#### Scenario B — Create a student

**What to do:**
1. Click **New Student**.
2. Fill in:
   - Student Number: **leave blank** — it auto-generates
   - First Name: `Ama`
   - Last Name: `Owusu`
   - Date of Birth: `2015-04-20`
   - Gender: `Female`
3. Leave all other fields blank.
4. Click **Save**.

**What should happen:**
- The dialog closes.
- The new student appears in the list with the **next student number assigned
  automatically** (e.g. `STU-0020`). Typing a number instead also works — it
  must simply be unused.
- A success notification appears.

**What to report if it fails:**
- The required fields (First Name, Last Name, Date of Birth, Gender) do not show validation errors when left blank.
- A blank student number is rejected instead of auto-generating.

---

#### Scenario C — View a student's linked guardians

**What to do:**
1. In the student list, click the **right-pointing arrow** (▶) at the very left of any student row.

**What should happen:**
- The row expands below to show a **Guardians** panel.
- If the student has linked guardians, their names and relationship are displayed.
- If no guardians are linked, the message "No guardians linked." appears.
- Clicking the arrow again (now pointing down ▼) collapses the panel.

---

#### Scenario D — Search for a student

**What to do:**
1. In the search bar above the student list, type part of a student's last name.

**What should happen:**
- The list updates to show only students whose name or student number matches.

---

### 7.12 Guardians

#### Scenario A — View guardians

**What to do:**
1. Click **Guardians** in the sidebar.

**What should happen:**
- All guardians are listed with their full name, primary phone number, email, and occupation.

---

#### Scenario B — Create a guardian

**What to do:**
1. Click **New Guardian**.
2. Fill in:
   - First Name: `Kwame`
   - Last Name: `Owusu`
   - Primary Phone: `0244123456`
3. Click **Save**.

**What should happen:**
- The dialog closes.
- The new guardian appears in the list.
- A success notification appears.

**What to report if it fails:**
- Primary Phone does not show a validation error when left blank.

---

#### Scenario C — View a guardian's linked students

**What to do:**
1. Click the **right-pointing arrow** (▶) on any guardian's row.

**What should happen:**
- The row expands to show a **Linked Students** panel.
- Any students linked to this guardian are listed with their name and student number.
- If no students are linked, the message "No students linked." appears.

---

#### Scenario D — Archive a guardian

**What to do:**
1. Find a guardian in the list.
2. Click the archive icon in their row.

**What should happen:**
- The guardian **disappears from the list** — archived guardians are hidden by
  default.

---

#### Scenario E — Show archived and restore

**What to do:**
1. Tick **Show archived** above the guardians list.
2. Find the archived guardian (dimmed) and click **Restore**.

**What should happen:**
- With the toggle on, the archived guardian is visible with a **Restore**
  button; after restoring, the guardian is back in the normal list.
- The same toggle-and-restore pattern exists on **Levels**. Classrooms,
  staff, and students show their archived rows dimmed in the main list with a
  Restore button. **Files** deliberately has no restore — file archiving is
  permanent.

> **Identifier reservation:** an archived record keeps its number, name,
> order index, or phone number reserved. If a new record is refused as a
> duplicate and you cannot see the holder, tick Show archived — restore the
> old record rather than recreating it.

---

### 7.13 Student-Guardian Relationships

This page lets you manage which guardians are linked to which students, including their relationship label (e.g., "mother", "father", "uncle") and whether they are the primary guardian.

> **Important:** The relationship label belongs on the **link**, not on the guardian record. The same guardian can be linked to multiple students with different relationship labels.

#### Scenario A — View the page

**What to do:**
1. Click **Student-Guardian Links** in the sidebar.

**What should happen:**
- A list of students is displayed. Each student has their own panel showing their currently linked guardians.
- A search bar allows you to find a specific student.

---

#### Scenario B — Link a guardian to a student

**What to do:**
1. Find a student in the list.
2. Click **Link Guardian** on their panel.
3. Select a guardian from the dropdown.
4. Type a relationship label, e.g., `mother`.
5. Tick **Primary guardian** if this is the student's main contact.
6. Click **Link Guardian**.

**What should happen:**
- The guardian appears in the student's panel with the relationship label.
- A success notification appears.

---

#### Scenario C — Set a guardian as primary

**What to do:**
1. Find a student who has two or more linked guardians.
2. On a guardian link that is **not** currently the primary, click **Set Primary**.

**What should happen:**
- That guardian is now marked as Primary (shown with a star icon).
- A success notification appears.

---

#### Scenario D — Edit a relationship

**What to do:**
1. On a linked guardian, click the edit icon (pencil).
2. Change the relationship label to `father`.
3. Click **Save**.

**What should happen:**
- The updated label appears on the panel.
- A success notification appears.

---

#### Scenario E — Unlink a guardian

**What to do:**
1. On a linked guardian, click the remove icon (bin/trash icon).

**What should happen:**
- The guardian is removed from the student's panel.
- A success notification appears.

---

### 7.14 Admissions

The admissions pipeline tracks prospective students from first contact through to formal enrollment. The status flow is: **Enquiry → Offered → Enrolled**.

#### Scenario A — View admissions

**What to do:**
1. Click **Admissions** in the sidebar.

**What should happen:**
- All admissions are listed. You can see the admission number (if assigned), enquiry source, curriculum interest, status, and enrollment date.
- There is a **Status filter** dropdown at the top. Selecting a status narrows the list.

---

#### Scenario B — Create an admission

**What to do:**
1. Click **New Admission**.
2. Select Enquiry Source: `Walk-in`.
3. Optionally, select a student from the Student dropdown and an Intended Level.
4. Add Notes: `Parents visited the school office and expressed interest in Basic 1 for September.`
5. Click **Create Admission**.

**What should happen:**
- The dialog closes.
- The new admission appears in the table with status **Enquiry** and an
  **automatically assigned admission number** (e.g. `ADM-0008`) — no dash, no
  typing.
- A success notification appears.

**What to report if it fails:**
- The Admission # column shows a dash or is empty on the new row.

---

#### Scenario B2 — Move an enquiry to Application

**What to do:**
1. Find an admission with status **Enquiry**.
2. Click the **Apply** button in its row.

**What should happen:**
- The status changes to **Application**. (An offer can still be made straight
  from Enquiry — Apply is optional.)

---

#### Scenario C — Make an offer

**What to do:**
1. Find an admission with status **Enquiry** or **Application** in the table.
2. Click the **Offer** button in its row.

**What should happen:**
- The admission's status changes to **Offered**.
- A success notification appears: "Admission offer made."

---

#### Scenario C2 — Revert an offer

**What to do:**
1. Find an admission with status **Offered**.
2. Click the **↩** (Revert offer) button in its row.

**What should happen:**
- The status returns to **Application** and the offer timestamps are cleared.
- The linked student and admission number are unchanged.

---

#### Scenario C3 — Reject and Withdraw

**What to do:**
1. On an Enquiry, Application, or Offered row, click **✕** (Reject) — or
   **⇥** (Withdraw) on a different row.

**What should happen:**
- The status becomes **Rejected** (school declined) or **Withdrawn** (family
  declined), the row dims, and **no further action buttons appear** — both
  states are final.

---

#### Scenario D — Enroll an admission

**What to do:**
1. Find an admission with status **Offered**.
2. Click the **Enroll** button in its row.
3. If the admission does not already have a student linked, select a student from the dropdown.
4. Select a **Classroom**, **Academic Year**, and **Curriculum Track** (GES_NACCA or ABEKA).
5. Click **Enroll**.

**What should happen:**
- The admission's status changes to **Enrolled**.
- A new enrollment is automatically created and will appear on the Enrollments page.
- A success notification appears: "Student enrolled successfully."

---

#### Scenario D2 — Revert an enrollment (guarded)

**What to do:**
1. Find an admission with status **Enrolled** whose student still has an
   **active** enrollment.
2. Click **Revert** in its row.

**What should happen:**
- The request is refused with exactly: *"Withdraw the enrollment first."*

3. Go to **Enrollments**, withdraw that student's active enrollment, return
   to **Admissions**, click **Revert** again.

**What should happen:**
- The admission returns to **Offered**; the linked student is kept.

> If the student's enrollment ended as completed, graduated, or transferred
> (rather than withdrawn), the refusal is permanent and the message says the
> enrollment "records a real outcome" — that is correct behaviour, not a bug.

---

#### Scenario E — Edit an admission

**What to do:**
1. Find an admission with status **Enquiry** or **Offered**.
2. Click the edit icon (pencil).
3. Update the notes field.
4. Click **Save**.

**What should happen:**
- The dialog opens pre-filled with the current details.
- After saving, a success notification appears.

---

### 7.15 Enrollments

An enrollment is the formal placement of a student in a classroom for a specific academic year.

> **One active enrollment per student per year.** The system prevents a second active enrollment for the same student in the same academic year — regardless of curriculum track. Withdraw the existing enrollment first if a student is moving.

#### Scenario A — View enrollments

**What to do:**
1. Click **Enrollments** in the sidebar.

**What should happen:**
- All enrollments are listed with the student ID, classroom name, academic year, curriculum track, enrollment date, and status.
- A **Status filter** dropdown allows you to view only Active, Withdrawn, or other enrollments.

---

#### Scenario B — Create an enrollment

**What to do:**
1. Click **New Enrollment**.
2. Select a **Student** from the dropdown (only active students are listed).
3. Select a **Classroom**.
4. Select an **Academic Year**.
5. Select **Curriculum Track**: `GES_NACCA`.
6. Click **Enroll**.

**What should happen:**
- The new enrollment appears in the list with status **Active**.
- A success notification appears.

**What to report if it fails:**
- Any required field does not show a validation error when left blank.
- The enrollment does not appear after saving.

---

#### Scenario C — Attempt a duplicate enrollment (should be rejected)

**What to do:**
1. Try to create a second enrollment for a student who already has an **Active** enrollment in the same academic year (any curriculum track).

**What should happen:**
- The system rejects the request and shows a clear error notification: "Student already has an active enrollment for this academic year. Withdraw it before creating another one."

**What to report if it fails:**
- The duplicate enrollment is created without an error.
- The error message is unclear or does not appear.

---

#### Scenario C2 — Attempt an enrollment into an ended year (should be rejected)

**What to do:**
1. Click **New Enrollment**, select a student and classroom, and choose the
   **2024/2025** academic year (already ended).
2. Click **Enroll**.

**What should happen:**
- The request is rejected with *"Cannot enroll into 2024/2025: the academic
  year ended on 2025-08-01."* Enrolling into the active or a **future** year
  works normally — pre-enrollment for the coming year is allowed.

---

#### Scenario D — Withdraw an enrollment

**What to do:**
1. Find an **Active** enrollment in the list.
2. Click **Withdraw** in its row.
3. Enter an exit date (e.g., today's date).
4. Optionally enter a reason (e.g., `Family relocation`).
5. Click **Withdraw**.

**What should happen:**
- The enrollment's status changes to **Withdrawn**.
- A success notification appears.

---

### 7.16 Files Metadata

> **Important:** This page stores information *about* files — the file name, type, size, and where it is stored. It does **not** let you upload or download actual files in Phase 1. File upload is a Phase 2 feature.

#### Scenario A — View file records

**What to do:**
1. Click **Files** in the sidebar.

**What should happen:**
- A table shows all file metadata records with: file name, owner type (student, staff, etc.), MIME type, size, and whether the file is archived.
- There is an **Owner Type filter** dropdown.

---

#### Scenario B — Create a file metadata record

**What to do:**
1. Click **New File Record**.
2. Fill in:
   - Owner Type: `Student`
   - Owner ID: *(paste a student's ID if you have it, or leave blank)*
   - File Name: `progress_report_term1.pdf`
   - MIME Type: `application/pdf`
   - Size (bytes): `204800`
   - Storage Bucket: `ghana-sms-dev`
   - Storage Key: `students/reports/progress_report_term1.pdf`
3. Click **Create Record**.

**What should happen:**
- The record appears in the table.
- The size is displayed in a readable format (e.g., "200 KB").
- A success notification appears.

---

#### Scenario C — Archive a file record

**What to do:**
1. Find an active file record (one with a non-dimmed row).
2. Click the archive icon.

**What should happen:**
- The row dims.
- A success notification appears.

---

### 7.17 Audit Logs

> **This page is read-only.** You cannot create, edit, or delete audit log entries. The audit log is a tamper-proof record of everything that has happened in the system.

#### Scenario A — View audit logs

**What to do:**
1. Click **Audit Logs** in the sidebar.

**What should happen:**
- A read-only notice is displayed at the top of the page.
- A table shows recent system events with: timestamp, action, module, actor type, entity type, and user ID.
- There are **no** Create, Edit, or Delete buttons on this page.
- Pagination at the bottom of the table lets you navigate through the full log history.

---

#### Scenario B — Filter audit logs

**What to do:**
1. In the **Filter by module** box, type `admissions`.
2. Press Enter or wait for the list to update.

**What should happen:**
- The table updates to show only events related to the admissions module.

**Try also:**
- Filter by **action**: type `staff.create`
- Filter by **entity type**: type `admission`

---

#### Scenario C — Expand a log entry to see change details

**What to do:**
1. Find a log entry that has a right-pointing arrow (▶) at the far left of the row. Not all entries have one — only those where data was changed.
2. Click the arrow.

**What should happen:**
- The row expands to show a **Before** and **After** section with the data that changed.
- Clicking the arrow again (▼) collapses the entry.

---

#### Scenario D — Confirm the page is read-only

**What to do:**
1. Look carefully at the Audit Logs page for any button labelled "New", "Create", "Add", "Edit", or "Delete".

**What should happen:**
- No such buttons exist. The only interactive elements are the filter inputs, the expand arrows, and the pagination controls.

**What to report:**
- If you find a Create, Edit, or Delete button on this page, report it immediately — that is a security issue.

---

## 8. What to Report as a Bug

Report something as a bug if any of the following apply:

- **A page shows a blank white screen** with no content and no error message.
- **A page shows "Something went wrong"** and clicking Retry does not help.
- **Saving a form has no visible effect** — no success notification and the data does not update.
- **A required field accepts a blank value** and the record is created anyway.
- **A validation message is wrong or missing** — for example, submitting an empty required field shows no error.
- **Data you just saved disappears** after refreshing the page.
- **An action (Archive, Offer, Withdraw, etc.) has no effect** — no notification, no status change.
- **Clicking a sidebar link takes you to the wrong page** or shows a 404 error.
- **Two active academic years exist** at the same time.
- **Two active terms exist** at the same time.
- **A duplicate enrollment is created** without an error message.
- **The Audit Logs page has a Create, Edit, or Delete button.**
- **A hard browser refresh (Cmd+Shift+R or Ctrl+Shift+R) on any page** takes you to the login screen even though you are still logged in.
- **Any text that is clearly wrong** — for example, the wrong school name, mangled characters, or untranslated code values like `GES_NACCA` where a readable label was expected.

---

## 9. What Is Not a Bug

Do not report the following as bugs:

| What you see | Why it is not a bug |
|--------------|---------------------|
| The interface looks plain or lacks visual polish | The UI design is not final. A visual redesign is planned. |
| There is no attendance page | Attendance is Phase 2. |
| There is no grades or report card page | Assessments are Phase 2. |
| There is no fees or payments page | Fees and payments are Phase 2. |
| There is no SMS or notification page | Notifications are Phase 2. |
| The Dashboard has no statistics or charts | Dashboard content is Phase 2. |
| You cannot upload a photo or document | Binary file upload is Phase 2. |
| Numbers appear that you did not type | Admission numbers are always auto-assigned; student/staff numbers auto-generate when left blank. |
| "Withdraw the enrollment first." on Revert | Correct guard — the enrollment must be withdrawn before an enrolled admission can be reverted. |
| An archived guardian or level is "missing" | Archived rows are hidden until you tick Show archived. |
| A brief loading spinner appears before data loads | This is normal — the app is fetching data from the server. |
| A brief "Unauthorized" flash appears in the browser developer console | This is normal — it is the silent session-refresh process, not a real failure. |
| Enrollments cannot be edited after creation | The backend does not support enrollment edits. Withdraw and re-enroll is the correct workflow. |

---

## 10. Known Limitations

The following are known gaps that are acknowledged and either planned for later or awaiting a backend decision:

| Limitation | Detail |
|------------|--------|
| Identifier reservation by archived records | Archived records keep their numbers, names, order indexes, and phone numbers reserved permanently. Restore the archived record instead of recreating it. |
| Enrollment updates not supported | After creating an enrollment, you cannot change the classroom, year, or curriculum track. You must withdraw and re-enroll. |
| Files are metadata-only | The file register stores names, types, and sizes, but actual file content cannot be uploaded or downloaded until Phase 2. |
| No role-based page visibility | All logged-in users can see all pages. Role-specific menus and restricted access will be added in a later phase. |
| Dashboard is a placeholder | The dashboard page exists but has no content yet. |
| UI design is minimal | Colours, fonts, spacing, and overall visual design will be refined in a dedicated design phase after stakeholder testing. |

---

## 11. Bug Report Format

When you find a bug, please report it using this format. Copy and paste the template below into your bug report document or email:

---

**Bug Report**

**Date:** *(date you found it)*  
**Tester name:** *(your name)*  
**Page:** *(e.g., Students, Enrollments, Terms)*  
**Browser:** *(e.g., Chrome, Safari)*

**What I was trying to do:**  
*(Write what you were doing step by step. Be specific — "I clicked New Student, filled in the form, and clicked Save.")*

**What I expected to happen:**  
*(Write what should have happened based on this testing guide.)*

**What actually happened:**  
*(Write exactly what you saw — the error message, the unexpected behaviour, the blank screen, etc.)*

**Screenshot:**  
*(Attach a screenshot if you can.)*

**How often does it happen?**  
- [ ] Every time I try it
- [ ] Happened once, could not reproduce
- [ ] Intermittent (happens sometimes)

---

## 12. Feedback Format

Feedback is for things that work correctly but could be improved. Use this format:

---

**Feedback**

**Date:** *(date)*  
**Tester name:** *(your name)*  
**Page:** *(e.g., Admissions, Classrooms)*

**What I was trying to do:**  
*(What task were you attempting?)*

**What was confusing or difficult:**  
*(What did you struggle with, or what did not feel natural?)*

**Suggestion:**  
*(Optional — if you have an idea for how it could work better.)*

**Priority:**  
- [ ] Blocking — I could not complete the task
- [ ] Inconvenient — I completed the task but it was harder than it should be
- [ ] Minor — a small improvement would be nice

---

## 13. Sign-off Checklist

Work through each area below and mark it as **Pass**, **Fail**, or **Not Tested**. A Pass means all scenarios in Section 7 for that page passed without a bug. A Fail means at least one bug was found and reported. Not Tested means the area was not covered during this session.

| Area | Status | Bug report reference (if Fail) |
|------|--------|-------------------------------|
| Login — successful login | | |
| Login — wrong password rejected | | |
| Login — blank form validation | | |
| School Profile — view | | |
| School Profile — edit and save | | |
| School Settings — view | | |
| School Settings — edit a setting | | |
| Document Sequences — view | | |
| Document Sequences — edit padding | | |
| Academic Years — view | | |
| Academic Years — create | | |
| Academic Years — activate (409 rejected if one already active) | | |
| Academic Years — close | | |
| Terms — view and filter by year | | |
| Terms — create (appears as Draft) | | |
| Terms — activate | | |
| Terms — close | | |
| Levels — view | | |
| Levels — create | | |
| Levels — archive | | |
| Staff — view | | |
| Staff — create | | |
| Staff — edit | | |
| Staff — archive | | |
| Classrooms — view | | |
| Classrooms — create | | |
| Classrooms — assign teacher | | |
| Students — view and search | | |
| Students — create | | |
| Students — expand row to see guardians | | |
| Students — archive | | |
| Guardians — view | | |
| Guardians — create | | |
| Guardians — expand row to see linked students | | |
| Student-Guardian Links — link a guardian | | |
| Student-Guardian Links — set primary | | |
| Student-Guardian Links — edit relationship | | |
| Student-Guardian Links — unlink | | |
| Admissions — view and filter | | |
| Admissions — create | | |
| Admissions — make offer | | |
| Admissions — enroll | | |
| Enrollments — view and filter | | |
| Enrollments — create | | |
| Enrollments — duplicate rejected with 409 | | |
| Enrollments — withdraw | | |
| Files — view | | |
| Files — create metadata record | | |
| Files — archive | | |
| Audit Logs — view with pagination | | |
| Audit Logs — filter by module | | |
| Audit Logs — expand row for change detail | | |
| Audit Logs — confirmed read-only (no create/edit/delete) | | |
| Hard browser refresh preserves session | | |

---

**Overall sign-off**

| | |
|-|-|
| **Tester name:** | |
| **Date completed:** | |
| **Verdict:** | Pass / Fail / Pass with conditions |
| **Conditions (if any):** | *(list any bugs that were found but do not block sign-off)* |
| **Signature:** | |

---

*End of testing guide.*

*For technical questions about this guide, contact the development team. For questions about how a specific feature is supposed to work, refer to the [Phase 1 Frontend Completion Report](PHASE_1_FRONTEND_COMPLETION_REPORT.md).*
