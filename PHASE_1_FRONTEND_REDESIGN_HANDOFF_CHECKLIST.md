# Phase 1 Frontend Redesign — Handoff Checklist

**Project:** Brite SMS — School Management System  
**Date:** 2026-06-06  
**Status:** ✅ Redesign complete — ready for stakeholder sign-off

> **The single most important next step is stakeholder testing and sign-off on the redesigned Phase 1 frontend. Do not start Attendance until that sign-off is in hand.**

---

## 1. Documents Included in This Handoff

| File | Purpose |
|------|---------|
| `PHASE_1_FRONTEND_REDESIGN_COMPLETION_REPORT.md` | Full technical record of what was redesigned, QA results, bugs fixed, and readiness verdict |
| `PHASE_1_FRONTEND_REDESIGN_HANDOFF_CHECKLIST.md` | This file — setup, testing, and sign-off checklist |
| `STAKEHOLDER_FRONTEND_TESTING_GUIDE_PHASE_1.md` | End-user testing guide in plain language (no technical knowledge required) |
| `PHASE_1_FRONTEND_COMPLETION_REPORT.md` | Original functional implementation report (API integrations, Phase-1 scope) |
| `PHASE_1_FRONTEND_DESIGN_BRIEF.md` | Design brief that drove the visual redesign |
| `BriteRedesignFiles/BRITE_SMS_THEME_IMPLEMENTATION_HANDOFF.md` | Token-level theme specification and implementation guide |
| `BriteRedesignFiles/Design System.html` | Reference design system HTML (visual source of truth) |
| `BriteRedesignFiles/Design Canvas.html` | Reference page designs (visual source of truth) |
| `BriteRedesignFiles/Admissions Prototype.html` | Reference admissions flow (visual source of truth) |

---

## 2. What Was Redesigned

This was a **visual/styling pass on a working, API-backed application**. No new functionality was added and no existing functionality was removed.

- **Five-theme CSS-variable system** — all colours, typography, and radii are token-driven
- **Sidebar** — 266px fixed, brand tile, non-collapsible group labels, active-item left bar, year/term strip, user footer
- **Topbar/header** — school name + active year/term context, user menu
- **Page headers** — display font (`Source Serif 4` / `Hanken Grotesk` per theme), muted description, right-aligned primary action
- **Login page** — split layout: branded left panel (inherits sidebar theme) + form card
- **Dashboard** — quick-action cards, clearly-labelled Phase-2 preview strip (no fake data)
- **All 16 Phase-1 pages** — restyled tables, status badges, filters, search, pagination
- **All 16 create/edit dialogs** — sticky footer (Cancel + Save), scrollable body, field layout improved
- **Shared components** — `StatusBadge`, `FormDialog`, `EmptyTable`, `TableSkeleton`, `ApiError`, `Pagination`, `NoticeBar`
- **UI primitives** — `Button`, `Input`, `Select`, `Textarea`, `Table`, `Card`, `Badge`, `Sonner` toasts
- **Theme picker** — accessible from **School Settings → Appearance** (top of the settings page)

---

## 3. What Was Not Changed

The following were deliberately left untouched:

- All 16 route paths (`/students`, `/admissions`, etc. are identical)
- All backend API endpoints, payloads, and response shapes
- All Zod validation schemas and React Hook Form wiring
- All TanStack Query keys and cache invalidation logic
- All lifecycle actions: Activate, Close, Offer, Enroll, Withdraw, Archive
- Auth flows: login, silent refresh, session preservation, return-to redirect after expiry
- Icon library: `lucide-react` only — no new icon packages

---

## 4. Theme System Summary

Five themes are defined as `[data-theme="…"]` CSS-variable blocks in `src/app/globals.css`. A `:root` block mirrors the default theme for SSR. All Tailwind colour tokens (`primary`, `accent`, `surface`, `ink`, etc.) resolve to CSS variables.

