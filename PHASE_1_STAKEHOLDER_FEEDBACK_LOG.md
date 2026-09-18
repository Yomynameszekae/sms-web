# Brite SMS Phase 1 — Stakeholder Feedback Log

**Version:** Phase 1 Post-Redesign Review
**Date:** 7 June 2026
**Status:** Closed — all items resolved, documented, or deferred with rationale

---

> This log records stakeholder feedback received after the Phase 1 frontend redesign. Each item has been triaged, resolved or deferred, and the outcome documented here for the project record.

---

## Feedback Items

---

### FB-01 — Staff duplicate error message was unclear

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Staff
**Status:** Improved + future-proofed

**Original feedback:**
The error shown when a duplicate staff record was attempted always referenced "staff number" even if the duplicate might have been caused by phone or email.

**Investigation:**
Inspected the Prisma schema (`sms-pre/prisma/schema.prisma`). The Staff model has exactly **one** unique constraint: `@@unique([schoolId, staffNumber])`. Phone and email are indexed but **not** unique — so a P2002 unique constraint error can only be triggered by a duplicate staff number in Phase 1. The original error message referencing "staff number" was actually always correct.

**Resolution:**
The backend error handler (`staff.service.ts`) was updated to inspect the `err.meta.target` field and return a field-specific message:
- Staff number conflict → *"A staff member with this staff number already exists in this school"*
- Phone conflict (future) → *"A staff member with this phone number already exists in this school"*
- Email conflict (future) → *"A staff member with this email address already exists in this school"*
- Unknown conflict → *"A staff member with these details already exists in this school"*

The UI now shows the precise conflicting field. Eight unit tests were added to `staff.service.spec.ts` to verify all branches.

**User guide updated:** Section 15 — staff number uniqueness and error message explanation added.

---

### FB-02 — Admissions page was unclear about its purpose and workflow

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Admissions
**Status:** UI improved + documented

**Original feedback:**
Users were unsure what the Admissions page was for, how it related to students, and what the full intake pipeline looked like.

**Resolution:**
A `NoticeBar` was added to the Admissions page explaining:
- The pipeline: enquiry → application → offered → enrolled
- That linking a student profile is optional at the enquiry stage
- That enrolment places the child into a classroom and academic year
- That admission numbers are not auto-generated in Phase 1

**User guide updated:** Section 19 — complete rewrite with pipeline table, stage descriptions, optional student explanation, admission number manual assignment, and offer reversal status.

---

### FB-03 — Admission number shows as a dash

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Admissions
**Status:** Documented — by design in Phase 1

**Original feedback:**
The admission number column showed "—" for newly created records, which looked like a system error.

**Investigation:**
Inspected `admissions.service.ts`. The `admissionNumber` field is never set during creation. It can only be set via the `update` endpoint (Edit dialog). The dash is the empty-state display for an unset field — this is correct behaviour.

**Resolution:**
No code change needed. The NoticeBar on the Admissions page (FB-02) now explains that admission numbers are manually assigned via Edit. The page header description was also updated.

**User guide updated:** Section 19 — admission number callout added. Section 26 — new "not a bug" entry added.

---

### FB-04 — Student field in New Admission not required — unclear why

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Admissions
**Status:** Documented — by design

**Original feedback:**
It was not obvious why the student field in the New Admission dialog is optional. Users expected it to be required.

**Investigation:**
The design intention is that an enquiry can be recorded before the child's full student profile has been created. The student link is completed when the admission progresses to enrollment.

**Resolution:**
No code change needed. The NoticeBar (FB-02) and updated Section 19 of the user guide now explain this explicitly.

**User guide updated:** Section 19. Section 26 — new "not a bug" entry added.

---

### FB-05 — Can an offer be reversed / withdrawn?

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Admissions
**Status:** Deferred — not available in Phase 1

**Original feedback:**
Users asked whether an offer that had been made could be reversed (e.g. if a family declines).

