# Phase 1 Frontend Completion Report

**Project:** Brite SMS — School Management System  
**Date:** 2026-06-05  
**Status:** ✅ Ready for stakeholder testing

---

## 1. Executive Summary

Phase 1 of the Brite SMS frontend is complete. All 19 application routes are implemented, API-backed, and verified against the live backend. The application covers the full Phase 1 backend scope: school configuration, academic structure, people management (staff, students, guardians), admissions pipeline, enrollments, file metadata, and audit logging.

A full browser QA pass was completed using Playwright — 23 of 23 checks passed. Two bugs were discovered and fixed during QA. The codebase builds cleanly with zero TypeScript errors and zero lint warnings.

The interface is intentionally minimal and functional. The current design is not final — a UI redesign is planned for a later phase. Stakeholders should evaluate functionality and data flows, not visual polish.

---

## 2. Frontend Scope Completed

All features in scope for Phase 1 are implemented. The following are explicitly **out of scope** for this phase and not built:

- Attendance
- Assessments, grading, and report cards
- Fees, invoices, and payments
- SMS and notification delivery
- Parent portal
- Data backups and restore
- Security incidents and data subject requests
- Binary file upload (files page is metadata-only)
- UI visual redesign

---

## 3. Pages Completed

### School & Configuration (6 pages)

| Route | Page | Key Actions |
|-------|------|-------------|
| `/school` | School Profile | View and edit school name, address, contact, motto, logo URL |
| `/school/settings` | School Settings | View and inline-edit all school-level config keys, grouped by namespace |
| `/document-sequences` | Document Sequences | View and edit prefix, padding, reset policy for 5 sequence types |
| `/academic-years` | Academic Years | List, create, edit, activate, close |
| `/terms` | Terms | List (filterable by year), create, edit, activate, close |
| `/levels` | Levels | List, create, edit, archive, sorted by orderIndex |

### People (5 pages)

| Route | Page | Key Actions |
|-------|------|-------------|
| `/staff` | Staff | List, create, edit, archive; staffNumber, roleCategory, employmentType, ntcStatus |
| `/classrooms` | Classrooms | List, create, edit, archive, assign class teacher; loaded levels and academic years |
| `/students` | Students | List (searchable), create, edit, archive; expandable row shows linked guardians |
| `/guardians` | Guardians | List (searchable), create, edit, archive; expandable row shows linked students |
| `/student-guardians` | Student-Guardian Links | Per-student panel: link guardian, edit relationship, set primary, unlink |

### Admissions & Enrollment (2 pages)

| Route | Page | Key Actions |
|-------|------|-------------|
| `/admissions` | Admissions | List (filterable by status), create, edit, make offer, enroll with classroom/year/track picker |
| `/enrollments` | Enrollments | List (filterable by status), create with dropdowns, withdraw with exit date |

### Records (2 pages)

| Route | Page | Key Actions |
|-------|------|-------------|
| `/files` | Files Metadata | List (filterable by owner type), create metadata record, archive; no binary upload |
| `/audit-logs` | Audit Logs | Read-only list, filter by module/action/entityType, expandable row shows change diff |

---

## 4. Auth and Session Status

| Item | Status |
|------|--------|
| Login with email/password | ✅ Working |
| JWT access token stored in memory (not localStorage) | ✅ |
| HTTP-only refresh token cookie (SameSite=Lax) | ✅ |
| Silent token refresh on 401 via Axios interceptor | ✅ |
| Token rotation — concurrent refresh protection | ✅ Fixed (AuthGate blocks queries until auth settles) |
| Session detection via JS-readable `session_active` cookie | ✅ |
| Unauthenticated redirect to `/login` | ✅ |
| Post-login redirect to `/dashboard` | ✅ |
| Hard navigation (browser refresh) preserves session | ✅ |
| Logout clears tokens and redirects | ✅ |

**Auth race condition resolved:** An `AuthGate` component blocks all API queries from firing until the auth store has settled, preventing the double-refresh token rotation conflict that occurred on hard navigation.

---

## 5. API Integration Status

All 16 backend endpoint groups used in Phase 1 are wired up and verified against the live backend at `http://localhost:3001/api/v1`.