| ID | Display Name | Sidebar | Notes |
|----|-------------|---------|-------|
| `sand-clay` | Sand & Clay | Light (warm linen `#EEE7DB`) | Warm, editorial, serif titles |
| `greige-sage` | Greige & Sage | Light (white) | Precise, governmental |
| `slate-peach` | Slate & Peach | Light (pale grey `#F4F4F7`) | Calm, modern |
| `deep-navy` | Blue-Black & Off-White | **Dark** (`#101B2A`) | Clean, executive |
| `navy-gold` | Navy, Gold & White | **Dark** (`#14233A`) | Trusted, institutional — **default** |

The two dark-sidebar themes (`deep-navy`, `navy-gold`) define extra sidebar tokens (`--sidebar-border`, `--sidebar-strip-bg`, `--sidebar-strip-border`) for precise light-on-dark legibility.

Fonts loaded per theme family:

| Theme | UI Font | Display Font | Mono Font |
|-------|---------|-------------|-----------|
| sand-clay | Hanken Grotesk | Source Serif 4 | JetBrains Mono |
| greige-sage | IBM Plex Sans | IBM Plex Sans | IBM Plex Mono |
| slate-peach | Hanken Grotesk | Hanken Grotesk | JetBrains Mono |
| deep-navy | IBM Plex Sans | IBM Plex Sans | IBM Plex Mono |
| navy-gold | Hanken Grotesk | Source Serif 4 | JetBrains Mono |

All fonts are loaded via `next/font/google` in `src/app/layout.tsx`.

---

## 5. Default Theme

**`navy-gold`** — Navy, Gold & White.

The dark navy sidebar with gold active accent was chosen as the most appropriate fit for a Ghanaian private basic school: trusted, formal, and institutional.

The HTML element renders with `data-theme="navy-gold"` on the server. The `ThemeProvider` hydrates the user's device preference from `localStorage` in a `useEffect` on mount. This avoids a server/client mismatch at the cost of a brief flash on first load for non-default themes — acceptable for an internal admin tool.

---

## 6. How to Change Themes

**As an end user:**
1. Log in to the application.
2. Navigate to **School → School Settings** in the sidebar.
3. The **Appearance** section is at the top of the page, above the settings table.
4. Click any of the five theme cards. The interface re-skins instantly.
5. The selection is saved locally on the device. No save button is needed.

**As a developer (programmatic):**
```ts
import { useThemeStore } from '@/store/theme.store';
const { setTheme } = useThemeStore();
setTheme('sand-clay'); // or any of the five theme IDs
```

`setTheme` validates the value against the `THEMES` tuple and falls back to `'navy-gold'` if the value is not a recognised ID.

**Relevant files:**
- `src/store/theme.store.ts` — Zustand store, `THEMES`, `DEFAULT_THEME`, `THEME_STORAGE_KEY`
- `src/providers/theme-provider.tsx` — hydrates device preference on mount
- `src/app/layout.tsx` — sets `data-theme="navy-gold"` on `<html>` for SSR
- `src/app/globals.css` — the five `[data-theme="…"]` CSS-variable blocks
- `src/app/(dashboard)/school/settings/_view.tsx` — `ThemePicker` component

---

## 7. How to Test Theme Persistence

1. Open the app in a browser.
2. Go to **School Settings → Appearance** and select **Sand & Clay**.
3. Observe the sidebar turns warm linen and all primary colours shift to terracotta.
4. Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux) for a hard refresh.
5. The page should reload and remain in **Sand & Clay** — not flash to navy-gold.

**To inspect directly:**
```js
// In the browser DevTools console:
localStorage.getItem('brite-theme');          // should equal the selected theme ID
document.documentElement.dataset.theme;       // should match
```

**To reset to default:**
```js
localStorage.removeItem('brite-theme');
location.reload();
```

---

## 8. How to Run the Frontend Locally

### Prerequisites
- Node.js ≥ 18 (tested on v25.x)
- npm ≥ 9
- The Brite SMS backend running at `http://localhost:3001`

### Steps

```bash
# 1. Clone / navigate to the repository
cd sms-web

# 2. Install dependencies
npm install

# 3. Set the required environment variable (see §9)
cp .env.example .env.local
# then edit .env.local

# 4. Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser. You will be redirected to the login page.

Default seed admin credentials (from the backend seed):
- **Email:** `admin@example.com`
- **Password:** `ChangeMe123!`

> These are development seed credentials. Do not use them in production.

---

## 9. Required Environment Variables

| Variable | Example value | Purpose |
|----------|--------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3001/api/v1` | Base URL of the Brite SMS backend API |