**Investigation:**
Inspected `admissions.controller.ts`. There is no `withdraw`, `reject`, or status-reversal endpoint for the Offered state. Once a record moves to Offered, it cannot be moved back to Enquiry through the UI.

**Resolution:**
No code change. Flagged as a future improvement. The admissions NoticeBar and user guide Section 19 explicitly state that offer reversal is not available in Phase 1. Section 26 lists this as a "not a bug" item.

**Phase 2 action:** Add a "Withdraw Offer" action that sets status back to Enquiry or to a new Declined state.

---

### FB-06 — Files page — unclear what Phase 1 stores vs Phase 2

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Files
**Status:** UI improved + documented

**Original feedback:**
Users were unsure what the Files page did in Phase 1 and whether actual documents could be stored.

**Resolution:**
The `NoticeBar` on the Files page was expanded to state explicitly:
- Phase 1 stores metadata only (name, MIME type, owner, size, storage bucket, storage key)
- No upload, preview, or download is possible in Phase 1
- Archiving a file record is permanent in Phase 1

**User guide updated:** Section 21 — detailed table of stored fields, Phase 2 additions listed, archiving note added.

---

### FB-07 — Can archived records be restored / unarchived?

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Levels, Staff, Classrooms, Students, Guardians, Files
**Status:** Documented — one-way in Phase 1

**Original feedback:**
Users asked whether archiving was reversible and whether they could restore records if archived by mistake.

**Investigation:**
Searched all backend service files. No `unarchive`, `restore`, or `reactivate` method exists on any module in Phase 1.

**Resolution:**
No code change. Page header descriptions on all six archive-capable modules were updated to state "Archiving is permanent in Phase 1." Section 26 of the user guide lists the missing Unarchive button as a known intentional omission.

**User guide updated:** Appendix Section 29 — new "Archiving Records in Phase 1" table covering all six modules. Known Limitations table added.

**Phase 2 action:** Add Unarchive / Restore functionality across all modules.

---

### FB-08 — Theme flashes on page refresh

**Raised by:** Stakeholder review
**Date raised:** 6 June 2026
**Module:** Theme / Appearance (frontend)
**Status:** Fixed

**Original feedback:**
When refreshing the page, the default Navy theme briefly appeared before the saved theme was applied, causing a visible flash.

**Root cause:**
The saved theme was read from `localStorage` inside a React hook (after hydration). By the time the hook ran, the page had already painted with the server-rendered default (`data-theme="navy-gold"`).

**Fix applied:**
An inline synchronous `<script>` was added to `<head>` in `src/app/layout.tsx`. It runs before the browser paints and sets `document.documentElement.dataset.theme` from localStorage. `suppressHydrationWarning` was added to the `<html>` element to prevent React from complaining about the attribute mismatch between server and client.

**Files changed:**
- `sms-web/src/app/layout.tsx` — inline theme init script + `suppressHydrationWarning`

**User guide updated:** Section 6 — "How theme persistence works" subsection added explaining immediate theme restoration and the `navy-gold` fallback.

---

### FB-09 — Dev server showed repeated FATAL panics (Turbopack)

**Raised by:** Internal / development team observation
**Date raised:** 6 June 2026
**Module:** Development tooling (not production)
**Status:** Worked around

**Original feedback:**
The `npm run dev` output showed periodic `FATAL` error messages from Turbopack's internal HMR worker, specifically:
```
Failed to write app endpoint /(auth)/login/page
get_next_server_import_map — Next.js package not found
```
The app continued to serve pages correctly, but the console was noisy and the HMR worker restarted repeatedly.

**Root cause:**
Turbopack's Rust-layer HMR worker failed to resolve the `next` package through its internal module resolution on macOS arm64. This is a known intermittent Turbopack issue at Next.js 16.2.7. It does not affect production builds.

**Fix applied:**
The `dev` script in `sms-web/package.json` was changed from `next dev` to `next dev --webpack`. This uses the Webpack bundler for local development, which does not exhibit the panic. Production builds (`next build`) are unaffected — they do not use Turbopack.