| Endpoint Group | Module | Operations |
|----------------|--------|------------|
| `/auth` | `auth.ts` | login, me, refresh, logout |
| `/school` | `school.ts` | get, update |
| `/school-settings` | `school-settings.ts` | list, get by key, update |
| `/document-sequences` | `document-sequences.ts` | list, get by type, update by type |
| `/academic-years` | `academic-years.ts` | list, create, update, activate, close |
| `/terms` | `terms.ts` | list (with year filter), create, update, activate, close |
| `/levels` | `levels.ts` | list, create, update, archive |
| `/staff` | `staff.ts` | list, get, create, update, archive |
| `/classrooms` | `classrooms.ts` | list, create, update, archive, assign-class-teacher |
| `/students` | `students.ts` | list, get, create, update, archive, get guardians |
| `/guardians` | `guardians.ts` | list, get, create, update, archive, get students |
| `/student-guardians` | `student-guardians.ts` | link, update, unlink, set-primary |
| `/admissions` | `admissions.ts` | list, get, create, update, offer, enroll |
| `/enrollments` | `enrollments.ts` | list, get, create, withdraw |
| `/files` | `files.ts` | list, get, create, archive |
| `/audit-logs` | `audit-logs.ts` | list (read-only) |

**API contract mismatches discovered and corrected during implementation:**

- `applicationDate` on admissions is response-only — rejected by backend in create/update payloads
- Enrollment withdraw takes `exitDate` (not `withdrawnAt`) and `exitReason` (not `withdrawReason`)
- `TermStatus` includes `'draft'` as the initial state — not documented as `'pending'`
- Archive operations use `POST /:id/archive`, not `DELETE`
- `FileOwnerType` includes `'user'` and `'other'` in addition to the documented set
- `AuditLog` has `metadata`, `ipAddress`, `userAgent` fields not previously typed
- Admission `studentId` is optional in the enroll payload — falls back to the student already linked to the admission
- Enrollment PATCH endpoint accepts no meaningful field updates; only withdraw is the valid state change

---

## 6. Shared Frontend Infrastructure

### API Layer
- `src/lib/api/client.ts` — Axios instance with base URL, auth header injection, 401 interceptor with silent refresh and retry
- `src/lib/api/endpoints/` — 16 typed endpoint modules, one per backend resource group
- `src/lib/query-keys.ts` — Centralized TanStack Query cache key registry

### State & Data
- TanStack Query for all server state (fetching, caching, invalidation)
- Zustand for auth store (access token in memory)
- React Hook Form + Zod for all form validation
- `src/hooks/use-api-mutation.ts` — Mutation wrapper: automatic toast on success/error, cache invalidation

### Shared Components

**`src/components/shared/`**
| Component | Purpose |
|-----------|---------|
| `api-error.tsx` | Displays backend error message with retry button |
| `empty-table.tsx` | Empty state for tables with a configurable message |
| `form-dialog.tsx` | Modal dialog wrapper for forms; `FormFooter` supports external `<form>` via `formId` |
| `pagination.tsx` | Prev/Next pagination with page number and total display |
| `status-badge.tsx` | Colour-coded pill badge supporting: active, inactive, pending, closed, archived |
| `table-skeleton.tsx` | Loading skeleton for table bodies |

**`src/components/ui/`**
Button, Input, Label, Select, Textarea, Checkbox, Card, Table, Dialog, Badge, Skeleton, Sonner (toasts), and supporting primitives.

### Layout
- `src/components/layout/sidebar.tsx` — Collapsible nav groups, active-route highlighting
- `src/components/layout/header.tsx` — User email display, logout
- `src/components/layout/auth-gate.tsx` — Blocks render until auth is settled
- `src/components/layout/page-header.tsx` — Consistent title/description/action header per page

### Patterns
- All pages: `page.tsx` (Server Component, exports metadata) + `_view.tsx` (Client Component, all interactivity)
- Loading states: `TableSkeleton` on every list, `Skeleton` on inline panels
- Empty states: `EmptyTable` on every list, inline text on inline panels
- Error states: `ApiError` component on every list page with retry
- Toast feedback: every mutation shows a success or error toast

---

## 7. QA Results

**Method:** Playwright browser automation against the live dev server and live backend.

**Result: 23/23 checks passed. 0 failures.**

| # | Check | Result |
|---|-------|--------|
| 1 | Login page loads with form | ✅ |
| 2 | Login succeeds, redirects to dashboard | ✅ |
| 3 | Sidebar shows all 11 nav items | ✅ |
| 4 | `/school` loads with real school name | ✅ |
| 5 | `/academic-years` shows data with Activate/Close buttons | ✅ |
| 6 | `/terms` shows data including draft-status term with Activate button | ✅ |
| 7 | `/terms` draft badge renders without crash | ✅ |
| 8 | `/staff` list loads with real data | ✅ |
| 9 | Staff create dialog opens and renders form | ✅ |
| 10 | `/students` list loads with real data | ✅ |
| 11 | Students expand-row chevron reveals guardian panel | ✅ |
| 12 | `/guardians` list loads with real data | ✅ |
| 13 | `/admissions` list loads with status filter select | ✅ |
| 14 | `/enrollments` list loads with real data | ✅ |
| 15 | `/files` table loads without error | ✅ |
| 16 | `/audit-logs` loads many rows | ✅ |
| 17 | Audit logs has no create/edit/delete buttons | ✅ |
| 18 | Audit logs read-only notice is visible | ✅ |
| 19 | Audit log expand row shows change diff | ✅ |
| 20 | Hard browser refresh on `/students` preserves data | ✅ |
| 21 | No React key prop warnings | ✅ |
| 22 | No unexpected console errors | ✅ |
| 23 | All 401s are expected auth-refresh cycle, not real failures | ✅ |

