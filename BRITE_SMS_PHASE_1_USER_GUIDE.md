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


Terms divide an academic year. A Ghanaian school year normally runs Term 1, Term 2, Term 3, and the system accepts a term number from 1 to 4. Only one term can be Active at a time.

> **Note:** Term Number = the order within the year (1st, 2nd, 3rd term). It is NOT a database ID.

### Term statuses: Draft → Pending → Active → Closed

### Creating a term
Click **New Term**, select the year and term number, enter the start and end dates, click **Create**. Exam dates and Curriculum Scope are optional — leaving Curriculum Scope on **— Any —** is valid and means the term applies to both curricula.

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

### Archiving and restoring
Archived levels are **hidden from the list by default** — tick **Show
archived** to see them dimmed with a **Restore** button. A classroom cannot be
restored while its level is archived ("Restore the level '…' first.").

> 📷 *Screenshot: Levels with Show archived and Restore*

Archived records permanently **reserve their identifiers** — numbers, names, order indexes, and phone numbers stay taken and cannot be given to a new record. Restore the archived record instead of recreating it.

> 📷 *Screenshot: Levels page*

> 📷 *Screenshot: New Level dialog*




---

## 14. Classrooms


A classroom is a class group linked to a level and academic year (e.g. "Basic 3A" in 2026/2027).

### Creating a classroom
Click **New Classroom**, select level, academic year, enter section label and display name, click **Create**.

### Archiving and restoring
Archived classrooms stay visible, dimmed, with a **Restore** button. If the
classroom's level is archived, restore the level first. Archived records permanently **reserve their identifiers** — numbers, names, order indexes, and phone numbers stay taken and cannot be given to a new record. Restore the archived record instead of recreating it.

### Assigning a teacher
Only **active** staff can be assigned — the picker filters as you type and
offers active teachers only. If a classroom's current teacher has since been
terminated, the assignment **stays on record** (the register of who taught the
class is kept) and the dialog shows them flagged, e.g. "(terminated)"; they
simply cannot receive new assignments.

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
Click **New Staff Member**, fill in fields, click **Create**. The **Staff
Number may be left blank** — the next number (e.g. `STF-0012`) is assigned
automatically. Type one only when migrating an existing record.

### Archiving and restoring
Archiving marks the staff member Terminated. Archived staff show a
**Restore** button, which returns them to **Active**. Archived records permanently **reserve their identifiers** — numbers, names, order indexes, and phone numbers stay taken and cannot be given to a new record. Restore the archived record instead of recreating it.

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
Click **New Student**, fill in name, DOB, and gender, click **Create**. The
**Student Number may be left blank** — the next number (e.g. `STU-0020`) is
assigned automatically from the school's sequence. Type a number only when
migrating an existing record.

### Archiving and restoring
Archiving keeps the record but marks the student Withdrawn. Archived students
show a **Restore** button, which returns them to **Active** — with no
enrollment, so re-enroll them if they are returning to a class. Archived records permanently **reserve their identifiers** — numbers, names, order indexes, and phone numbers stay taken and cannot be given to a new record. Restore the archived record instead of recreating it.

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

### Archiving and restoring
Archived guardians are **hidden from the list by default** — tick **Show
archived** to see them with a **Restore** button. Archiving does not remove
the guardian's links to students.

> 📷 *Screenshot: Archived guardian with Restore button*

Archived records permanently **reserve their identifiers** — numbers, names, order indexes, and phone numbers stay taken and cannot be given to a new record. Restore the archived record instead of recreating it.

> **Primary slot and archived guardians.** If an archived guardian still holds
> a student's *primary* slot, promoting another guardian with **Set Primary**
> silently takes the slot over from the archived link. Between two active
> guardians nothing changes: the existing primary must be handled explicitly
> first.

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
**Enquiry → Application → Offered → Enrolled**, or ending as **Rejected** or **Withdrawn** at any pre-enrolled stage.