**Files changed:**
- `sms-web/package.json` — `"dev": "next dev --webpack"`

---

### FB-10 — Middleware deprecation warning in dev console

**Raised by:** Internal / development team observation
**Date raised:** 6 June 2026
**Module:** Development tooling / routing
**Status:** Fixed

**Original feedback:**
The dev server printed:
```
⚠ Your project has a file named middleware.ts, this name is deprecated. Please rename it to proxy.ts.
```

**Root cause:**
Next.js 16 renamed the special route-guard file from `middleware.ts` to `proxy.ts` and the exported function from `middleware` to `proxy`.

**Fix applied:**
- `sms-web/src/middleware.ts` — deleted
- `sms-web/src/proxy.ts` — created with identical logic; export renamed from `middleware` to `proxy`
- Auth guard behaviour is unchanged

**Files changed:**
- `sms-web/src/middleware.ts` (deleted)
- `sms-web/src/proxy.ts` (created)

---

## Summary

| # | Item | Module | Resolution |
|---|------|--------|------------|
| FB-01 | Staff duplicate error message | Staff | Fixed — field-specific messages; 8 unit tests added |
| FB-02 | Admissions page clarity | Admissions | UI improved — NoticeBar; guide rewritten |
| FB-03 | Admission number shows as dash | Admissions | Documented — manual assignment by design |
| FB-04 | Student field optional | Admissions | Documented — enquiries before student profile exist |
| FB-05 | Offer reversal | Admissions | Deferred — no backend endpoint; Phase 2 item |
| FB-06 | Files Phase 1 vs Phase 2 | Files | UI improved — detailed NoticeBar; guide expanded |
| FB-07 | Archive / unarchive | All modules | Documented — one-way in Phase 1; Phase 2 item |
| FB-08 | Theme flash on refresh | Theme | Fixed — inline script + suppressHydrationWarning |
| FB-09 | Turbopack FATAL panics | Dev tooling | Worked around — `next dev --webpack` |
| FB-10 | Middleware deprecation warning | Dev tooling | Fixed — renamed to proxy.ts |

**App source files changed:** `src/app/layout.tsx`, `src/proxy.ts` (+ deleted `src/middleware.ts`), `src/app/(dashboard)/admissions/_view.tsx`, `src/app/(dashboard)/files/_view.tsx`, `src/app/(dashboard)/staff/_view.tsx`, `src/app/(dashboard)/levels/_view.tsx`, `src/app/(dashboard)/students/_view.tsx`, `src/app/(dashboard)/guardians/_view.tsx`, `src/app/(dashboard)/classrooms/_view.tsx`

**Backend files changed:** `sms-pre/src/staff/staff.service.ts`, `sms-pre/src/staff/staff.service.spec.ts` (new)

**Documentation files changed:** `sms-web/BRITE_SMS_PHASE_1_USER_GUIDE.md`, `sms-web/BRITE_SMS_PHASE_1_USER_GUIDE.pdf`, `sms-web/PHASE_1_STAKEHOLDER_FEEDBACK_LOG.md` (new)

---

## Phase 1B resolutions (2026-08-14)

The entries above are the historical record and are unchanged. Three deferred
items have since shipped:

| Item | Then | Now |
|------|------|-----|
| FB-03 — admission number dash | Documented as manual-via-Edit | **Resolved**: numbers auto-assign at creation (`ADM-…`), remain editable, unique per school. The dash is gone. |
| FB-05 — offer reversal | Deferred, "not available in Phase 1" | **Resolved**: Offered → Application via Revert Offer; Enrolled → Offered via Revert once the enrollment is withdrawn; Reject and Withdraw are explicit terminal actions. (The earlier "not available" wording was also inaccurate at the time — `PATCH` accepted arbitrary status values with no validation; that bypass is now closed.) |
| FB-07 — archive/unarchive | Documented as one-way | **Resolved** for levels, classrooms, staff, students, guardians (Restore, plus Show-archived toggles on levels/guardians). Files remain deliberately one-way. |