**Commands:**

```
npm run lint   → 0 errors, 0 warnings
npm run build  → clean, 19 static routes + proxy middleware
```

---

## 8. Bugs Found and Fixed During QA

### Bug 1 — `TermStatus` missing `'draft'` (runtime crash risk)

**Severity:** High — would crash the Terms page for any newly created term.

**Root cause:** The backend creates new terms with `status: 'draft'` as the initial state. The frontend `TermStatus` type only defined `'pending' | 'active' | 'closed'`. When a `'draft'` term was rendered, `STATUS_VARIANT['draft']` returned `undefined`, causing `StatusBadge` to receive `variant={undefined}` — a runtime crash in production. Additionally, the Activate button only appeared for `status === 'pending'`, so `'draft'` terms would have no available action.

**Fix:**
- Added `'draft'` to `TermStatus` in `src/types/api.ts`
- Mapped `draft` → `'inactive'` variant in `src/app/(dashboard)/terms/_view.tsx`
- Extended Activate button condition to `status === 'draft' || status === 'pending'`

**Files changed:** `src/types/api.ts`, `src/app/(dashboard)/terms/_view.tsx`

---

### Bug 2 — React `key` prop missing on expandable table row fragments

**Severity:** Medium — silent React reconciler degradation; potential stale UI state on list re-renders.

**Root cause:** Both `students/_view.tsx` and `guardians/_view.tsx` used an unkeyed `<>` React Fragment inside `.map()` to wrap two sibling `<TableRow>` elements (the main row and the conditionally-rendered expand row). React requires the outermost element in a mapped list to carry a `key` prop. Without it, React cannot reliably reconcile which expand panel belongs to which student/guardian on list updates.

**Fix:** Changed `<>` to `<Fragment key={id}>` in both files. Removed the now-redundant `key` props from the inner `<TableRow>` elements.

**Files changed:** `src/app/(dashboard)/students/_view.tsx`, `src/app/(dashboard)/guardians/_view.tsx`

---

## 9. Remaining Known Issues

### Minor — Enrollment update (PATCH) not exposed

The backend `PATCH /enrollments/:id` endpoint exists but rejects all semantically meaningful fields (`curriculumTrack`, `enrollmentDate`) with 400 validation errors. Only an empty body `{}` returns 200. Because there is nothing useful a user could update, the enrollment edit form was intentionally omitted. The only post-creation action available on an enrollment is Withdraw.

This should be clarified with the backend team. Either the PATCH endpoint should accept the fields it documents, or it should be removed from the API spec.

### Minor — Audit log `actorType` and `userId` filters

The `/audit-logs` endpoint accepts `module`, `action`, and `entityType` as query filters — all three work correctly. Filters for `actorType` and `userId` were tested and appear to have no effect (the full unfiltered result is returned). The filters are not exposed in the UI, so there is no user-visible bug. The backend team should confirm whether these filters are intentionally omitted from the query layer.

### Cosmetic — `middleware.ts` deprecation warning

Next.js 16 has deprecated the `middleware.ts` filename convention in favour of `proxy.ts`. This generates a build-time warning that does not affect functionality. The file should be renamed in a maintenance pass.

### Not yet built — Binary file upload

The `/files` page stores and displays file metadata records only. Actual file upload (reading binary content and writing to S3/storage) is a Phase 2 feature. The UI makes this explicit.

---

## 10. Current Limitations

| Limitation | Notes |
|------------|-------|
| UI design is not final | The interface uses a minimal functional style. A visual redesign is planned for a future phase. Stakeholders should evaluate workflow and data, not aesthetics. |
| No role-based UI gating | All pages are visible to any authenticated user. The backend enforces permissions; the frontend does not yet hide pages or actions based on the user's role. |
| No inline student number auto-generation | Students and staff must be given a number on creation. The document sequence system is configured but the frontend does not yet call the next-number API to pre-fill the field. |
| No image/file upload | The files page records metadata only. Profile photos and document uploads are Phase 2. |
| No dashboard content | The `/dashboard` route exists but shows a placeholder. Phase 2 will add summary stats and recent activity. |
| Enrollment PATCH not usable | See known issues above. |
| Single-school only | The application is scoped to a single school per deployment. Multi-tenancy is a future concern. |

