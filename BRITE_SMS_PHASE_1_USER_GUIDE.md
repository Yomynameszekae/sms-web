# Brite SMS — Phase 1 User Guide

**Version:** Phase 1
**Audience:** School Administrators and Staff
**Date:** 6 June 2026
**System:** Brite SMS — Ghanaian Private Basic School Management

---

> A complete reference guide for school administrators and staff using the Brite SMS Phase 1 school management system.

---

## Contents

3. [Introduction](#3-introduction)
4. [Getting Started](#4-getting-started)
5. [Understanding the Interface](#5-understanding-the-interface)
6. [Theme and Appearance Settings](#6-theme-and-appearance-settings)
7. [Dashboard](#7-dashboard)
8. [School Profile](#8-school-profile)
9. [School Settings](#9-school-settings)
10. [Document Sequences](#10-document-sequences)
11. [Academic Years](#11-academic-years)
12. [Terms](#12-terms)
13. [Levels](#13-levels)
14. [Classrooms](#14-classrooms)
15. [Staff](#15-staff)
16. [Students](#16-students)
17. [Guardians](#17-guardians)
18. [Student–Guardian Relationships](#18-student-guardian-relationships)
19. [Admissions](#19-admissions)
20. [Enrollments](#20-enrollments)
21. [Files Metadata](#21-files-metadata)
22. [Audit Logs](#22-audit-logs)
23. [Common Status Badges](#23-common-status-badges)
24. [Common Buttons and Icons](#24-common-buttons-and-icons)
25. [What to Report as a Bug](#25-what-to-report-as-a-bug)
26. [What Is Not a Bug](#26-what-is-not-a-bug)
27. [Quick Reference Workflows](#27-quick-reference-workflows)
28. [Glossary](#28-glossary)
29. [Appendix](#29-appendix)

---


---

## 3. Introduction


Brite SMS is a web-based school management system for Ghanaian private basic schools. It is used by school staff to manage student records, staff, academic structure, admissions, and more.

### Who should use this guide?
School staff: administrators, headteachers, academic coordinators, and admissions officers.

### What does Phase 1 cover?
- School profile and configuration
- Document sequences, academic years, terms, levels
- Classrooms and teacher assignments
- Staff, student, and guardian records
- Admissions pipeline and enrollment management
- File metadata and audit logs

### What is NOT in Phase 1?
Attendance, grading, fees, SMS, parent portal, file upload.



---

## 4. Getting Started


### How to access
Open a web browser and go to the Brite SMS web address. The login page appears automatically.

### Logging in
1. Enter your email address.
2. Enter your password.
3. Click **Sign in**.

> 📷 *Screenshot: Login page*

> 📷 *Screenshot: Filled login form*

> 📷 *Screenshot: Dashboard after login*


### Logging out
Click your avatar (top-right) then **Sign out**.

### Session expiry
If the system logs you out automatically, log in again — your data is safe.



---

## 5. Understanding the Interface


This section describes the common UI elements across all pages: tables, search, filters, status badges, dialogs, toasts, pagination, expandable rows, and the theme selector. See full detail in the PDF.



---

## 6. Theme and Appearance Settings


### Where to find it
School Settings → Appearance (top of the page).

### Five themes
- Navy, Gold & White (default, dark sidebar)
- Blue-Black & Off-White (dark sidebar)
- Sand & Clay (light sidebar)
- Greige & Sage (light sidebar)
- Slate & Peach (light sidebar)

> 📷 *Screenshot: Theme picker in School Settings*


### How theme persistence works
Your chosen theme is saved in your browser (localStorage). When you refresh the page, the theme is restored **immediately** — before the page finishes loading — so there is no visible flash of the wrong theme. If no theme has been saved on your device, the system falls back to **Navy, Gold & White**.

### Important
Theme is saved per device/browser only. Changing it does not affect other staff members' theme choices.



---

## 7. Dashboard


The Dashboard shows Quick Actions (New Student, New Admission, etc.) and Phase 2 placeholder cards (Attendance, Fees, Report Cards, SMS). The Phase 2 cards are NOT active — they are previews only.

> 📷 *Screenshot: Dashboard*




---

## 8. School Profile


Store and update the school's official name, address, phone, email, motto, and registration number.

### How to edit
1. Open School Profile from the sidebar.
2. Click **Edit**.
3. Update fields, then click **Save**.

> 📷 *Screenshot: School Profile page*

> 📷 *Screenshot: Edit School Profile dialog*




---

## 9. School Settings


School Settings stores system configuration values (auth, files, etc.). Edit with care — incorrect settings can affect system behaviour.

### How to edit a setting
1. Click the pencil icon next to a setting.
2. Update the value, then click **Save**.

> 📷 *Screenshot: School Settings page*

> 📷 *Screenshot: Theme picker*




---

## 10. Document Sequences


Document Sequences control the format of auto-generated reference numbers (STU-0001, STF-0001, ADM-0001).

### Understanding padding
Prefix STU + Padding 4 + Number 12 = **STU-0012**

### Important
The Current Number is read-only — do not try to change it directly.

### How to edit
Click the pencil icon on any sequence row, update prefix/padding/reset policy, click **Save**.

> 📷 *Screenshot: Document Sequences page*

> 📷 *Screenshot: Edit Student Number dialog*




---

## 11. Academic Years


Academic years represent full school years (e.g. 2025/2026). Only one can be Active at a time.

### Creating a year
Click **New Academic Year**, enter label and dates, click **Create**.

### Activating a year
Click **Activate** on an inactive year. If another year is active, close it first.

### Closing a year
Click **Close** on the active year. Then activate the next year.

> 📷 *Screenshot: Academic Years page*

> 📷 *Screenshot: New Academic Year dialog*




---

## 12. Terms


Terms divide an academic year into Term 1, Term 2, Term 3. Only one term can be Active at a time.

> **Note:** Term Number = the order within the year (1st, 2nd, 3rd term). It is NOT a database ID.

### Term statuses: Draft → Pending → Active → Closed

### Creating a term
Click **New Term**, select the year and term number, enter dates, click **Create**.

> 📷 *Screenshot: Terms page*

> 📷 *Screenshot: New Term dialog*




---

## 13. Levels


Levels represent curriculum grades (Crèche, Nursery, KG, Basic 1–6, JHS 1–3).

### Level groups
CRECHE → NURSERY → KG → LOWER_PRIMARY → UPPER_PRIMARY → JHS

### Order index
Controls the display order in lists. 1 = youngest, higher = older.

### Creating a level
Click **New Level**, enter name, GES designation, level group, order index, click **Create**.

> 📷 *Screenshot: Levels page*

> 📷 *Screenshot: New Level dialog*




---

## 14. Classrooms


A classroom is a class group linked to a level and academic year (e.g. "Basic 3A" in 2026/2027).

### Creating a classroom
Click **New Classroom**, select level, academic year, enter section label and display name, click **Create**.

### Assigning a teacher
Click the person-tick icon on a classroom row, select a teacher, click **Assign**.

> 📷 *Screenshot: Classrooms page*

> 📷 *Screenshot: New Classroom dialog*

> 📷 *Screenshot: Assign Teacher dialog*




---

## 15. Staff


Staff records store personal details, role category (Teacher/Admin/Support), employment type, and NTC status.

### NTC Status
Licensed, Induction, Unlicensed, N/A (for non-teaching staff).

### Adding a staff member
Click **New Staff Member**, fill in fields, click **Create**.

### Staff number must be unique
Each staff member must have a unique staff number within the school. If you attempt to create or update a staff member with a staff number already in use, you will see:

> *"A staff member with this staff number already exists in this school"*

Staff number is currently the only field that enforces uniqueness. Phone and email are not uniqueness-checked in Phase 1 — two staff records may share the same phone or email without triggering an error.

> 📷 *Screenshot: Staff page*

> 📷 *Screenshot: New Staff Member dialog*




---

## 16. Students


The student register with search, expandable guardian panel, and status badges.

### Adding a student
Click **New Student**, fill in student number, name, DOB, gender, click **Create**.

> 📷 *Screenshot: Students list*

> 📷 *Screenshot: Expanded guardian panel*

> 📷 *Screenshot: New Student dialog*

> 📷 *Screenshot: Validation errors*

> 📷 *Screenshot: Filled New Student form*


> **Note:** Guardian links are managed on the Student-Guardian Links page, not here.



---

## 17. Guardians


Guardians store parent/carer contact details. One guardian can be linked to multiple students.

### Adding a guardian
Click **New Guardian**, enter name and primary phone, click **Create**.
Then go to **Student-Guardian Links** to link them to a student.

> 📷 *Screenshot: Guardians list*

> 📷 *Screenshot: Expanded linked-students panel*

> 📷 *Screenshot: New Guardian dialog*




---

## 18. Student–Guardian Relationships


Manages links between students and guardians. The relationship label (Mother, Father, Uncle) belongs to the LINK, not the guardian record.

### How to link
1. Find the student.
2. Click **Link Guardian**.
3. Select guardian, enter relationship, tick Primary Guardian if applicable.
4. Click **Link Guardian**.

> 📷 *Screenshot: Student-Guardian Links page*

> 📷 *Screenshot: Link Guardian dialog*


> **Note:** One guardian can have different relationship labels to different students.



---

## 19. Admissions


The Admissions module tracks prospective students moving through the school's intake pipeline: from initial enquiry, through a formal offer, to enrollment in a classroom.

### The admissions pipeline
**Enquiry → Offered → Enrolled** (or Rejected / Withdrawn)

| Stage | Meaning |
|-------|---------|
| Enquiry | Initial record — a family has expressed interest |
| Offered | The school has extended a formal offer of a place |
| Enrolled | The child has accepted and been placed in a classroom |
| Rejected | The enquiry was not successful |
| Withdrawn | The family withdrew their application |

### Creating an enquiry
Click **New Admission**, fill in the applicant's details, click **Create Admission**. The record starts at status **Enquiry**.

### The student field is optional
An admission record does not require an existing student profile. Enquiries can be recorded before the child's full student record has been created. If a student profile already exists, link it via the Student field — this is optional at the enquiry and offered stages.

### Admission number — manually assigned
The **Admission Number** field is not auto-generated in Phase 1. Until you set it via the Edit dialog, it displays as a dash (—). To assign a number, click **Edit** on the admission row and enter the admission number manually.

> *Why does the admission number show as a dash?* It has not been set yet. Use Edit to assign one.

### Making an offer
Click the **Offer** button on an Enquiry-status row. The status changes to **Offered**.

### Enrolling
Click the **Enroll** button on an Offered-status row. Select the classroom, academic year, and curriculum track, then click **Enroll**. A formal enrollment record is created automatically and the admission status updates to **Enrolled**.

### Reversing an offer — not available in Phase 1
Once a record has moved to **Offered** status, it cannot be moved back to Enquiry. There is no "Withdraw Offer" or "Reject" button on the Offered status in Phase 1. This is a planned improvement for a future phase.

> 📷 *Screenshot: Admissions list*

> 📷 *Screenshot: Enquiry filter with Offer button*

> 📷 *Screenshot: Offered filter with Enroll button*

> 📷 *Screenshot: New Admission dialog*

> 📷 *Screenshot: Enroll dialog*




---

## 20. Enrollments


Enrollments formally place a student in a classroom for an academic year.

> **Important:** Enrollments cannot be edited after creation. Withdraw and re-enroll to move a student.

### Creating an enrollment
Click **New Enrollment**, select student/classroom/year/track, click **Enroll**.

### Withdrawing
Click **Withdraw**, enter exit date and reason, click **Withdraw**.

> 📷 *Screenshot: Enrollments list*

> 📷 *Screenshot: New Enrollment dialog*

> 📷 *Screenshot: Withdraw dialog*




---

## 21. Files Metadata


The Files module records **metadata** — structured information *about* a file — without storing, uploading, previewing, or downloading the actual file content. Think of it as a catalogue entry, not the document itself.

> **Phase 1 — metadata only.** You cannot upload, preview, or download any file through this page. Actual file upload and download will be completed in a later phase.

### What Phase 1 stores
Each file record captures:

| Field | Description |
|-------|-------------|
| File name | Original filename (e.g. `admission_letter.pdf`) |
| MIME type | File format identifier (e.g. `application/pdf`, `image/jpeg`) |
| Owner type | Which entity the file belongs to (Student, Staff, etc.) |
| Owner ID | The specific record this file is attached to |
| Size (bytes) | File size in bytes |
| Storage bucket | The storage location identifier |
| Storage key | The path or key within the storage bucket |

### What Phase 2 will add
Actual file content upload, secure download links, in-browser preview for common formats (images, PDF), and bulk file management.

### Archiving file records
Archiving a file record is **permanent in Phase 1** — archived records cannot be restored.

### Creating a file record
Click **New File Record**, fill in owner type, file name, MIME type, size, storage details, click **Create Record**.

> 📷 *Screenshot: Files page*

> 📷 *Screenshot: New File Record dialog*




---

## 22. Audit Logs


Read-only, tamper-proof log of all actions in the system.

> **This page is strictly read-only.** No entries can be added, edited, or deleted.

### Filtering
Type in Module, Action, or Entity Type filter boxes. Clear them to reset.

### Expanding rows
Click ▶ on a row with change data to see Before (red) and After (green) panels.

> 📷 *Screenshot: Audit Logs page*

> 📷 *Screenshot: Filtered by module*

> 📷 *Screenshot: Expanded Before/After diff*




---

## 23. Common Status Badges


| Badge | Colour | Meaning |
|-------|--------|---------|
| Active | Green | Currently in use |
| Inactive | Grey | Not in use |
| Draft | Grey | Newly created, not activated |
| Pending | Amber | Approaching, can be activated |
| Closed | Grey | Has ended |
| Archived | Grey | Removed from active use |
| Enquiry | Amber | First admissions stage |
| Offered | Blue | School has made an offer |
| Enrolled | Green | Student placed in classroom |
| Withdrawn | Grey | Withdrawn from process |
| Rejected | Red | Not successful |
| On Leave | Amber | Staff temporarily away |
| Terminated | Red | Staff employment ended |

> 📷 *Screenshot: Status badges in Admissions list*




---

## 24. Common Buttons and Icons


| Icon | Action |
|------|--------|
| ✏️ Pencil | Edit a record |
| Archive | Remove from active lists (record preserved) |
| Trash | Remove a link (records not deleted) |
| ⭐ Star | Set as primary guardian |
| ▶ Chevron | Expand row for more details |
| Activate | Make Active |
| Close | Make Inactive |
| 🎁 Offer | Advance admission to Offered |
| Enroll | Advance to Enrolled |
| Withdraw | End an enrollment |
| Cancel | Close dialog without saving |
| Save/Create | Save changes |



---

## 25. What to Report as a Bug


Report as a bug:
- Button does nothing
- Blank page with no error
- Saved data doesn't appear in list
- Two active years simultaneously
- Two primary guardians on one student
- Duplicate enrollment created silently
- Audit Logs has any edit/create/delete button
- Files page allows actual upload
- Unreadable theme
- Dialog footer hidden/overlapping content



---

## 26. What Is Not a Bug


These are NOT bugs:
- No Attendance, Fees, Grades, SMS, Parent Portal — all Phase 2
- Files page has no upload button — Phase 2 (Phase 1 is metadata-only)
- Dashboard Phase 2 cards are not active — intentional
- No auto-generated numbers — Phase 2
- Theme only changes on your device — by design, each user controls their own theme
- Enrollments have no Edit button — intentional (withdraw and re-enroll)
- Brief loading spinners — normal
- Admission number shows as a dash (—) — the number has not been set; use Edit to assign one manually
- The student field in New Admission is not required — enquiries can be recorded before a student profile exists
- No "Withdraw Offer" or "Reject" button on an Offered admission — reversal is not available in Phase 1
- No "Unarchive" or "Restore" button on any page — archiving is one-way in Phase 1; this is by design
- Files page shows no file content, preview, or download — Phase 1 stores metadata only



---

## 27. Quick Reference Workflows


## Recommended Setup Order

1. School Profile → 2. School Settings → 3. Document Sequences → 4. Academic Years → 5. Terms → 6. Levels → 7. Classrooms → 8. Staff → 9. Students → 10. Guardians → 11. Student-Guardian Links → 12. Admissions → 13. Enrollments → 14. Files → 15. Audit Logs

## Quick Steps

**Create student:** Students → New Student → fill form → Create

**Link guardian:** Guardians → New Guardian → Create. Then Student-Guardian Links → Link Guardian.

**Process admission:** Admissions → New Admission → Create Admission → Offer → Enroll.

**Withdraw enrollment:** Enrollments → filter Active → Withdraw → enter exit date → Withdraw.



---

## 28. Glossary


**Academic Year** — Full school year (e.g. 2025/2026). Only one active at a time.
**Term** — Subdivision of academic year. Term Number = ordinal position (1st, 2nd, 3rd).
**Level** — Curriculum grade (Basic 1, KG 2, JHS 3).
**Classroom** — Class group linked to level + year (e.g. Basic 3A in 2026/2027).
**Guardian** — Parent/carer. Relationship label belongs to the link, not the guardian.
**Primary Guardian** — Main contact per student. Marked with ★.
**Admission** — Application record. Pipeline: Enquiry → Offered → Enrolled.
**Enrollment** — Formal placement in a classroom. Cannot be edited after creation.
**Curriculum Track** — GES/NACCA or ABEKA.
**Document Sequence** — Controls format of reference numbers (prefix, padding).
**Padding** — Min number of digits: padding 4 → 0001, 0012, 0123.
**Audit Log** — Immutable, read-only history of all system actions.
**Metadata** — File information (name, type, size) without the actual file content.
**NTC** — National Teaching Council — regulates teacher licensing in Ghana.



---

## 29. Appendix


### Phase 1 pages
All 16 routes: /dashboard, /school, /school/settings, /document-sequences, /academic-years, /terms, /levels, /classrooms, /staff, /students, /guardians, /student-guardians, /admissions, /enrollments, /files, /audit-logs

### Phase 2 (not yet available)
Attendance, Grades, Fees, SMS, Parent Portal, File Upload, Dashboard Stats, Auto-numbering

### Recommended testing order
Login → School Profile → Settings → Document Sequences → Academic Years → Terms → Levels → Classrooms → Staff → Students → Guardians → Student-Guardian Links → Admissions → Enrollments → Files → Audit Logs

### Archiving records in Phase 1
Archiving is a **one-way action** in Phase 1. Once a record is archived it cannot be restored, re-activated, or unarchived through the UI. This applies to:

| Module | Archive effect |
|--------|----------------|
| Levels | Level hidden from active lists; existing classroom links preserved |
| Staff | Status set to Terminated; staff removed from teacher-assignment dropdowns |
| Classrooms | Classroom hidden from active lists; enrollment records preserved |
| Students | Student hidden from active lists; linked guardians and enrollments preserved |
| Guardians | Guardian hidden from active lists; existing student links preserved |
| Files | File record hidden from active lists; no physical file is deleted |

Restoring archived records is a planned Phase 2 feature. If a record was archived by mistake in Phase 1, contact the system administrator.

### Known Phase 1 limitations

| Limitation | Detail |
|-----------|--------|
| Admission numbers are manual | Not auto-generated. Set via Edit on each admission record. Displays as "—" until set. |
| Offer reversal unavailable | An Offered admission cannot be moved back to Enquiry in Phase 1. |
| Archive is one-way | No Unarchive or Restore function on any module. |
| Theme is device-level | Saved in the browser; does not sync across devices or affect other staff. |
| Files are metadata-only | No upload, download, or preview. Only file information (name, type, size, storage key) is stored. |
| Phone/email not uniqueness-checked for staff | Two staff records may share a phone or email without an error in Phase 1. Staff number is the only uniqueness constraint. |