| Stage | Meaning |
|-------|---------|
| Enquiry | Initial record — a family has expressed interest |
| Application | The paperwork stage has been formally opened (click **Apply** on an enquiry). An offer may also be made straight from Enquiry |
| Offered | The school has extended a formal offer of a place |
| Enrolled | The child has accepted and been placed in a classroom |
| Rejected | The **school** declined the application. Final |
| Withdrawn | The **family** declined or walked away. Final |

Rejected and Withdrawn are terminal: a returning family gets a new admission
record (reference the old one in its notes).

### Creating an enquiry
Click **New Admission**, fill in the applicant's details, click **Create Admission**. The record starts at status **Enquiry**.

### The student field is optional
An admission record does not require an existing student profile. Enquiries can be recorded before the child's full student record has been created. If a student profile already exists, link it via the Student field — this is optional at the enquiry and offered stages.

### Admission number — assigned automatically
Every admission receives the next number (e.g. `ADM-0008`) from the school's
document sequence **at the moment it is created** — there is nothing to fill
in. The number stays editable via **Edit** for reconciling against paper
records; a number already in use is refused with a message naming it. Numbers
are unique per school.

### Making an offer
Click **Offer** on an Enquiry- or Application-status row. The status changes
to **Offered**, and the system records which staff member approved it and
when.

### Enrolling
Click the **Enroll** button on an Offered-status row. Select the classroom, academic year, and curriculum track, then click **Enroll**. A formal enrollment record is created automatically and the admission status updates to **Enrolled**.

> **Curriculum Interest vs Curriculum Track.** An admission may record an interest of GES/NACCA, Abeka, or **BOTH**. An enrollment places the child on a single curriculum, so the Curriculum Track choices here are GES/NACCA and Abeka only — BOTH is not available. If a family's interest was BOTH, pick the curriculum the child will actually be taught on.

### Rejecting and withdrawing
On any Enquiry, Application, or Offered row: the **✕** button **rejects** the
admission (school declines) and the **⇥** button **withdraws** it (family
declines). Both are final.

### Reversing an offer
Click the **↩ Revert offer** button on an Offered row. The admission returns
to **Application** and the offer timestamps and approver are cleared. The
linked student, admission number, and notes are kept.

### Reversing an enrollment
An Enrolled admission shows a **Revert** button, for correcting mistaken
enrollments only. It works **only after the enrollment itself has been
withdrawn** on the Enrollments page:

- While the enrollment is still active you get: *"Withdraw the enrollment
  first."*
- If the enrollment ended as completed, graduated, or transferred, reversal is
  refused permanently: *"Cannot revert: the student's enrollment is
  \<status\>, which records a real outcome. Reversal is only available after
  an enrollment is withdrawn."*

On success the admission returns to **Offered**, its enrolled timestamp is
cleared, and the linked student is kept.

> 📷 *Screenshot: Admission row actions by status*

> 📷 *Screenshot: Admissions list*

> 📷 *Screenshot: Enquiry filter with Offer button*

> 📷 *Screenshot: Offered filter with Enroll button*

> 📷 *Screenshot: New Admission dialog*

> 📷 *Screenshot: Enroll dialog*




---

## 20. Enrollments


Enrollments formally place a student in a classroom for an academic year.

> **Important:** Enrollments cannot be edited after creation. Withdraw and re-enroll to move a student.

> **One active enrollment per student per academic year.** This applies regardless of curriculum track. Attempting a second one is rejected with *"Student already has an active enrollment for this academic year. Withdraw it before creating another one."* Withdraw the existing enrollment first.

> **Ended academic years are closed to enrollment.** Creating an enrollment in a year whose end date has passed is refused with *"Cannot enroll into \<year\>: the academic year ended on \<date\>."* Enrolling into the active year or a **future** year (pre-enrollment for the coming year) is allowed.