---

## 11. Recommended Stakeholder Testing Flow

Work through these flows in order. Each builds on the previous and exercises the full system.

### Step 1 — School Setup
1. Log in at `/login` with the admin credentials.
2. Navigate to **School → Profile**. Verify the school name and contact details. Try editing the motto field and saving.
3. Navigate to **School → Settings**. Verify the grouped settings display. Try updating one value and confirming the toast.
4. Navigate to **School → Document Sequences**. Note the prefix and padding for student numbers.

### Step 2 — Academic Structure
5. Navigate to **Academic Structure → Academic Years**. Note the currently active year. Try creating a new one. Confirm the 409 toast appears if you try to activate a second year while one is already active.
6. Navigate to **Academic Structure → Terms**. Filter by a year. Try creating a new term and note it appears with Draft status. Activate it. Confirm only one active term is possible.
7. Navigate to **Academic Structure → Levels**. Verify the level list. Try creating a level.
8. Navigate to **Academic Structure → Classrooms**. Create a classroom assigned to a level and year. Assign a class teacher using the teacher-assignment button.

### Step 3 — People
9. Navigate to **Staff**. Create a new staff member. Edit their NTC status. Archive one.
10. Navigate to **Students**. Create a new student. Expand their row to see the guardians panel (it will be empty at first).
11. Navigate to **Guardians**. Create a guardian. Note their phone number is displayed in the list.
12. Navigate to **Student-Guardian Links**. Find the student you created. Link the guardian you created. Set them as Primary. Confirm the Primary star appears.

### Step 4 — Admissions Pipeline
13. Navigate to **Admissions**. Create a new admission enquiry (enquiry source, optional notes).
14. With the admission in Enquiry status, click **Offer**. The status badge should change to Offered.
15. With the admission in Offered status, click **Enroll**. Select a classroom, academic year, and curriculum track. Confirm the enrollment is created.
16. Navigate to **Enrollments**. Verify the new enrollment appears. Filter by status Active. Try the Withdraw action on an enrollment — provide an exit date.

### Step 5 — Records
17. Navigate to **Files**. Create a metadata record (provide owner type, file name, MIME type, size, bucket, and key). Verify it appears in the list. Archive it.
18. Navigate to **Audit Logs**. Verify the full activity history is visible. Use the module filter (e.g., type `admissions`) to narrow results. Expand a row to see the before/after change detail. Confirm there are no create/edit/delete buttons — the logs are read-only.

### Step 6 — Edge Cases to Verify
- Try logging out and logging back in.
- Try a hard browser refresh (Cmd+Shift+R) on the Students page — it should reload and show data.
- Try submitting a blank create form — validation errors should appear inline below each required field.
- Try archiving a record and confirming the row dims or disappears.

---

## 12. Readiness Verdict

| Criterion | Status |
|-----------|--------|
| All Phase 1 pages implemented | ✅ |
| All pages backed by live API | ✅ |
| Auth flow verified end-to-end | ✅ |
| Build clean (0 TypeScript errors) | ✅ |
| Lint clean (0 warnings) | ✅ |
| Browser QA passed (23/23) | ✅ |
| Bugs found in QA fixed | ✅ |
| Hard browser refresh works | ✅ |
| API error states visible | ✅ |
| Validation errors visible inline | ✅ |
| Toast feedback on all mutations | ✅ |
| 409 conflict errors surface to user | ✅ |
| Audit logs are read-only | ✅ |
| Files page is metadata-only | ✅ |

**Verdict: Phase 1 frontend is functionally complete and ready for stakeholder testing.**

The UI visual design is intentionally minimal. It conveys all data and supports all workflows but does not yet represent the final look and feel of the product. Stakeholders should test functionality and confirm the data flows meet requirements — visual improvements are planned for a subsequent phase and should not block this review.

---

## 13. Next Recommended Steps

These should be taken in sequence, gating each on the previous:

1. **Stakeholder testing** — Walk key users through the recommended testing flow above. Collect feedback on missing fields, missing actions, workflow gaps, and data accuracy. Document issues.

2. **Backend clarifications** — Share the known issues list (enrollment PATCH, audit log filter gaps) with the backend team for resolution or confirmation as intended.

3. **UI redesign** — After stakeholder sign-off on functionality, apply the visual design system. This is a pure styling pass and should not require backend changes.

4. **Attendance module planning** — Can begin in parallel with UI redesign, once stakeholder testing has confirmed the core data model (students, classrooms, enrollments, terms) is correct. Do not start implementation before the model is signed off.

5. **Phase 2 scoping** — Binary file upload, dashboard stats, role-based UI gating, student number auto-generation, and other deferred features can be scoped once Phase 1 is stakeholder-approved.
