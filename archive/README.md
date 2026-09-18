# Archive

Superseded documents kept for the record. Nothing in this directory should be
handed to stakeholders.

## BRITE_SMS_TUTORIAL_2026-06-06_SUPERSEDED.pdf

A 19-page tutorial exported on 6 June 2026. Superseded by
**`BRITE_SMS_PHASE_1_USER_GUIDE.pdf`** (repo root), which covers the same
ground with current screenshots and a repeatable build pipeline
(`qa/capture-guide-screenshots.mjs` → `qa/build-user-guide-pdf.mjs`).

Why it was retired rather than regenerated:

- **Not regenerable** — no source file (markdown or otherwise) survives in
  either repository; the PDF is a one-off export.
- **Stale imagery** — its 60 embedded screenshots predate the August 2026 bug
  fixes: they show the old Smoke/QA test data, flows that were broken at the
  time (the empty enrollment student dropdown, Enroll rejections), and a
  "Publicly accessible" checkbox that no longer exists.