> **Restored students come back as Active with no enrollment**, so they reappear in the New Enrollment student list — enroll them again if they are returning to a class.

### Creating an enrollment
Click **New Enrollment**, select student/classroom/year/track, click **Enroll**. The Enrollment Date defaults to today and can be changed. Only students with an **Active** status appear in the Student list. Curriculum Track is GES/NACCA or Abeka — an enrollment sits on one curriculum, so BOTH is not offered.

The **Student picker filters as you type** — part of a name or a student
number both work, and the search covers the whole register, not just the
first page. The **Classroom list shows only classrooms belonging to the
selected academic year**; a mismatched pair is refused by the server with a
message naming the classroom's actual year.

### Withdrawing
Click **Withdraw**, enter the exit date, optionally enter a reason, click **Withdraw**. The exit date is required; the exit reason is optional and may be left blank.

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
Archiving a file record is **permanent** — unlike levels, classrooms, staff,
students, and guardians, file records have no Restore. An archived file record
disappears from the list for good.

### Creating a file record
Click **New File Record**, fill in owner type, file name, MIME type, size, storage details, click **Create Record**.

> **All Phase 1 file records are private.** There is no setting for this — the server stores every record as private, which is why the **Public** column always reads *No*. Public/shareable links are a later-phase feature.

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
- Sequential numbers you didn't type — admission, student, and staff numbers auto-generate when left blank
- Theme only changes on your device — by design, each user controls their own theme
- Enrollments have no Edit button — intentional (withdraw and re-enroll)
- Brief loading spinners — normal
- An admission number you didn't choose — numbers are auto-assigned at creation and remain editable
- The student field in New Admission is not required — enquiries can be recorded before a student profile exists
- "Withdraw the enrollment first." when reverting an enrolled admission — the enrollment must be withdrawn on the Enrollments page before the admission can be reverted
- No Restore button on the Files page — file archiving is deliberately permanent; every other module can restore
- Archived levels or guardians "missing" from their lists — they are hidden until you tick Show archived
- A new record refused because the number/name/phone "already exists" when no visible record has it — an archived record is reserving the identifier; restore it instead of recreating
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
Attendance, Grades, Fees, SMS, Parent Portal, File Upload, Dashboard Stats

### Recommended testing order
Login → School Profile → Settings → Document Sequences → Academic Years → Terms → Levels → Classrooms → Staff → Students → Guardians → Student-Guardian Links → Admissions → Enrollments → Files → Audit Logs

### Archiving and restoring records
Every module except Files can archive **and restore**. Archived records keep
their identifiers reserved (numbers, names, order indexes, phone numbers), so
restore beats recreating.

| Module | Archive effect | Restore |
|--------|----------------|---------|
| Levels | Hidden from the list until **Show archived** is ticked | Restore button → active again |
| Staff | Status set to Terminated; row stays visible, dimmed | Restore → Active |
| Classrooms | Row stays visible, dimmed | Restore → active (restore its level first if that is archived) |
| Students | Marked Withdrawn + archived; row stays visible, dimmed | Restore → Active, with **no enrollment** — re-enroll if returning |
| Guardians | Hidden until **Show archived** is ticked; student links kept | Restore button → back in the list |
| Files | Hidden from the list — **permanently**; no physical file is deleted | **None — file archiving is final** |

### Known Phase 1 limitations

| Limitation | Detail |
|-----------|--------|
| Terminal admission states are final | Rejected and Withdrawn admissions cannot be reopened — a returning family gets a new admission record. |
| File archiving is final | Files is the one module without Restore. |
| Identifier reservation | Archived records keep their numbers, names, order indexes, and phone numbers reserved permanently. |
| Theme is device-level | Saved in the browser; does not sync across devices or affect other staff. |
| Files are metadata-only | No upload, download, or preview. Only file information (name, type, size, storage key) is stored. |
| Staff phone not uniqueness-checked | Staff **email** is unique per school (case-insensitive); phone is not checked. |