Only one environment variable is required. It is safe to check into `.env.example`.

The full `.env.local` file content:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
```

---

## 10. Commands to Run Before Handoff

Run these in order and confirm all pass before handing off:

```bash
# 1. Lint — must show 0 errors and 0 warnings
npm run lint

# 2. Type-check + production build — must complete with no TypeScript errors
npm run build
```

Expected output from `npm run build`:
```
✓ Compiled successfully
✓ Running TypeScript ... finished
✓ Generating static pages (21/21)
```

All 18 routes should appear in the route table. Any TypeScript error or lint warning is a blocker.

---

## 11. Commands to Run After Cloning

```bash
# Install dependencies
npm install

# Confirm the build is clean
npm run lint
npm run build

# Start the development server
npm run dev
```

If `npm run build` fails after a fresh clone, check:
1. The `.env.local` file exists with `NEXT_PUBLIC_API_BASE_URL` set
2. Node.js version is ≥ 18
3. No `node_modules` conflicts — delete and re-run `npm install` if needed

---

## 12. Stakeholder Testing Instructions

Stakeholders should use **`STAKEHOLDER_FRONTEND_TESTING_GUIDE_PHASE_1.md`** as their primary testing reference. It covers every page, every action, and every expected outcome in plain language without requiring technical knowledge.

### Suggested session order

| Step | Area | Why first |
|------|------|-----------|
| 1 | Login | Must work before anything else |
| 2 | Theme selection | Pick your preferred theme before testing pages |
| 3 | School Profile + Settings | Foundation data |
| 4 | Academic Years → Terms → Levels → Classrooms | Academic structure must exist before enrollments |
| 5 | Staff | Can be done at any point |
| 6 | Students + Guardians + Student-Guardian Links | People data |
| 7 | Admissions pipeline (Enquiry → Offer → Enroll) | Requires students and classrooms to exist |
| 8 | Enrollments | Requires students and classrooms |
| 9 | Files | Independent |
| 10 | Audit Logs | Do last — will show full history of your testing session |

### Specific things to check in the redesign

Beyond the standard testing guide, ask stakeholders to confirm:

- [ ] The **default theme** (Navy, Gold & White) is appropriate for the school's brand
- [ ] The **five theme options** in School Settings → Appearance are all legible and professional
- [ ] **Labels are correct** for the Ghanaian school context (Level names, term labels, relationship labels, curriculum tracks: GES/NACCA, ABEKA)
- [ ] **Empty-state messages** make sense (e.g., "No students match your search")
- [ ] **Status badge labels** are readable (Active, Draft, Pending, Enquiry, Offered, Enrolled, Withdrawn, etc.)
- [ ] The **Dashboard** clearly communicates what's available now vs. what's coming in Phase 2
- [ ] The **Audit Logs** immutable notice is prominent enough for compliance purposes
- [ ] The **Files page** notice about metadata-only storage is clear

---

## 13. Visual QA Checklist

For each of the five themes, verify:

- [ ] Sidebar background is correct (light for sand-clay/greige-sage/slate-peach; dark for deep-navy/navy-gold)
- [ ] Sidebar group labels are readable against their background
- [ ] Active sidebar item shows a 3px left bar in the accent colour
- [ ] Topbar/header is visually distinct from the page background
- [ ] Primary buttons (New Student, New Admission, etc.) are styled — not default grey/unstyled
- [ ] Status badges (Active, Draft, Pending, etc.) are coloured and legible
- [ ] Table headers are uppercase muted on the surface-alt background
- [ ] Table row hover state is visible
- [ ] Form dialog has a scrollable body and a **sticky footer** (Cancel + Save always visible)
- [ ] The immutable notice bar on Audit Logs is blue/info-coloured with a lock icon
- [ ] The metadata-only notice bar on Files is blue/info-coloured
- [ ] Login page branded panel matches the current sidebar theme (dark for navy-gold/deep-navy)
- [ ] No black squares, placeholder boxes, or broken icons appear on any page
- [ ] No colour from a different theme appears while the current theme is active
- [ ] Hard refresh does not flash the wrong theme

---

## 14. Functional QA Checklist

Confirm each action still works after the redesign:

### Auth
- [ ] Correct login redirects to /dashboard
- [ ] Wrong password shows an error and stays on /login
- [ ] Logout clears the session and returns to /login
- [ ] Navigating to any protected route while logged out redirects to /login
- [ ] Hard refresh on any page preserves the session

### School
- [ ] Edit School Profile dialog opens, fields are pre-filled, save works
- [ ] Edit School Setting (pencil icon on any row) opens, current value is pre-filled, save works
- [ ] Edit Document Sequence opens, shows current number as read-only, prefix/padding save works

### Academic structure
- [ ] Create Academic Year — appears in list as Inactive
- [ ] Activate Academic Year — status changes to Active; second activation attempt is rejected with a toast
- [ ] Close Academic Year — status changes to Inactive
- [ ] Create Term — appears in list as Draft
- [ ] Activate Term — status changes to Active
- [ ] Close Term — status changes to Closed
- [ ] Create Level — appears in list sorted by order index
- [ ] Create Classroom — appears in list; Assign Teacher dialog opens and saves

### People
- [ ] Create Student — appears in list; expand row shows "No guardians linked"
- [ ] Edit Student — form pre-fills, save works
- [ ] Archive Student — row dims
- [ ] Create Guardian — appears in list
- [ ] Link Guardian to Student (Student-Guardian Links) — guardian appears in student's panel
- [ ] Set Primary Guardian — star icon appears next to the guardian
- [ ] Unlink Guardian — guardian is removed from the student's panel

### Admissions and enrollment
- [ ] Create Admission (Enquiry) — appears in list with Enquiry badge
- [ ] Make Offer on an Enquiry — status changes to Offered
- [ ] Enroll an Offered Admission — status changes to Enrolled; enrollment appears on /enrollments
- [ ] Create Enrollment directly — appears in list as Active
- [ ] Withdraw Enrollment — status changes to Withdrawn; exit date is recorded
- [ ] Duplicate enrollment attempt — shows a clear rejection toast

### Records
- [ ] Create File Metadata Record — appears in list with formatted size (KB/MB)
- [ ] Archive File Record — row dims
- [ ] Filter File Records by owner type — list updates
- [ ] Filter Audit Logs by module — list updates
- [ ] Expand Audit Log row (where changes exist) — shows Before/After panels

### Dialogs
- [ ] All dialogs open and close correctly (Cancel button and × both work)
- [ ] Required fields show validation errors when left blank
- [ ] Long dialogs (Student, File Record) have a scrollable body — the footer stays fixed at bottom
- [ ] Admission Notes field is a multi-line textarea (not a single-line input)

---

## 15. Known Limitations

These are inherited from the Phase-1 functional implementation. None are regressions introduced by the redesign.

| Limitation | Detail |
|------------|--------|
| `middleware.ts` deprecation warning | Build prints a warning about the filename convention. No functional impact. Will be resolved in a maintenance pass. |
| Enrollment cannot be edited after creation | The backend `PATCH /enrollments/:id` endpoint rejects all meaningful field changes. The correct workflow is withdraw + re-enroll. The UI makes this clear. |
| No role-based page visibility | All authenticated users can see all pages. The backend enforces permissions. |
| ~~No auto-generated ID numbers~~ (resolved in Phase 1B) | Admission numbers auto-assign at creation; student and staff numbers auto-generate when left blank. |
| Dashboard has no live statistics | The `/dashboard` page shows quick-action cards and a clearly-labelled Phase-2 preview strip. No fake or placeholder numbers are shown. |
| Files page is metadata-only | No binary upload or download. The page shows a persistent notice bar. |
| Theme not synced to backend | Theme selection is saved to `localStorage` on the user's device only. A school-wide default theme setting is a Phase-2 feature. The Appearance card says so explicitly. |

---

## 16. What Should Not Be Reported as a Bug

Report the following as **known Phase-2 scope**, not bugs:

| What you see | Why it is not a bug |
|--------------|---------------------|
| No Attendance page or register | Attendance is Phase 2 |
| No Grades or report cards page | Assessments are Phase 2 |
| No Fees, invoices, or payments page | Fees and payments are Phase 2 |
| No SMS sending or notification page | Notifications are Phase 2 |
| No parent or student portal | Parent/student access is Phase 2 |
| No button to upload a file or photo | Binary upload is Phase 2 |
| Dashboard shows no statistics or charts | Dashboard content is Phase 2 |
| Numbers appearing that were not typed | Admission numbers always auto-assign; student/staff numbers auto-generate when left blank (Phase 1B) |
| Theme setting does not apply to all users automatically | School-wide theme sync is Phase 2 |
| A brief loading spinner before data appears | Normal — the app is fetching live data |
| A brief flash of the default theme on first load | Normal — SSR default hydrates to device preference on mount |
| An `Unauthorized` flash in the browser DevTools console | Normal — this is the silent session-refresh cycle, not a real error |
| Enrollments cannot be edited after creation | Backend limitation — withdraw and re-enroll is the correct workflow |

---

## 17. Criteria for Signing Off the Redesigned Frontend

The redesigned Phase-1 frontend is ready to sign off when all of the following are true:

### Technical criteria (already met)
- [x] `npm run lint` → 0 errors, 0 warnings
- [x] `npm run build` → clean, all 18 routes build
- [x] All 16 Phase-1 routes load without crash
- [x] All five themes apply and persist after hard refresh
- [x] All create/edit/lifecycle dialogs open and submit correctly
- [x] All dialog footers are sticky (visible without scrolling)
- [x] Audit Logs page has no create/edit/delete controls
- [x] Audit Logs immutable notice is visible
- [x] Files page has metadata-only notice
- [x] No binary upload UI anywhere
- [x] No CRUD flow regressed

### Stakeholder criteria (to be confirmed during review)
- [ ] Default theme (navy-gold) is accepted as appropriate for the school
- [ ] All five theme options look professional and usable
- [ ] All page layouts support the actual daily workflows of school staff
- [ ] Status badge labels, empty-state messages, and field labels are correct for the Ghanaian school context
- [ ] The Dashboard's Phase-2 placeholder strip is clear and not confusing
- [ ] The Audit Logs read-only notice is sufficiently prominent for compliance use
- [ ] No label, status name, or help text needs revision

When all boxes above are ticked, the frontend is signed off. The sign-off date and any conditions should be recorded in the stakeholder sign-off form at the end of `STAKEHOLDER_FRONTEND_TESTING_GUIDE_PHASE_1.md`.

---

## 18. Recommended Next Step After Sign-Off

> **Start the Attendance module only after stakeholder sign-off on the Phase-1 redesign.**

The sign-off confirms that the core data model — students, classrooms, enrollments, terms — is correct and acceptable. Attendance depends on all four of those entities. Building Attendance before they are signed off risks rework if the data model needs adjusting.

### Sequence

1. **Stakeholder sign-off on Phase-1 redesign** ← you are here
2. **Backend clarifications** — share the known issues list (enrollment PATCH behaviour, audit log filter gaps) with the backend team for resolution or confirmation
3. **Attendance module planning** — confirm scope: daily registers by classroom, absence tracking, term-level summaries. Decide on the attendance entry model before writing a line of code.
4. **Attendance implementation** — new routes, new API integrations, new components. The design system is already in place; Attendance pages will inherit the theme system with no extra work.
5. **Phase-2 scoping** — binary file upload, dashboard stats, role-based UI gating, school-wide theme sync, auto-generated ID numbers, fees, grading, parent portal.

---

*For technical background on this redesign, see [PHASE_1_FRONTEND_REDESIGN_COMPLETION_REPORT.md](PHASE_1_FRONTEND_REDESIGN_COMPLETION_REPORT.md).*  
*For end-user testing instructions, see [STAKEHOLDER_FRONTEND_TESTING_GUIDE_PHASE_1.md](STAKEHOLDER_FRONTEND_TESTING_GUIDE_PHASE_1.md).*  
*For the original functional implementation record, see [PHASE_1_FRONTEND_COMPLETION_REPORT.md](PHASE_1_FRONTEND_COMPLETION_REPORT.md).*
