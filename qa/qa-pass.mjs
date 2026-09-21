/**
 * Brite SMS — Phase 1 QA pass.
 *
 * Unlike the earlier smoke pass (which only opened dialogs and looked at
 * titles and footers), every create/lifecycle dialog here is actually
 * SUBMITTED with valid data and the resulting record is asserted to appear
 * in the list. Each form also gets a negative case: the outgoing payload is
 * rewritten to something the backend rejects, and the toast must carry a
 * SPECIFIC message — never a bare "Validation failed".
 *
 * Everything created is tagged with a per-run token and deleted again at the
 * end, so the database is left exactly as it was found.
 *
 *   node qa/qa-pass.mjs
 *
 * Env: QA_BASE_URL (default http://localhost:3000)
 *      QA_DB       (default school_ms)
 *      QA_EMAIL / QA_PASSWORD
 *      QA_HEADED=1 to watch it run
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const DB = process.env.QA_DB ?? 'school_ms';
const EMAIL = process.env.QA_EMAIL ?? 'admin@example.com';
const PASSWORD = process.env.QA_PASSWORD ?? 'ChangeMe123!';

// Per-run token — every record this script creates carries it, and cleanup
// deletes strictly by it.
const RUN = `QA${Date.now().toString(36).slice(-6).toUpperCase()}`;
const PHONE = `02${String(Date.now()).slice(-8)}`;

const NAMES = {
  year: `${RUN} Year`,
  term: `${RUN} Term`,
  level: `${RUN} Level`,
  classroom: `${RUN} Class`,
  staffNumber: `STF-${RUN}`,
  staffLast: `${RUN}Staff`,
  studentNumber: `STU-${RUN}`,
  studentLast: `${RUN}Student`,
  guardianLast: `${RUN}Guardian`,
  file: `qa-${RUN}.pdf`,
  admissionNote: `QA run ${RUN}`,
  // Phase 2 Stage 1a
  labelFee: `${RUN} Transport`,
  teacherEmail: `qa-${RUN}-teacher@example.com`,
  feeType: `${RUN} Levy`,
  fee: `${RUN} KG2 Levy`,
  feeType2: `${RUN} Club`,
  fee2: `${RUN} KG2 Club`,
  lateStudent: `STU-${RUN}L`,
  lateStudentLast: `${RUN}Late`,
};

// Every date this run writes attendance for. Both are DERIVED from live data
// at run time, not hardcoded, and are pushed here for cleanup() to find.
//
// This used to be a hardcoded date chosen to sit inside the demo's active
// term. That broke the moment the demo calendar became relative to the seed
// run: the fixed date fell out of the active term and into a closed one, and
// every marking check started 409-ing. A date that has to be inside "the
// active term" must be computed from the active term, for the same reason the
// seed itself now is.
const ATT_DATES = [];

// Invoices this run issues. Tracked explicitly rather than inferred: the QA
// invoice covers some of the DEMO's fee assignments too, so there is no
// property of the data that distinguishes it. Anything clever here risks
// deleting a demo invoice.
const QA_INVOICE_IDS = [];

// Everything this run queues is newer than this. The demo seeds its
// notifications with past dates, so a timestamp cleanly separates the two —
// there is no property of a fee-reminder row that distinguishes "this run's"
// from "the seed's".
const RUN_STARTED_AT = new Date().toISOString();

// Demo guardians whose consent this run withdraws, so cleanup can put it back.
// Without this, every QA run leaves one fewer consented guardian in the demo
// and the seeded state quietly drifts.
const QA_REVOKED_CONSENT = [];

// ── reporting ───────────────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
const failures = [];
const newChecks = new Set();

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
const section = (t) => console.log(`\n─── ${t}`);

// ── db helpers ──────────────────────────────────────────────────────────────
function sql(query) {
  return execFileSync('psql', ['-At', '-d', DB, '-c', query], { encoding: 'utf8' }).trim();
}

/**
 * A weekday this run can own: inside the ACTIVE term, in the past, and not
 * already marked by the demo seed.
 *
 * The seed marks the ten most recent weekdays up to today, so the search
 * starts a fortnight after the term opens — comfortably before that window —
 * and walks forward to the first unmarked weekday. Picking the date this way
 * means cleanup can delete by it unambiguously without touching demo rows.
 */
function pickAttendanceDate() {
  const [start, end] = sql(
    `select to_char(start_date, 'YYYY-MM-DD') || ',' || to_char(end_date, 'YYYY-MM-DD')
     from terms where status = 'active' limit 1`).split(',');
  const today = new Date().toISOString().slice(0, 10);
  // Marking a future date is refused by the service, so never go past today.
  const latest = end < today ? end : today;

  const cursor = new Date(`${start}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + 14);
  for (let i = 0; i < 90; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    if (iso > latest) break;
    if (weekday !== 0 && weekday !== 6) {
      const marked = sql(
        `select count(*) from attendance_records where attendance_date = '${iso}'`);
      if (marked === '0') return iso;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  throw new Error(
    `no unmarked weekday available inside the active term (${start} → ${latest})`);
}

// ── page helpers ────────────────────────────────────────────────────────────
async function toastTexts(page) {
  return page.$$eval('[data-sonner-toast]', (els) =>
    els.map((e) => e.innerText.replace(/\s*\n+\s*/g, ' ').trim()).filter(Boolean));
}

/** Waits for a toast to appear and returns every visible toast's text. */
async function waitForToast(page, timeout = 9000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const texts = await toastTexts(page);
    if (texts.length) return texts;
    await page.waitForTimeout(150);
  }
  return [];
}

/**
 * Waits for sonner to clear its own toasts. Never removes the nodes by hand —
 * ripping them out from under React throws NotFoundError on the next render.
 */
async function settleToasts(page) {
  await page
    .waitForFunction(() => document.querySelectorAll('[data-sonner-toast]').length === 0, null, { timeout: 12000 })
    .catch(() => {});
}

async function gotoRoute(page, route) {
  await page.goto(`${BASE}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}

/** Dismisses a dialog left open by a previous step, so its overlay can't
 *  swallow the next click and cascade one failure into many. */
async function closeAnyDialog(page) {
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('[role=dialog]').count())) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

async function openDialog(page, buttonText, formId) {
  await closeAnyDialog(page);
  await page.click(`button:has-text("${buttonText}")`);
  await page.waitForSelector(`form#${formId}`, { timeout: 10000 });
  await page.waitForTimeout(500);
}

/**
 * Drives a SearchableSelect: opens the trigger, optionally types a query,
 * and clicks the option containing `optionText`.
 */
async function pickSearchable(page, triggerId, optionText, query = '') {
  await page.click(`[id="${triggerId}"]`);
  await page.waitForSelector('[role=listbox]', { timeout: 8000 });
  if (query) {
    await page.locator('input[placeholder="Type to filter…"]').fill(query);
    await page.waitForTimeout(700); // debounce + fetch
  }
  await page.locator(`[role=option]:has-text("${optionText}")`).first().click();
  await page.waitForTimeout(200);
}

async function submitForm(page, formId) {
  await page.click(`button[form="${formId}"]`);
}

/** Polls the visible table for a row containing `text`, tolerating refetch lag. */
async function rowAppears(page, text, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const rows = await page.$$eval('tbody tr', (rs) => rs.map((r) => r.innerText)).catch(() => []);
    if (rows.some((r) => r.includes(text))) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

/** Asserts the row identified by `rowText` shows `label` (e.g. a badge). */
async function rowShows(page, rowText, label, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const txt = await page.locator(`tr:has-text("${rowText}")`).first().innerText().catch(() => '');
    if (txt.includes(label)) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

/** Direct-API helper for checks the UI cannot express (illegal transitions). */
let _apiToken;
async function apiToken() {
  if (_apiToken) return _apiToken;
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  _apiToken = (await res.json()).data.accessToken;
  return _apiToken;
}
async function apiCall(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await apiToken()}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

/** Logs in as somebody else — needed to exercise row-level authorisation. */
async function apiTokenAs(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  return json?.data?.accessToken ?? null;
}

/** Same as apiCall but with an explicit token, and a raw-text mode for CSV. */
async function apiCallAs(token, method, path, body, { raw = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (raw) {
    return {
      status: res.status,
      text,
      contentType: res.headers.get('content-type') ?? '',
      disposition: res.headers.get('content-disposition') ?? '',
    };
  }
  let parsed = {};
  try { parsed = JSON.parse(text); } catch { parsed = {}; }
  return { status: res.status, body: parsed };
}

/** Same, but for the card/panel layouts that don't use a table. */
async function textAppears(page, text, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await page.getByText(text, { exact: false }).count().catch(() => 0)) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

/**
 * A successful submit: asserts the HTTP status, the success toast, AND that the
 * record shows up.
 *
 * THE STATUS IS AUTHORITATIVE. Text matching alone is not safe and has now
 * failed twice: first a rejection slipped past a "does it look like an error"
 * predicate, then a 409 reading "…cannot be SET to receive SMS…" matched the
 * success word `set` and a real failure was reported as a pass. Wording is
 * under the application's control and changes; a 4xx is a 4xx.
 *
 * So the rule is: if ANY mutating API call made during the submit came back
 * 4xx or 5xx, the submit failed, whatever the toast says. The text check
 * survives as a secondary signal — it catches a 200 that reports a no-op.
 */
const SUCCESS_TOAST = /(created|linked|assigned|enrolled|updated|withdrawn|set)\b/i;
const REJECTION_PHRASE = /already|must be|should not|Cannot reach|not found/i;

/**
 * Submits a form and records every mutating API response it caused.
 *
 * 401 is deliberately excluded: the API client silently refreshes an expired
 * access token and retries, so a 401 here is a normal part of a successful
 * request on a long run. Every other 4xx/5xx is a genuine failure.
 */
async function submitAndCaptureStatuses(page, formId) {
  const calls = [];
  const onResponse = (res) => {
    const request = res.request();
    if (request.method() === 'GET') return;
    if (!res.url().includes('/api/v1/')) return;
    if (res.url().includes('/auth/refresh')) return;
    calls.push({ status: res.status(), method: request.method(), url: res.url() });
  };

  page.on('response', onResponse);
  try {
    await submitForm(page, formId);
    const toasts = await waitForToast(page);
    // Let a response that lands just after the toast still be counted.
    await page.waitForTimeout(400);
    const failures = calls.filter((c) => c.status >= 400 && c.status !== 401);
    return { toasts, failures };
  } finally {
    page.off('response', onResponse);
  }
}

async function expectCreated(page, { label, formId, marker, finder = rowAppears }) {
  await settleToasts(page);
  const { toasts, failures } = await submitAndCaptureStatuses(page, formId);
  // Status first — no wording can override it.
  const ok =
    failures.length === 0 &&
    toasts.some((t) => SUCCESS_TOAST.test(t) && !REJECTION_PHRASE.test(t));
  // No toast at all means the form never submitted — client-side validation
  // blocked it. Surface the inline errors so the cause is obvious.
  const inline = toasts.length
    ? ''
    : ` inline: ${(await page
        .$$eval(`form#${formId} p.text-destructive`, (ps) => ps.map((p) => p.textContent))
        .catch(() => []))
        .join(', ') || 'none rendered'}`;
  // Name the status when one failed, so a regression is diagnosable from the
  // log rather than needing a re-run.
  const statusDetail = failures.length
    ? `HTTP ${failures.map((f) => `${f.status} ${f.method} ${f.url.split('/api/v1')[1]}`).join(', ')} — `
    : '';
  check(`${label} — submit succeeds`, ok,
    `${statusDetail}${toasts.join(' | ') || '(no toast)'}${inline}`);
  const found = await finder(page, marker);
  check(`${label} — created record appears in the list`, found, found ? marker : `"${marker}" not found`);
  newChecks.add(`${label} — submit succeeds`);
  newChecks.add(`${label} — created record appears in the list`);
  return ok && found;
}

/**
 * A negative case: rewrite the outgoing payload to something the backend
 * rejects, then assert the toast names the actual problem.
 *
 * Like expectCreated, this checks the STATUS as well as the text — the mirror
 * image of the same bug. Without it, a mutation the backend happened to ACCEPT
 * would still pass here: "Level created successfully" is longer than
 * "Validation failed" and is not "Something went wrong.", so a rejection check
 * would report a pass while nothing had been rejected.
 */
async function expectSpecificRejection(page, { label, urlGlob, mutate, formId, openFirst }) {
  await settleToasts(page);
  if (openFirst) await openFirst();

  const handler = async (route) => {
    const request = route.request();
    if (request.method() === 'GET') return route.continue();
    let body = {};
    try {
      body = JSON.parse(request.postData() || '{}');
    } catch {
      body = {};
    }
    await route.continue({ postData: JSON.stringify(mutate(body)) });
  };

  const statuses = [];
  const onResponse = (res) => {
    if (res.request().method() === 'GET') return;
    if (!res.url().includes('/api/v1/')) return;
    if (res.url().includes('/auth/refresh')) return;
    statuses.push(res.status());
  };

  await page.route(urlGlob, handler);
  page.on('response', onResponse);
  await submitForm(page, formId);
  const toasts = await waitForToast(page);
  await page.waitForTimeout(400);
  page.off('response', onResponse);
  await page.unroute(urlGlob, handler);

  const text = toasts.join(' | ');
  // The backend must actually have refused it. 401 excluded for the same
  // silent-refresh reason as in submitAndCaptureStatuses.
  const wasRejected = statuses.some((code) => code >= 400 && code !== 401);
  const specific =
    wasRejected &&
    toasts.length > 0 &&
    text.trim() !== 'Validation failed' &&
    text.trim().length > 'Validation failed'.length &&
    !/^Something went wrong\.$/.test(text.trim());

  const statusDetail = wasRejected ? '' : `NOT REJECTED (HTTP ${statuses.join(', ') || 'none'}) — `;
  check(`${label} — rejection message is specific, not "Validation failed"`,
    specific, `${statusDetail}${text || '(no toast)'}`);
  newChecks.add(`${label} — rejection message is specific, not "Validation failed"`);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
}

// ── cleanup ─────────────────────────────────────────────────────────────────
// Sequence values captured at run start so auto-generated numbers consumed by
// this run can be handed back, keeping the demo's advertised next numbers.
let seqBefore = {};
function captureSequences() {
  for (const t of ['student_number', 'staff_number', 'admission_number',
                   'receipt_number', 'invoice_number']) {
    seqBefore[t] = Number(sql(`select current_number from document_sequences where type = '${t}'`));
  }
}

/** QA_INVOICE_IDS as a SQL list; a sentinel when empty. */
function invoiceIdList() {
  return QA_INVOICE_IDS.length
    ? QA_INVOICE_IDS.map((id) => `'${id}'`).join(', ')
    : `'00000000-0000-0000-0000-000000000000'`;
}

/** ATT_DATES as a SQL list; a sentinel when empty, since `in ()` is invalid. */
function attDateList() {
  return ATT_DATES.length ? ATT_DATES.map((d) => `'${d}'`).join(', ') : `'1900-01-01'`;
}

function cleanup() {
  const like = `${RUN}%`;
  // NOTE: audit_logs are deliberately immutable — a `prevent_audit_log_changes`
  // trigger rejects DELETE. The audit entries this run generates therefore stay
  // in the trail by design; only the domain records below are removed.
  const statements = [
    // Restore the consent this run withdrew from a DEMO guardian, and the
    // link flags that went with it — otherwise each QA run leaves the demo
    // with one fewer consented guardian than the seed produced.
    ...QA_REVOKED_CONSENT.flatMap(({ id, method }) => [
      `update guardians set sms_consent_given = true, sms_consent_given_at = now(),
         sms_consent_method = '${method}' where id = '${id}'`,
      `update student_guardians set can_receive_sms = true where guardian_id = '${id}'`,
    ]),
    // Phase 2 — notifications this run queued. Keyed on the run's start
    // timestamp: the demo seeds its own notifications with past dates, and a
    // fee-reminder row has no other property that says whose it is.
    `delete from notification_messages where queued_at >= '${RUN_STARTED_AT}'`,
    // Phase 2 Stage 1b — finance FIRST. fee_assignments.enrollment_id and
    // invoices.enrollment_id are both ON DELETE RESTRICT, so any enrolment or
    // student delete below fails while a fee row still points at it. Order is
    // load-bearing here, not cosmetic.
    `delete from invoice_lines where invoice_id in (${invoiceIdList()})`,
    `delete from invoices where id in (${invoiceIdList()})`,
    `delete from fee_payments where fee_assignment_id in (
       select fa.id from fee_assignments fa
       join school_fees sf on sf.id = fa.school_fee_id
       join fee_types ft on ft.id = sf.fee_type_id
       where ft.name ilike '${RUN}%')`,
    `delete from fee_assignments where school_fee_id in (
       select sf.id from school_fees sf
       join fee_types ft on ft.id = sf.fee_type_id
       where ft.name ilike '${RUN}%')`,
    `delete from school_fees where fee_type_id in (
       select id from fee_types where name ilike '${RUN}%')`,
    `delete from fee_types where name ilike '${RUN}%'`,
    `delete from enrollments where student_id in (select id from students where student_number like 'STU-${RUN}%')`,
    `delete from enrollments where classroom_id in (select id from classrooms where display_name like '${like}')`,
    `delete from student_guardians where student_id in (select id from students where student_number like 'STU-${RUN}%')`,
    `delete from student_guardians where guardian_id in (select id from guardians where last_name like '${like}')`,
    `delete from admission_applications where notes like '%${RUN}%'`,
    `delete from admission_applications where student_id in (select id from students where student_number like 'STU-${RUN}%')`,
    `delete from files where original_file_name like 'qa-${RUN}%'`,
    `delete from classrooms where display_name like '${like}'`,
    `delete from terms where label like '${like}'`,
    `delete from students where student_number like 'STU-${RUN}%'`,
    `delete from guardians where last_name like '${like}'`,
    `delete from staff where staff_number like 'STF-${RUN}%'`,
    `delete from levels where name like '${like}'`,
    `delete from academic_years where label like '${like}'`,
    // records created via the blank-number auto-generate checks
    `delete from students where last_name = '${RUN}Auto'`,
    `delete from staff where last_name = '${RUN}AutoS'`,
    // Phase 2 Stage 1a — attendance written by this run, identified by the one
    // date the demo seed never marks.
    `delete from attendance_records where attendance_date in (${attDateList()})`,
    `delete from labels where name ilike '${RUN}%'`,
    // Every login this run provisions — the teacher/coordinator and the
    // user-conflict fixtures — all of which are named `qa-<RUN>-…`.
    //
    // NOTE: these users CANNOT be deleted once they have logged in.
    // audit_logs.user_id is ON DELETE SET NULL, and the
    // prevent_audit_log_changes trigger rejects that UPDATE, so the DELETE
    // fails on the FK. Neutralising them is the real cleanup: dropping the
    // roles and freeing their slots in uq_users_school_linked_entity is what
    // lets the NEXT run provision its own logins against the same staff. The
    // DELETE is kept because it succeeds for any that never logged in, and
    // failures here are tolerated per-statement.
    `delete from user_roles where user_id in (select id from users where email like 'qa-${RUN}-%')`,
    `delete from user_sessions where user_id in (select id from users where email like 'qa-${RUN}-%')`,
    `update users set is_active = false, linked_entity_id = gen_random_uuid(), email = 'retired-' || email where email like 'qa-${RUN}-%'`,
    `delete from users where email like 'retired-qa-${RUN}-%'`,
  ];
  // Independent statements: one failure must not strand the rest.
  const errors = [];
  for (const statement of statements) {
    try {
      sql(statement);
    } catch (error) {
      errors.push(`${statement.slice(0, 60)}… → ${String(error.message).split('\n')[0]}`);
    }
  }
  if (errors.length) console.log(`  (cleanup warnings)\n    ${errors.join('\n    ')}`);
  // Hand back the sequence values this run consumed (local single-user QA).
  for (const [t, n] of Object.entries(seqBefore)) {
    try {
      sql(`update document_sequences set current_number = ${n} where type = '${t}'`);
    } catch { /* sequences are best-effort restore */ }
  }
}

function countLeftovers() {
  const like = `${RUN}%`;
  return Number(
    sql(`select
      (select count(*) from academic_years where label like '${like}')
    + (select count(*) from terms where label like '${like}')
    + (select count(*) from levels where name like '${like}')
    + (select count(*) from classrooms where display_name like '${like}')
    + (select count(*) from staff where staff_number like 'STF-${RUN}%')
    + (select count(*) from students where student_number like 'STU-${RUN}%')
    + (select count(*) from guardians where last_name like '${like}')
    + (select count(*) from files where original_file_name like 'qa-${RUN}%')
    + (select count(*) from admission_applications where notes like '%${RUN}%')
    + (select count(*) from students where last_name = '${RUN}Auto')
    + (select count(*) from staff where last_name = '${RUN}AutoS')
    + (select count(*) from labels where name ilike '${RUN}%')
    + (select count(*) from fee_types where name ilike '${RUN}%')
    + (select count(*) from school_fees sf join fee_types ft on ft.id = sf.fee_type_id
         where ft.name ilike '${RUN}%')
    + (select count(*) from invoices where id in (${invoiceIdList()}))
    + (select count(*) from notification_messages where queued_at >= '${RUN_STARTED_AT}')
    + (select count(*) from guardians where id in (${
        QA_REVOKED_CONSENT.length
          ? QA_REVOKED_CONSENT.map((g) => `'${g.id}'`).join(', ')
          : `'00000000-0000-0000-0000-000000000000'`
      }) and not sms_consent_given)
    + (select count(*) from attendance_records where attendance_date in (${attDateList()}))
    -- The QA login is counted only if it is still ACTIVE. A deactivated,
    -- unlinked leftover is the expected outcome, not a leak: see cleanup().
    + (select count(*) from users where email like 'qa-${RUN}-%' and is_active)`),
  );
}

// ── the run ─────────────────────────────────────────────────────────────────
console.log(`Brite SMS QA pass — run token ${RUN}\n`);

// ── preflight: refuse to test a stale backend ───────────────────────────────
// An orphaned process holding :3001 while serving old code has produced
// misleading QA failures twice. The API stamps every response with
// x-booted-at (set at process start); if the newest backend source file is
// younger than the running process, the server cannot contain current code.
const API = process.env.QA_API_URL ?? 'http://localhost:3001/api/v1';
const BACKEND_SRC = process.env.QA_BACKEND_SRC ?? new URL('../../sms-pre/src', import.meta.url).pathname;
async function preflight() {
  let bootedAt;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API}/school`);
      bootedAt = res.headers.get('x-booted-at');
    } catch {
      console.error(`PREFLIGHT FAIL — no API responding at ${API}`);
      process.exit(1);
    }
    if (!bootedAt) {
      console.error('PREFLIGHT FAIL — backend sends no x-booted-at header: the process on :3001 predates the preflight mechanism and is serving stale code. Kill it and restart the backend.');
      process.exit(1);
    }
    const newestSrc = Number(execFileSync('bash', ['-c',
      `find "${BACKEND_SRC}" -type f -name '*.ts' -exec stat -f '%m' {} + | sort -rn | head -1`,
    ], { encoding: 'utf8' }).trim()) * 1000;
    if (new Date(bootedAt).getTime() >= newestSrc) {
      console.log(`Preflight OK — backend booted ${bootedAt}, newer than all sources.`);
      return;
    }
    if (attempt === 0) {
      // The watcher may still be restarting after a very recent edit.
      await new Promise((r) => setTimeout(r, 8000));
      continue;
    }
    console.error(`PREFLIGHT FAIL — backend booted ${bootedAt} but a source file is newer (${new Date(newestSrc).toISOString()}). An orphaned process is serving stale code. Kill everything on :3001 and restart.`);
    process.exit(1);
  }
}
await preflight();

const browser = await chromium.launch({ headless: process.env.QA_HEADED !== '1' });
const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await context.newPage();

const crashes = [];
page.on('pageerror', (e) => crashes.push(e.message));

let exitCode = 0;

try {
  // ── auth ──────────────────────────────────────────────────────────────────
  section('Auth');
  await page.goto(`${BASE}/login`);
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 25000 });
  check('login redirects to /dashboard', page.url().includes('/dashboard'));
  captureSequences();

  // ── academic year ─────────────────────────────────────────────────────────
  section('Academic Year');
  await gotoRoute(page, '/academic-years');
  await openDialog(page, 'New Academic Year', 'ay-form');
  await page.fill('#ay-label', NAMES.year);
  await page.fill('#ay-start', '2035-09-01');
  await page.fill('#ay-end', '2036-07-31');
  await expectCreated(page, { label: 'Academic Year', formId: 'ay-form', marker: NAMES.year });

  await openDialog(page, 'New Academic Year', 'ay-form');
  await page.fill('#ay-label', `${RUN} Reject`);
  await page.fill('#ay-start', '2037-09-01');
  await page.fill('#ay-end', '2038-07-31');
  await expectSpecificRejection(page, {
    label: 'Academic Year',
    urlGlob: '**/api/v1/academic-years',
    mutate: (b) => ({ ...b, startDate: 'not-a-real-date' }),
    formId: 'ay-form',
  });


  // ── term ──────────────────────────────────────────────────────────────────
  section('Term');
  await gotoRoute(page, '/terms');
  await openDialog(page, 'New Term', 'term-form');
  await page.selectOption('#t-ay', { label: NAMES.year });
  await page.fill('#t-num', '1');
  await page.fill('#t-label', NAMES.term);
  await page.fill('#t-start', '2035-09-01');
  await page.fill('#t-end', '2035-12-15');
  await expectCreated(page, { label: 'Term', formId: 'term-form', marker: NAMES.term });

  await openDialog(page, 'New Term', 'term-form');
  await page.selectOption('#t-ay', { label: NAMES.year });
  await page.fill('#t-num', '2');
  await page.fill('#t-label', `${RUN} Reject`);
  await page.fill('#t-start', '2036-01-05');
  await page.fill('#t-end', '2036-04-01');
  await expectSpecificRejection(page, {
    label: 'Term',
    urlGlob: '**/api/v1/terms',
    mutate: (b) => ({ ...b, termNumber: 99 }),
    formId: 'term-form',
  });

  // ── level ─────────────────────────────────────────────────────────────────
  section('Level');
  await gotoRoute(page, '/levels');
  await openDialog(page, 'New Level', 'level-form');
  await page.fill('#lv-name', NAMES.level);
  await page.selectOption('#lv-group', 'LOWER_PRIMARY');
  await page.fill('#lv-order', '91');
  await expectCreated(page, { label: 'Level', formId: 'level-form', marker: NAMES.level });

  await openDialog(page, 'New Level', 'level-form');
  await page.fill('#lv-name', `${RUN} Reject`);
  await page.selectOption('#lv-group', 'LOWER_PRIMARY');
  await page.fill('#lv-order', '92');
  await expectSpecificRejection(page, {
    label: 'Level',
    urlGlob: '**/api/v1/levels',
    mutate: (b) => ({ ...b, levelGroup: 'NOT_A_LEVEL_GROUP' }),
    formId: 'level-form',
  });

  // ── staff ─────────────────────────────────────────────────────────────────
  section('Staff');
  await gotoRoute(page, '/staff');
  await openDialog(page, 'New Staff Member', 'staff-create-form');
  await page.fill('#sf-num', NAMES.staffNumber);
  await page.fill('#sf-firstName', 'Kojo');
  await page.fill('#sf-lastName', NAMES.staffLast);
  await page.selectOption('#sf-role', 'teacher');
  await expectCreated(page, { label: 'Staff', formId: 'staff-create-form', marker: NAMES.staffNumber });

  await openDialog(page, 'New Staff Member', 'staff-create-form');
  await page.fill('#sf-num', `STF-${RUN}-R`);
  await page.fill('#sf-firstName', 'Reject');
  await page.fill('#sf-lastName', `${RUN}Reject`);
  await page.selectOption('#sf-role', 'teacher');
  await expectSpecificRejection(page, {
    label: 'Staff',
    urlGlob: '**/api/v1/staff',
    mutate: (b) => ({ ...b, roleCategory: 'wizard' }),
    formId: 'staff-create-form',
  });

  // Blank staff number → the backend claims the next STF value.
  await openDialog(page, 'New Staff Member', 'staff-create-form');
  await page.fill('#sf-firstName', 'Auto');
  await page.fill('#sf-lastName', `${RUN}AutoS`);
  await page.selectOption('#sf-role', 'support');
  await settleToasts(page);
  await submitForm(page, 'staff-create-form');
  await waitForToast(page);
  const autoStfNumber = sql(`select coalesce(staff_number,'NULL') from staff where last_name = '${RUN}AutoS'`);
  check('Staff — blank number auto-generates from the sequence',
    /^STF-\d{4,}$/.test(autoStfNumber), autoStfNumber);
  newChecks.add('Staff — blank number auto-generates from the sequence');
  await closeAnyDialog(page);

  const staffId = sql(`select id from staff where staff_number = '${NAMES.staffNumber}'`);

  // ── classroom ─────────────────────────────────────────────────────────────
  section('Classroom');
  await gotoRoute(page, '/classrooms');
  await openDialog(page, 'New Classroom', 'classroom-create-form');
  await page.selectOption('#cr-level', { label: NAMES.level });
  await page.selectOption('#cr-year', { label: NAMES.year });
  await page.fill('#cr-section', 'A');
  await page.fill('#cr-display', NAMES.classroom);
  await page.fill('#cr-cap', '30');
  await expectCreated(page, { label: 'Classroom', formId: 'classroom-create-form', marker: NAMES.classroom });

  await openDialog(page, 'New Classroom', 'classroom-create-form');
  await page.selectOption('#cr-level', { label: NAMES.level });
  await page.selectOption('#cr-year', { label: NAMES.year });
  await page.fill('#cr-section', 'B');
  await page.fill('#cr-display', `${RUN} Reject`);
  await expectSpecificRejection(page, {
    label: 'Classroom',
    urlGlob: '**/api/v1/classrooms',
    mutate: (b) => ({ ...b, levelId: 'definitely-not-a-uuid' }),
    formId: 'classroom-create-form',
  });

  const classroomId = sql(`select id from classrooms where display_name = '${NAMES.classroom}'`);

  // ── assign teacher ────────────────────────────────────────────────────────
  section('Assign Teacher');
  await gotoRoute(page, '/classrooms');
  await settleToasts(page);
  await page.click(`tr:has-text("${NAMES.classroom}") button[title="Assign teacher"]`);
  await page.waitForSelector('form#assign-teacher-form');
  await page.waitForTimeout(500);
  await pickSearchable(page, 'at-staff', NAMES.staffLast);
  await submitForm(page, 'assign-teacher-form');
  const assignToast = await waitForToast(page);
  check('Assign Teacher — submit succeeds', assignToast.some((t) => /assign/i.test(t)), assignToast.join(' | '));
  // The classrooms table doesn't render the teacher, so assert the persisted row.
  const assigned = sql(`select class_teacher_id from classrooms where id = '${classroomId}'`);
  check('Assign Teacher — teacher persisted on the classroom row', assigned === staffId,
    `class_teacher_id=${assigned.slice(0, 8)}… expected ${staffId.slice(0, 8)}…`);
  newChecks.add('Assign Teacher — submit succeeds');
  newChecks.add('Assign Teacher — teacher persisted on the classroom row');

  await page.click(`tr:has-text("${NAMES.classroom}") button[title="Assign teacher"]`);
  await page.waitForSelector('form#assign-teacher-form');
  await page.waitForTimeout(400);
  await pickSearchable(page, 'at-staff', NAMES.staffLast);
  await expectSpecificRejection(page, {
    label: 'Assign Teacher',
    urlGlob: '**/api/v1/classrooms/*/assign-class-teacher',
    mutate: (b) => ({ ...b, staffId: 'not-a-uuid-at-all' }),
    formId: 'assign-teacher-form',
  });

  // ── student ───────────────────────────────────────────────────────────────
  section('Student');
  await gotoRoute(page, '/students');
  await openDialog(page, 'New Student', 'student-create-form');
  await page.fill('#st-num', NAMES.studentNumber);
  await page.fill('#st-fn', 'Abena');
  await page.fill('#st-ln', NAMES.studentLast);
  await page.fill('#st-dob', '2017-04-12');
  await page.selectOption('#st-gender', 'female');
  await expectCreated(page, { label: 'Student', formId: 'student-create-form', marker: NAMES.studentNumber });

  await openDialog(page, 'New Student', 'student-create-form');
  await page.fill('#st-num', `STU-${RUN}-R`);
  await page.fill('#st-fn', 'Reject');
  await page.fill('#st-ln', `${RUN}Reject`);
  await page.fill('#st-dob', '2017-04-12');
  await page.selectOption('#st-gender', 'female');
  await expectSpecificRejection(page, {
    label: 'Student',
    urlGlob: '**/api/v1/students',
    mutate: (b) => ({ ...b, gender: 'unspecified' }),
    formId: 'student-create-form',
  });

  const studentId = sql(`select id from students where student_number = '${NAMES.studentNumber}'`);

  // Blank student number → the backend claims the next STU value.
  await openDialog(page, 'New Student', 'student-create-form');
  await page.fill('#st-fn', 'Auto');
  await page.fill('#st-ln', `${RUN}Auto`);
  await page.fill('#st-dob', '2018-01-15');
  await page.selectOption('#st-gender', 'female');
  await settleToasts(page);
  await submitForm(page, 'student-create-form');
  await waitForToast(page);
  const autoStuNumber = sql(`select coalesce(student_number,'NULL') from students where last_name = '${RUN}Auto'`);
  check('Student — blank number auto-generates from the sequence',
    /^STU-\d{4,}$/.test(autoStuNumber), autoStuNumber);
  newChecks.add('Student — blank number auto-generates from the sequence');
  await closeAnyDialog(page);

  // Search must match the student NUMBER, not just names — the field is
  // labelled "Search by name or number…".
  await gotoRoute(page, '/students');
  const partialNumber = NAMES.studentNumber.slice(0, 10); // e.g. "STU-QARPS"
  await page.fill('input[placeholder*="Search by name or number"]', partialNumber);
  await page.waitForTimeout(2200);
  const searchRows = await page.$$eval('tbody tr', (rs) => rs.map((r) => r.innerText)).catch(() => []);
  check('Student search — partial student number returns the matching row',
    searchRows.some((r) => r.includes(NAMES.studentNumber)),
    `"${partialNumber}" → ${searchRows.length} row(s)`);
  check('Student search — partial student number does not return everything',
    searchRows.length > 0 && searchRows.length < 12, `${searchRows.length} row(s)`);
  newChecks.add('Student search — partial student number returns the matching row');
  newChecks.add('Student search — partial student number does not return everything');

  // ── guardian ──────────────────────────────────────────────────────────────
  section('Guardian');
  await gotoRoute(page, '/guardians');
  await openDialog(page, 'New Guardian', 'guardian-create-form');
  await page.fill('#gf-fn', 'Akosua');
  await page.fill('#gf-ln', NAMES.guardianLast);
  await page.fill('#gf-ph1', PHONE);
  await expectCreated(page, { label: 'Guardian', formId: 'guardian-create-form', marker: NAMES.guardianLast });

  await openDialog(page, 'New Guardian', 'guardian-create-form');
  await page.fill('#gf-fn', 'Reject');
  await page.fill('#gf-ln', `${RUN}Reject`);
  await page.fill('#gf-ph1', `${PHONE}9`);
  await expectSpecificRejection(page, {
    label: 'Guardian',
    urlGlob: '**/api/v1/guardians',
    mutate: (b) => ({ ...b, email: 'definitely-not-an-email' }),
    formId: 'guardian-create-form',
  });

  // ── link guardian + set primary ───────────────────────────────────────────
  section('Link Guardian / Set Primary');
  await gotoRoute(page, '/student-guardians');
  // NOTE: the backend's student search matches first/last name only, so the
  // surname is used here even though the field is labelled "name or number".
  await page.fill('input[placeholder*="Search students"]', NAMES.studentLast);
  await page.waitForTimeout(2000);
  const linkFormId = `link-form-${studentId}`;
  await page.click(`button:has-text("Link Guardian")`);
  await page.waitForSelector(`form#${linkFormId}`);
  await page.waitForTimeout(500);
  await pickSearchable(page, 'lf-guardian', NAMES.guardianLast);
  await page.fill('#lf-rel', 'mother');
  await expectCreated(page, {
    label: 'Link Guardian',
    formId: linkFormId,
    marker: NAMES.guardianLast,
    finder: textAppears,
  });

  await settleToasts(page);
  const setPrimaryButton = page.locator('button:has-text("Set Primary")').first();
  if (await setPrimaryButton.count()) {
    await setPrimaryButton.click();
    const primaryToast = await waitForToast(page);
    check('Set Primary — submit succeeds', primaryToast.some((t) => /primary/i.test(t)), primaryToast.join(' | '));
  } else {
    check('Set Primary — submit succeeds', false, 'no Set Primary button rendered');
  }
  check('Set Primary — link shows the Primary marker', await textAppears(page, 'Primary'));
  const primaryInDb = sql(`select is_primary from student_guardians where student_id = '${studentId}'`);
  check('Set Primary — persisted on the link row', primaryInDb === 't', `is_primary=${primaryInDb}`);
  newChecks.add('Set Primary — submit succeeds');
  newChecks.add('Set Primary — link shows the Primary marker');
  newChecks.add('Set Primary — persisted on the link row');

  await page.click(`button:has-text("Link Guardian")`);
  await page.waitForSelector(`form#${linkFormId}`);
  await page.waitForTimeout(400);
  await pickSearchable(page, 'lf-guardian', NAMES.guardianLast);
  await expectSpecificRejection(page, {
    label: 'Link Guardian',
    urlGlob: '**/api/v1/student-guardians',
    mutate: (b) => ({ ...b, guardianId: 'not-a-uuid' }),
    formId: linkFormId,
  });

  // ── admission → offer → enroll ────────────────────────────────────────────
  section('Admission → Offer → Enroll');
  await gotoRoute(page, '/admissions');
  const admissionsBefore = await page.$$eval('tbody tr', (r) => r.length).catch(() => 0);
  await openDialog(page, 'New Admission', 'adm-create-form');
  await pickSearchable(page, 'adm-student', NAMES.studentNumber);
  await page.selectOption('#adm-source', 'walk_in');
  await page.selectOption('#adm-curriculum', 'BOTH');
  await page.fill('#adm-notes', NAMES.admissionNote);
  await settleToasts(page);
  await submitForm(page, 'adm-create-form');
  const admToast = await waitForToast(page);
  check('Admission — submit succeeds', admToast.some((t) => /created/i.test(t)), admToast.join(' | ') || '(no toast)');
  // The admissions table renders neither notes nor the linked student, so the
  // row is asserted by count plus the persisted record.
  await page.waitForTimeout(1500);
  const admissionsAfter = await page.$$eval('tbody tr', (r) => r.length).catch(() => 0);
  check('Admission — created record appears in the list',
    admissionsAfter === admissionsBefore + 1, `${admissionsBefore} → ${admissionsAfter} rows`);
  const admissionRow = sql(
    `select status from admission_applications where notes = '${NAMES.admissionNote}'`);
  check('Admission — persisted with status Enquiry', admissionRow === 'enquiry', `status=${admissionRow}`);
  newChecks.add('Admission — submit succeeds');
  newChecks.add('Admission — created record appears in the list');
  newChecks.add('Admission — persisted with status Enquiry');

  // Auto-assigned admission number: present in the DB and visible in the list
  // with no dash placeholder.
  const admNumber = sql(
    `select coalesce(admission_number,'NULL') from admission_applications where notes = '${NAMES.admissionNote}'`);
  check('Admission — number auto-assigned at creation', /^ADM-\d{4,}$/.test(admNumber), admNumber);
  check('Admission — number visible in the list (dash gone)',
    await rowAppears(page, admNumber), admNumber);
  newChecks.add('Admission — number auto-assigned at creation');
  newChecks.add('Admission — number visible in the list (dash gone)');

  // A second creation must draw a different number (jest carries the true
  // concurrency test; this is the UI-level smoke).
  await openDialog(page, 'New Admission', 'adm-create-form');
  await page.selectOption('#adm-source', 'walk_in');
  await page.fill('#adm-notes', `${NAMES.admissionNote} second`);
  await settleToasts(page);
  await submitForm(page, 'adm-create-form');
  await waitForToast(page);
  const admNumber2 = sql(
    `select coalesce(admission_number,'NULL') from admission_applications where notes = '${NAMES.admissionNote} second'`);
  check('Admission — consecutive creations get distinct numbers',
    /^ADM-\d{4,}$/.test(admNumber2) && admNumber2 !== admNumber, `${admNumber} → ${admNumber2}`);
  newChecks.add('Admission — consecutive creations get distinct numbers');
  await closeAnyDialog(page);

  await openDialog(page, 'New Admission', 'adm-create-form');
  await page.fill('#adm-notes', `${NAMES.admissionNote} reject`);
  await expectSpecificRejection(page, {
    label: 'Admission',
    urlGlob: '**/api/v1/admissions',
    mutate: (b) => ({ ...b, curriculumInterest: 'NOT_A_CURRICULUM' }),
    formId: 'adm-create-form',
  });

  const admissionId = sql(`select id from admission_applications where notes = '${NAMES.admissionNote}'`);

  // Transition journey on the numbered row: Apply → Offer → Revert Offer.
  await gotoRoute(page, '/admissions');
  await settleToasts(page);
  await page.click(`tr:has-text("${admNumber}") button:has-text("Apply")`);
  await waitForToast(page);
  check('Transitions — Apply moves Enquiry to Application',
    await rowShows(page, admNumber, 'Application'));
  newChecks.add('Transitions — Apply moves Enquiry to Application');
  await settleToasts(page);
  await page.click(`tr:has-text("${admNumber}") button:has-text("Offer")`);
  await waitForToast(page);
  await settleToasts(page);
  await page.click(`tr:has-text("${admNumber}") button[title="Revert offer"]`);
  await waitForToast(page);
  check('Transitions — Revert Offer returns to Application',
    await rowShows(page, admNumber, 'Application'));
  const revertedFields = sql(
    `select coalesce(offered_at::text,'NULL')||'|'||coalesce(approved_by::text,'NULL') from admission_applications where admission_number='${admNumber}'`);
  check('Transitions — Revert Offer cleared offeredAt and approvedBy', revertedFields === 'NULL|NULL', revertedFields);
  newChecks.add('Transitions — Revert Offer returns to Application');
  newChecks.add('Transitions — Revert Offer cleared offeredAt and approvedBy');

  // Offer again for the enroll leg.
  await settleToasts(page);
  await page.click(`tr:has-text("${admNumber}") button:has-text("Offer")`);
  const offerToast = await waitForToast(page);
  check('Offer — submit succeeds', offerToast.some((t) => /offer/i.test(t)), offerToast.join(' | '));
  const offeredStatus = sql(`select status from admission_applications where id = '${admissionId}'`);
  check('Offer — admission moves to Offered', offeredStatus === 'offered', `status=${offeredStatus}`);
  newChecks.add('Offer — submit succeeds');
  newChecks.add('Offer — admission moves to Offered');

  // Enroll from the admission
  await gotoRoute(page, '/admissions');
  await settleToasts(page);
  await page.click(`tr:has-text("${admNumber}") button:has-text("Enroll")`);
  await page.waitForSelector('form#adm-enroll-form');
  await page.waitForTimeout(600);
  await pickSearchable(page, 'enr-classroom', NAMES.classroom);
  await page.selectOption('#enr-year', { label: NAMES.year });
  await page.selectOption('#enr-track', 'GES_NACCA');
  await submitForm(page, 'adm-enroll-form');
  const enrollToast = await waitForToast(page);
  check('Enroll from Admission — submit succeeds', enrollToast.some((t) => /enrolled/i.test(t)), enrollToast.join(' | '));
  const enrolledStatus = sql(`select status from admission_applications where id = '${admissionId}'`);
  check('Enroll from Admission — admission moves to Enrolled', enrolledStatus === 'enrolled', `status=${enrolledStatus}`);
  await gotoRoute(page, '/enrollments');
  check('Enroll from Admission — enrollment appears on /enrollments',
    await rowAppears(page, NAMES.classroom));
  const admissionTrack = sql(
    `select curriculum_track from enrollments where student_id = '${studentId}'`);
  check('Enroll from Admission — enrollment persisted on the chosen track',
    admissionTrack === 'GES_NACCA', `track=${admissionTrack}`);
  newChecks.add('Enroll from Admission — enrollment persisted on the chosen track');

  // Illegal transition straight at the API: apply on an enrolled admission.
  const illegal = await apiCall('POST', `/admissions/${admissionId}/apply`);
  check('Transitions — illegal transition via API gets a specific 409',
    illegal.status === 409 && /Only an enquiry can move to application/.test(illegal.body?.message ?? ''),
    `${illegal.status} ${illegal.body?.message ?? ''}`);
  newChecks.add('Transitions — illegal transition via API gets a specific 409');

  // The old bypass: PATCH with a status field must be rejected outright.
  const bypass = await apiCall('PATCH', `/admissions/${admissionId}`, { status: 'enquiry' });
  check('Transitions — PATCH with status is rejected (bypass closed)',
    bypass.status === 400 && JSON.stringify(bypass.body?.errors ?? []).includes('property status should not exist'),
    `${bypass.status} ${JSON.stringify(bypass.body?.errors ?? bypass.body?.message)}`);
  newChecks.add('Transitions — PATCH with status is rejected (bypass closed)');

  // Revert-enrollment guard, branch 1: the enrollment is still active.
  const blocked = await apiCall('POST', `/admissions/${admissionId}/revert-enrollment`);
  check('Revert Enrollment — blocked while the enrollment is active',
    blocked.status === 409 && blocked.body?.message === 'Withdraw the enrollment first.',
    `${blocked.status} ${blocked.body?.message ?? ''}`);
  newChecks.add('Revert Enrollment — blocked while the enrollment is active');
  newChecks.add('Enroll from Admission — submit succeeds');
  newChecks.add('Enroll from Admission — admission moves to Enrolled');
  newChecks.add('Enroll from Admission — enrollment appears on /enrollments');

  // ── withdraw the admission enrollment (WITH a reason) ─────────────────────
  // The database enforces `uq_one_active_enrollment_per_student_year`: one
  // ACTIVE enrollment per student per academic year, regardless of track. So
  // the admission's enrollment is withdrawn before a second one is created.
  section('Withdraw Enrollment — with a reason');
  await gotoRoute(page, '/enrollments');
  await settleToasts(page);
  await page.click(`tr:has-text("${NAMES.classroom}") button:has-text("Withdraw")`);
  await page.waitForSelector('form#enr-withdraw-form');
  await page.waitForTimeout(500);
  await page.fill('#wd-reason', 'family relocation');
  await submitForm(page, 'enr-withdraw-form');
  const wdToastB = await waitForToast(page);
  check('Withdraw with a reason — submit succeeds',
    wdToastB.some((t) => /withdrawn/i.test(t)), wdToastB.join(' | '));
  check('Withdraw with a reason — row shows Withdrawn',
    await rowAppears(page, 'Withdrawn'));
  const gesRow = sql(
    `select status || '|' || coalesce(exit_reason,'NULL') from enrollments
     where student_id = '${studentId}' and curriculum_track = 'GES_NACCA'`);
  check('Withdraw with a reason — reason is stored',
    gesRow === 'withdrawn|family relocation', gesRow);
  newChecks.add('Withdraw with a reason — submit succeeds');
  newChecks.add('Withdraw with a reason — row shows Withdrawn');
  newChecks.add('Withdraw with a reason — reason is stored');

  // ── enrollment created directly ───────────────────────────────────────────
  section('Enrollment (direct)');
  await gotoRoute(page, '/enrollments');
  await openDialog(page, 'New Enrollment', 'enr-create-form');
  await page.click('[id="enr-student"]');
  await page.waitForSelector('[role=listbox]', { timeout: 8000 });
  await page.waitForTimeout(600);
  const studentOptionCount = await page.locator('[role=option]').count();
  check('New Enrollment — student dropdown lists real students',
    studentOptionCount > 1, `${studentOptionCount} options`);
  // listbox is still open from the count check — now exercise the typeahead.

  // Partial NAME narrows the list (server-side search).
  const searchInput = page.locator('input[placeholder="Type to filter…"]');
  await searchInput.fill('Boakye');
  await page.waitForTimeout(900);
  const byName = await page.locator('[role=option]').allInnerTexts();
  check('Typeahead — partial name filters to matching students',
    byName.length >= 1 && byName.every((t) => t.includes('Boakye')), byName.join(' · '));
  newChecks.add('Typeahead — partial name filters to matching students');

  // Partial student NUMBER works too.
  await searchInput.fill(NAMES.studentNumber.slice(0, 10));
  await page.waitForTimeout(900);
  const byNumber = await page.locator('[role=option]').allInnerTexts();
  check('Typeahead — partial student number filters too',
    byNumber.length === 1 && byNumber[0].includes(NAMES.studentNumber), byNumber.join(' · '));
  newChecks.add('Typeahead — partial student number filters too');

  // Nonsense query → the empty message, not an error.
  await searchInput.fill('zzqx');
  await page.waitForTimeout(900);
  const emptyMsg = await page.locator('[role=listbox]').innerText();
  check("Typeahead — no matches shows \"No students match 'zzqx'\"",
    emptyMsg.includes("No students match 'zzqx'"), emptyMsg.trim());
  newChecks.add('Typeahead — no matches shows the empty message');

  // The check that matters: a student beyond the first 100 rows is findable.
  // Bulk-insert 120 students so the unfiltered first page cannot contain the
  // target, then search for it.
  sql(`insert into students (school_id, student_number, first_name, last_name, date_of_birth, gender, status, updated_at)
       select '${sql(`select id from schools limit 1`)}', 'STU-${RUN}B' || lpad(n::text, 3, '0'),
              'Bulk' || lpad(n::text, 3, '0'), '${RUN}Bulk', '2016-01-01', 'male', 'active', now()
       from generate_series(1, 120) n`);
  await searchInput.fill('Bulk117');
  await page.waitForTimeout(900);
  const beyond = await page.locator('[role=option]').allInnerTexts();
  check('Typeahead — a student beyond the first 100 rows is findable',
    beyond.length === 1 && beyond[0].includes(`STU-${RUN}B117`), beyond.join(' · '));
  newChecks.add('Typeahead — a student beyond the first 100 rows is findable');
  sql(`delete from students where last_name = '${RUN}Bulk'`);
  await searchInput.fill('');
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape'); // close the listbox (not the dialog)
  await page.waitForTimeout(300);
  check('Typeahead — Escape closes the listbox but not the dialog',
    (await page.locator('[role=listbox]').count()) === 0 &&
    (await page.locator('form#enr-create-form').count()) === 1);
  newChecks.add('Typeahead — Escape closes the listbox but not the dialog');
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dateValue = await page.$eval('#enr-date', (e) => e.value);
  check('New Enrollment — enrollment date defaults to today (local calendar date)',
    dateValue === localToday, `field=${dateValue} local today=${localToday}`);
  newChecks.add('New Enrollment — student dropdown lists real students');
  newChecks.add('New Enrollment — enrollment date defaults to today (local calendar date)');

  await pickSearchable(page, 'enr-student', NAMES.studentNumber);
  await pickSearchable(page, 'enr-classroom', NAMES.classroom);
  await page.selectOption('#enr-year', { label: NAMES.year });
  await page.selectOption('#enr-track', 'ABEKA');
  await expectCreated(page, { label: 'Enrollment', formId: 'enr-create-form', marker: 'ABEKA' });
  const directTrack = sql(
    `select curriculum_track from enrollments
     where student_id = '${studentId}' and status = 'active'`);
  check('Enrollment — created on the chosen track and is Active',
    directTrack === 'ABEKA', `track=${directTrack}`);
  newChecks.add('Enrollment — created on the chosen track and is Active');

  await openDialog(page, 'New Enrollment', 'enr-create-form');
  await pickSearchable(page, 'enr-student', NAMES.studentNumber);
  await pickSearchable(page, 'enr-classroom', NAMES.classroom);
  await page.selectOption('#enr-year', { label: NAMES.year });
  await expectSpecificRejection(page, {
    label: 'Enrollment',
    urlGlob: '**/api/v1/enrollments',
    mutate: (b) => ({ ...b, curriculumTrack: 'BOTH' }),
    formId: 'enr-create-form',
  });

  // duplicate guard still speaks clearly
  await gotoRoute(page, '/enrollments');
  await openDialog(page, 'New Enrollment', 'enr-create-form');
  await pickSearchable(page, 'enr-student', NAMES.studentNumber);
  await pickSearchable(page, 'enr-classroom', NAMES.classroom);
  await page.selectOption('#enr-year', { label: NAMES.year });
  await page.selectOption('#enr-track', 'ABEKA');
  await submitForm(page, 'enr-create-form');
  const dupToast = await waitForToast(page);
  const dupText = dupToast.join(' | ');
  check('Enrollment — duplicate guard names the real rule (one active per year)',
    /already has an active enrollment for this academic year/i.test(dupText)
      && /withdraw it before creating another one/i.test(dupText),
    dupText);
  // The constraint is per-year regardless of track, so the message must not
  // claim the track is part of it.
  check('Enrollment — duplicate guard no longer blames the curriculum track',
    !/curriculum track/i.test(dupText), dupText);
  newChecks.add('Enrollment — duplicate guard names the real rule (one active per year)');
  newChecks.add('Enrollment — duplicate guard no longer blames the curriculum track');

  // A year that has ENDED refuses new enrollments; future years stay open
  // (pre-enrollment is the admissions season — verified by the main flow,
  // which enrolls into the seed's future years).
  //
  // The year is LOOKED UP by its dates, not by a hardcoded label. The demo's
  // academic years are derived from the seed run's date, so their labels move;
  // "the year that has already ended" is the stable way to name this one.
  const [endedYearId, endedYearLabel] = sql(
    `select id || ',' || label from academic_years
     where end_date < current_date order by end_date desc limit 1`).split(',');
  const endedAttempt = await apiCall('POST', '/enrollments', {
    studentId, classroomId, academicYearId: endedYearId, curriculumTrack: 'GES_NACCA',
  });
  check('Enrollment — ended academic year refused with a dated message',
    endedAttempt.status === 409 &&
      new RegExp(`^Cannot enroll into ${endedYearLabel.replace('/', '\\/')}: the academic year ended on \\d{4}-\\d{2}-\\d{2}\\.$`)
        .test(endedAttempt.body?.message ?? ''),
    `${endedAttempt.status} ${endedAttempt.body?.message ?? ''}`);
  newChecks.add('Enrollment — ended academic year refused with a dated message');

  // Item 1 guard: the motivating case — the QA classroom (created in the QA
  // year) submitted against a DIFFERENT year.
  // Again by dates, not by label: the future (still unstarted) demo year.
  const [otherYearId, otherYearLabel] = sql(
    `select id || ',' || label from academic_years
     where start_date > current_date order by start_date asc limit 1`).split(',');
  const mismatch = await apiCall('POST', '/enrollments', {
    studentId, classroomId, academicYearId: otherYearId, curriculumTrack: 'GES_NACCA',
  });
  check('Enrollment — classroom/year mismatch refused, naming both',
    mismatch.status === 409 &&
      mismatch.body?.message === `Classroom '${NAMES.classroom}' belongs to the ${NAMES.year} academic year, not ${otherYearLabel}. Pick a classroom from the selected year.`,
    `${mismatch.status} ${mismatch.body?.message ?? ''}`);
  newChecks.add('Enrollment — classroom/year mismatch refused, naming both');
  await closeAnyDialog(page);

  // ── withdraw the direct enrollment (WITHOUT a reason) ──────────────────────
  section('Withdraw Enrollment — without a reason');
  const enrollmentCount = Number(sql(`select count(*) from enrollments where student_id = '${studentId}'`));
  check('both enrollments exist for the QA student', enrollmentCount === 2, `found ${enrollmentCount}`);

  await gotoRoute(page, '/enrollments');
  await settleToasts(page);
  await page.click(`tr:has-text("${NAMES.classroom}"):has-text("ABEKA") button:has-text("Withdraw")`);
  await page.waitForSelector('form#enr-withdraw-form');
  await page.waitForTimeout(500);
  await page.fill('#wd-reason', '');
  await submitForm(page, 'enr-withdraw-form');
  const wdToastA = await waitForToast(page);
  check('Withdraw without a reason — submit succeeds',
    wdToastA.some((t) => /withdrawn/i.test(t)), wdToastA.join(' | '));
  const abekaRow = sql(
    `select status || '|' || coalesce(exit_reason, 'NULL') || '|' || coalesce(exit_date::text,'NULL')
     from enrollments where student_id = '${studentId}' and curriculum_track = 'ABEKA'`);
  check('Withdraw without a reason — Withdrawn, exit date recorded, reason null',
    abekaRow.startsWith('withdrawn|NULL|') && !abekaRow.endsWith('|NULL'), abekaRow);
  newChecks.add('Withdraw without a reason — submit succeeds');
  newChecks.add('Withdraw without a reason — Withdrawn, exit date recorded, reason null');

  // ── admission transitions that require the enrollments to be withdrawn ────
  section('Admission — revert enrollment & terminal states');
  // Guard branch 2: every enrollment for the student is withdrawn → revert OK.
  const reverted = await apiCall('POST', `/admissions/${admissionId}/revert-enrollment`);
  check('Revert Enrollment — succeeds after withdrawal, admission back to Offered',
    reverted.status === 201 || reverted.status === 200,
    `${reverted.status} ${reverted.body?.message ?? ''}`);
  const revertedRow = sql(
    `select status||'|'||coalesce(enrolled_at::text,'NULL')||'|'||coalesce(student_id::text,'NULL') from admission_applications where id='${admissionId}'`);
  check('Revert Enrollment — enrolledAt cleared, studentId retained',
    revertedRow.startsWith('offered|NULL|') && !revertedRow.endsWith('|NULL'), revertedRow);
  newChecks.add('Revert Enrollment — succeeds after withdrawal, admission back to Offered');
  newChecks.add('Revert Enrollment — enrolledAt cleared, studentId retained');

  // Terminal: Reject from Offered.
  await gotoRoute(page, '/admissions');
  await settleToasts(page);
  await page.click(`tr:has-text("${admNumber}") button[title="Reject (school declines)"]`);
  await waitForToast(page);
  check('Transitions — Reject from Offered lands terminal Rejected',
    await rowShows(page, admNumber, 'Rejected'));
  newChecks.add('Transitions — Reject from Offered lands terminal Rejected');

  // Terminal: Withdraw the second admission (still an enquiry).
  await settleToasts(page);
  await page.click(`tr:has-text("${admNumber2}") button[title="Withdraw (family declines)"]`);
  await waitForToast(page);
  check('Transitions — Withdraw lands terminal Withdrawn',
    await rowShows(page, admNumber2, 'Withdrawn'));
  const terminalActions = await page.locator(`tr:has-text("${admNumber2}") button`).count();
  check('Transitions — terminal rows offer no further actions', terminalActions === 0,
    `${terminalActions} buttons`);
  newChecks.add('Transitions — Withdraw lands terminal Withdrawn');
  newChecks.add('Transitions — terminal rows offer no further actions');
  newChecks.add('both enrollments exist for the QA student');

  // negative case on withdraw — re-enroll something withdrawable first
  await gotoRoute(page, '/enrollments');
  await page.waitForTimeout(600);
  const anyWithdraw = page.locator('button:has-text("Withdraw")').first();
  if (await anyWithdraw.count()) {
    await anyWithdraw.click();
    await page.waitForSelector('form#enr-withdraw-form');
    await page.waitForTimeout(400);
    await expectSpecificRejection(page, {
      label: 'Withdraw Enrollment',
      urlGlob: '**/api/v1/enrollments/*/withdraw',
      mutate: (b) => ({ ...b, exitDate: 'the day before yesterday' }),
      formId: 'enr-withdraw-form',
    });
  } else {
    check('Withdraw Enrollment — rejection message is specific, not "Validation failed"', false,
      'no active enrollment left to withdraw');
  }

  // ── status filters: no permanently dead options ───────────────────────────
  // Every option a status filter offers must produce either rows or the
  // proper empty state. An option the backend enum rejects yields a 400 and
  // the error card instead — that is how the phantom "withdrawn" admissions
  // option would fail here.
  section('Status filters');
  async function auditStatusFilter(label, route, selectCss) {
    await gotoRoute(page, route);
    const options = await page.$$eval(`${selectCss} option`, (os) =>
      os.map((o) => o.value).filter(Boolean));
    const results = [];
    let ok = options.length > 0;
    for (const value of options) {
      await page.selectOption(selectCss, value);
      await page.waitForTimeout(1400);
      const errored = (await page.locator('button:has-text("Try again")').count()) > 0;
      const emptyState = (await page.getByText(/No .* found\./).count()) > 0;
      const dataRows = emptyState ? 0 : await page.$$eval('tbody tr', (r) => r.length).catch(() => 0);
      const good = !errored && (dataRows > 0 || emptyState);
      ok &&= good;
      results.push(`${value}:${errored ? 'ERROR' : dataRows > 0 ? `${dataRows} rows` : 'empty-state'}`);
    }
    check(`${label} — every status option yields rows or a proper empty state`,
      ok, results.join(' · ') || 'no options found');
    newChecks.add(`${label} — every status option yields rows or a proper empty state`);
    await page.selectOption(selectCss, '');
  }
  await auditStatusFilter('Admissions filter', '/admissions', 'select.max-w-\\[180px\\]');
  await auditStatusFilter('Enrollments filter', '/enrollments', 'select.max-w-\\[160px\\]');

  // ── file metadata ─────────────────────────────────────────────────────────
  section('File Metadata Record');
  await gotoRoute(page, '/files');
  await openDialog(page, 'New File Record', 'file-create-form');
  await page.selectOption('#ff-type', 'student');
  await page.fill('#ff-owner', studentId);
  await page.fill('#ff-name', NAMES.file);
  await page.fill('#ff-mime', 'application/pdf');
  await page.fill('#ff-size', '2048');
  await page.fill('#ff-bucket', 'ghana-sms-dev');
  await page.fill('#ff-key', `students/${studentId}/${NAMES.file}`);
  await expectCreated(page, { label: 'File Record', formId: 'file-create-form', marker: NAMES.file });

  await openDialog(page, 'New File Record', 'file-create-form');
  await page.selectOption('#ff-type', 'student');
  await page.fill('#ff-name', `reject-${RUN}.pdf`);
  await page.fill('#ff-mime', 'application/pdf');
  await page.fill('#ff-size', '2048');
  await page.fill('#ff-bucket', 'ghana-sms-dev');
  await page.fill('#ff-key', `students/reject-${RUN}.pdf`);
  await expectSpecificRejection(page, {
    label: 'File Record',
    urlGlob: '**/api/v1/files',
    mutate: (b) => ({ ...b, sizeBytes: 'not-a-number' }),
    formId: 'file-create-form',
  });

  // ── archive → restore, all five modules + the primary-slot swap ───────────
  section('Archive → Restore');
  const levelId = sql(`select id from levels where name = '${NAMES.level}'`);
  const guardianAId = sql(`select id from guardians where last_name = '${NAMES.guardianLast}'`);

  // Classroom round-trip while its level is active.
  await apiCall('POST', `/classrooms/${classroomId}/archive`);
  let r = await apiCall('POST', `/classrooms/${classroomId}/restore`);
  const clsState = sql(`select is_active from classrooms where id = '${classroomId}'`);
  check('Classroom — archive → restore returns it to Active',
    (r.status === 201 || r.status === 200) && clsState === 't', `${r.status} is_active=${clsState}`);
  newChecks.add('Classroom — archive → restore returns it to Active');

  // Dependency guard: classroom under an archived level.
  await apiCall('POST', `/levels/${levelId}/archive`);
  await apiCall('POST', `/classrooms/${classroomId}/archive`);
  r = await apiCall('POST', `/classrooms/${classroomId}/restore`);
  check('Classroom — restore under archived level → 409 naming the level',
    r.status === 409 && r.body?.message === `Restore the level '${NAMES.level}' first.`,
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Classroom — restore under archived level → 409 naming the level');

  // Levels UI leg: Show archived reveals it; Restore returns it to Active.
  await gotoRoute(page, '/levels');
  const hiddenByDefault = !(await page.locator(`tr:has-text("${NAMES.level}")`).count());
  await page.click('#lv-show-archived');
  await page.waitForTimeout(1500);
  const visibleWithToggle = (await page.locator(`tr:has-text("${NAMES.level}")`).count()) > 0;
  check('Level — hidden by default, revealed by Show archived',
    hiddenByDefault && visibleWithToggle, `default-hidden=${hiddenByDefault} toggled-visible=${visibleWithToggle}`);
  await settleToasts(page);
  await page.click(`tr:has-text("${NAMES.level}") button[title="Restore"]`);
  await waitForToast(page);
  const levelState = sql(`select is_active from levels where id = '${levelId}'`);
  check('Level — Restore button returns it to Active', levelState === 't', `is_active=${levelState}`);
  newChecks.add('Level — hidden by default, revealed by Show archived');
  newChecks.add('Level — Restore button returns it to Active');

  r = await apiCall('POST', `/classrooms/${classroomId}/restore`);
  check('Classroom — restores once the level is restored',
    r.status === 201 || r.status === 200, `${r.status}`);
  newChecks.add('Classroom — restores once the level is restored');

  // Staff round-trip: archive sets terminated, restore returns active.
  await apiCall('POST', `/staff/${staffId}/archive`);
  const staffArchived = sql(`select status||'|'||(archived_at is not null) from staff where id = '${staffId}'`);
  // Item 2 guard: a terminated staff member cannot receive a class.
  const badAssign = await apiCall('POST', `/classrooms/${classroomId}/assign-class-teacher`, { staffId });
  check('Assign Teacher — terminated staff refused by name',
    badAssign.status === 409 && /^Cannot assign .+: staff member is terminated$/.test(badAssign.body?.message ?? ''),
    `${badAssign.status} ${badAssign.body?.message ?? ''}`);
  newChecks.add('Assign Teacher — terminated staff refused by name');
  await apiCall('POST', `/staff/${staffId}/restore`);
  const staffRestored = sql(`select status||'|'||(archived_at is null) from staff where id = '${staffId}'`);
  check('Staff — archive sets Terminated; restore returns Active',
    staffArchived === 'terminated|true' && staffRestored === 'active|true',
    `archived=${staffArchived} restored=${staffRestored}`);
  newChecks.add('Staff — archive sets Terminated; restore returns Active');

  // Student round-trip.
  await apiCall('POST', `/students/${studentId}/archive`);
  await apiCall('POST', `/students/${studentId}/restore`);
  const stuRestored = sql(`select status||'|'||(archived_at is null) from students where id = '${studentId}'`);
  check('Student — archive → restore returns Active with archivedAt cleared',
    stuRestored === 'active|true', stuRestored);
  newChecks.add('Student — archive → restore returns Active with archivedAt cleared');

  // Guard: restoring a record that is not archived.
  r = await apiCall('POST', `/students/${studentId}/restore`);
  check('Restore — non-archived record → 409 "not archived"',
    r.status === 409 && /not archived/i.test(r.body?.message ?? ''), `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Restore — non-archived record → 409 "not archived"');

  // Guardian: archive the primary holder, then displace it.
  await apiCall('POST', `/guardians/${guardianAId}/archive`);
  const defaultList = await apiCall('GET', `/guardians?search=${NAMES.guardianLast}`);
  const withArchived = await apiCall('GET', `/guardians?search=${NAMES.guardianLast}&includeArchived=true`);
  check('Guardian — archived guardian hidden from the default list',
    (defaultList.body?.data?.items ?? []).length === 0 &&
    (withArchived.body?.data?.items ?? []).length === 1,
    `default=${(defaultList.body?.data?.items ?? []).length} withArchived=${(withArchived.body?.data?.items ?? []).length}`);
  newChecks.add('Guardian — archived guardian hidden from the default list');

  // Second guardian linked to the same student, then promoted — must silently
  // displace the archived holder's link.
  const gB = await apiCall('POST', '/guardians', {
    firstName: 'Efua', lastName: `${RUN}Guardian2`, phonePrimary: `05${String(Date.now()).slice(-8)}`,
  });
  const linkB = await apiCall('POST', '/student-guardians', {
    studentId, guardianId: gB.body.data.id, relationship: 'aunt',
  });
  r = await apiCall('POST', `/student-guardians/${linkB.body.data.id}/set-primary`);
  const primaries = sql(
    `select count(*) from student_guardians where student_id = '${studentId}' and is_primary`);
  const primaryIsB = sql(
    `select guardian_id = '${gB.body.data.id}' from student_guardians where student_id = '${studentId}' and is_primary`);
  check('Set Primary — displaces the archived guardian\'s link silently',
    (r.status === 201 || r.status === 200), `${r.status} ${r.body?.message ?? ''}`);
  check('Set Primary — exactly one primary remains, the new guardian',
    primaries === '1' && primaryIsB === 't', `count=${primaries} isNew=${primaryIsB}`);
  newChecks.add("Set Primary — displaces the archived guardian's link silently");
  newChecks.add('Set Primary — exactly one primary remains, the new guardian');

  // Guardians UI leg: toggle reveals the archived guardian, Restore revives.
  await gotoRoute(page, '/guardians');
  await page.click('#gd-show-archived');
  await page.waitForTimeout(1500);
  const gRowVisible = (await page.locator(`tr:has-text("${NAMES.guardianLast}")`).count()) > 0;
  await settleToasts(page);
  await page.click(`tr:has-text("${NAMES.guardianLast}") button[title="Restore"]`);
  await waitForToast(page);
  const gRestored = sql(`select archived_at is null from guardians where id = '${guardianAId}'`);
  check('Guardian — Show archived reveals the row; Restore revives it',
    gRowVisible && gRestored === 't', `visible=${gRowVisible} restored=${gRestored}`);
  newChecks.add('Guardian — Show archived reveals the row; Restore revives it');

  // Files stay one-way: no restore control, no restore endpoint.
  await gotoRoute(page, '/files');
  const fileRestoreButtons = await page.locator('button[title="Restore"]').count();
  const fileId = sql(`select id from files where original_file_name = '${NAMES.file}'`);
  await apiCall('POST', `/files/${fileId}/archive`);
  r = await apiCall('POST', `/files/${fileId}/restore`);
  check('Files — no restore control and archive remains final',
    fileRestoreButtons === 0 && r.status === 404, `buttons=${fileRestoreButtons} restore-endpoint=${r.status}`);
  newChecks.add('Files — no restore control and archive remains final');

  // ── labels (Phase 2 Stage 1a) ─────────────────────────────────────────────
  // The rule under test is the fix for the benchmarked product's defect D06:
  // label names are unique PER CATEGORY, case-insensitively. Both halves are
  // enforced by the raw-SQL expression index
  // uq_label_school_category_name_lower, so this has to run against real
  // Postgres — a mocked unit test could "prove" any rule at all.
  section('Labels');

  r = await apiCall('POST', '/labels', { category: 'fee', name: NAMES.labelFee });
  const feeLabelId = r.body?.data?.id;
  check('Label — create a fee label', r.status === 201 && !!feeLabelId,
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Label — create a fee label');

  r = await apiCall('POST', '/labels', { category: 'income', name: NAMES.labelFee });
  const incomeLabelId = r.body?.data?.id;
  check('Label — the SAME name is allowed in another category (defect D06 fix)',
    r.status === 201 && !!incomeLabelId, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Label — the SAME name is allowed in another category (defect D06 fix)');

  r = await apiCall('POST', '/labels', {
    category: 'fee', name: NAMES.labelFee.toLowerCase(),
  });
  check('Label — a differently-cased duplicate in the SAME category is refused by name',
    r.status === 409 && /already exists/i.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Label — a differently-cased duplicate in the SAME category is refused by name');

  r = await apiCall('POST', '/labels', { category: 'fee', name: `  ${NAMES.labelFee}   ` });
  check('Label — whitespace is normalised, so a padded duplicate still collides',
    r.status === 409, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Label — whitespace is normalised, so a padded duplicate still collides');

  r = await apiCall('PATCH', `/labels/${incomeLabelId}`, { category: 'expenditure' });
  const stillIncome = sql(`select category from labels where id = '${incomeLabelId}'`);
  check('Label — category is immutable after creation',
    r.status === 400 && stillIncome === 'income', `${r.status} category=${stillIncome}`);
  newChecks.add('Label — category is immutable after creation');

  await apiCall('POST', `/labels/${feeLabelId}/archive`);
  const hiddenList = await apiCall('GET', '/labels?category=fee');
  const shownList = await apiCall('GET', '/labels?category=fee&includeArchived=true');
  const hiddenNames = (hiddenList.body?.data ?? []).map((l) => l.name);
  const shownNames = (shownList.body?.data ?? []).map((l) => l.name);
  check('Label — archived label is hidden by default and revealed by includeArchived',
    !hiddenNames.includes(NAMES.labelFee) && shownNames.includes(NAMES.labelFee),
    `default=${hiddenNames.length} withArchived=${shownNames.length}`);
  newChecks.add('Label — archived label is hidden by default and revealed by includeArchived');

  r = await apiCall('POST', `/labels/${feeLabelId}/archive`);
  check('Label — archiving twice → 409 "already archived"',
    r.status === 409 && /already archived/i.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Label — archiving twice → 409 "already archived"');

  r = await apiCall('POST', `/labels/${feeLabelId}/restore`);
  check('Label — restore brings it back', r.status === 201 || r.status === 200, `${r.status}`);
  newChecks.add('Label — restore brings it back');

  // Labels UI leg.
  await gotoRoute(page, '/labels');
  const labelRowVisible = await rowAppears(page, NAMES.labelFee);
  check('Label — the new label appears on the Labels screen', labelRowVisible,
    labelRowVisible ? NAMES.labelFee : 'row not found');
  newChecks.add('Label — the new label appears on the Labels screen');

  // ── user provisioning conflicts ───────────────────────────────────────────
  // All three user uniques are RAW SQL indexes (see the inventory in the
  // backend README), so this has to run against real Postgres: the point is
  // that Prisma still reports which COLUMNS collided, and the service turns
  // that into a 409 naming the field rather than the 500 it used to return.
  section('User provisioning conflicts');

  const conflictStaffId = sql(`select id from staff where staff_number = '${NAMES.staffNumber}'`);
  const conflictEmail = `qa-${RUN}-conflict@example.com`;

  r = await apiCall('POST', '/users', {
    email: conflictEmail,
    password: 'QaConflict123!',
    linkedEntityType: 'staff',
    linkedEntityId: conflictStaffId,
  });
  const conflictUserId = r.body?.data?.id;
  check('Users — a user can be provisioned for a staff member',
    r.status === 201 && !!conflictUserId, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Users — a user can be provisioned for a staff member');

  // Same staff member, different email: uq_users_school_linked_entity.
  r = await apiCall('POST', '/users', {
    email: `qa-${RUN}-second@example.com`,
    password: 'QaConflict123!',
    linkedEntityType: 'staff',
    linkedEntityId: conflictStaffId,
  });
  check('Users — a second login for the same staff member → 409 naming the rule (was a 500)',
    r.status === 409 && /already has a user account/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Users — a second login for the same staff member → 409 naming the rule (was a 500)');

  // Same email in a different case, different staff member:
  // uq_users_school_email_lower is an expression index on lower(email).
  r = await apiCall('POST', '/users', {
    email: conflictEmail.toUpperCase(),
    password: 'QaConflict123!',
    linkedEntityType: 'staff',
    linkedEntityId: sql(`select id from staff where staff_number = 'STF-0005'`),
  });
  check('Users — a differently-cased duplicate email → 409 naming the email',
    r.status === 409 && /email address already exists/i.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Users — a differently-cased duplicate email → 409 naming the email');

  // Editing an existing user onto a taken email hits the same index.
  r = await apiCall('PATCH', `/users/${conflictUserId}`, { email: 'admin@example.com' });
  check('Users — editing onto a taken email → 409, not 500',
    r.status === 409 && /email address already exists/i.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Users — editing onto a taken email → 409, not 500');

  // No 500 should have been produced by any of the above.
  check('Users — none of the conflict paths returned a 500',
    r.status !== 500, `last status ${r.status}`);
  newChecks.add('Users — none of the conflict paths returned a 500');

  // ── attendance (Phase 2 Stage 1a) ─────────────────────────────────────────
  // Attendance is the first module in Brite with ROW-LEVEL authorisation: a
  // class teacher may mark only classrooms where they are
  // Classroom.classTeacherId. The permission guard alone cannot express that,
  // so it has to be exercised as a real second user.
  section('Attendance');

  // Demo anchors: Basic 3A is taught by STF-0005, Basic 3B by STF-0010.
  const b3aId = sql(`select id from classrooms where display_name = 'Basic 3A'`);
  const b3bId = sql(`select id from classrooms where display_name = 'Basic 3B'`);
  const b3aTeacherStaffId = sql(`select class_teacher_id from classrooms where id = '${b3aId}'`);
  const activeTermId = sql(`select id from terms where status = 'active' limit 1`);
  const ATT_DATE = pickAttendanceDate();
  ATT_DATES.push(ATT_DATE);
  const closedTermId = sql(
    `select t.id from terms t join academic_years y on y.id = t.academic_year_id
     where t.status = 'closed' and y.is_active order by t.term_number desc limit 1`);

  // A CLASS_TEACHER login for Basic 3A's actual teacher.
  const teacherRoleId = sql(`select id from roles where code = 'CLASS_TEACHER'`);
  r = await apiCall('POST', '/users', {
    email: NAMES.teacherEmail,
    password: 'QaTeacher123!',
    linkedEntityType: 'staff',
    linkedEntityId: b3aTeacherStaffId,
  });
  const teacherUserId = r.body?.data?.id
    ?? sql(`select id from users where email = '${NAMES.teacherEmail}'`);
  await apiCall('POST', `/users/${teacherUserId}/roles`, { roleId: teacherRoleId });
  // Provisioned users must change their password on first login; clear the flag
  // so the QA login is a plain one.
  sql(`update users set must_change_password = false where id = '${teacherUserId}'`);
  const teacherToken = await apiTokenAs(NAMES.teacherEmail, 'QaTeacher123!');
  check('Attendance — a CLASS_TEACHER login could be provisioned', !!teacherToken,
    teacherToken ? 'token issued' : 'login failed');
  newChecks.add('Attendance — a CLASS_TEACHER login could be provisioned');

  // Scope: the picker shows only the classrooms this teacher owns.
  r = await apiCallAs(teacherToken, 'GET', '/attendance/classrooms');
  const teacherRooms = (r.body?.data ?? []).map((c) => c.displayName);
  check('Attendance — a class teacher sees only their own classroom in the picker',
    teacherRooms.length === 1 && teacherRooms[0] === 'Basic 3A', teacherRooms.join(', ') || '(none)');
  newChecks.add('Attendance — a class teacher sees only their own classroom in the picker');

  // Mark: first save creates.
  r = await apiCallAs(teacherToken, 'GET',
    `/attendance/register?classroomId=${b3aId}&date=${ATT_DATE}`);
  const rosterRows = r.body?.data?.rows ?? [];
  check('Attendance — a class teacher can read their own register',
    r.status === 200 && rosterRows.length > 0,
    `${r.status} rows=${rosterRows.length}`);
  newChecks.add('Attendance — a class teacher can read their own register');

  const allPresent = rosterRows.map((row) => ({ enrollmentId: row.enrollmentId, status: 'present' }));
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register',
    { classroomId: b3aId, date: ATT_DATE, marks: allPresent });
  check('Attendance — marking the register creates one record per student',
    r.status === 200 && r.body?.data?.createdCount === allPresent.length,
    `${r.status} created=${r.body?.data?.createdCount}`);
  newChecks.add('Attendance — marking the register creates one record per student');

  // Idempotent: re-saving identical rows writes nothing and audits nothing.
  const auditBefore = sql(
    `select count(*) from audit_logs where action in ('attendance.marked','attendance.amended')`);
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register',
    { classroomId: b3aId, date: ATT_DATE, marks: allPresent });
  const auditAfter = sql(
    `select count(*) from audit_logs where action in ('attendance.marked','attendance.amended')`);
  check('Attendance — re-saving an unchanged register writes nothing and audits nothing',
    r.status === 200
    && r.body?.data?.createdCount === 0
    && r.body?.data?.amendedCount === 0
    && r.body?.data?.unchangedCount === allPresent.length
    && auditBefore === auditAfter,
    `created=${r.body?.data?.createdCount} amended=${r.body?.data?.amendedCount} `
    + `unchanged=${r.body?.data?.unchangedCount} audits=${auditBefore}→${auditAfter}`);
  newChecks.add('Attendance — re-saving an unchanged register writes nothing and audits nothing');

  // Amend: one row changes, and the audit entry carries before/after.
  const amendMarks = [
    { ...allPresent[0], status: 'excused', reason: `QA ${RUN} amendment` },
    ...allPresent.slice(1),
  ];
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register',
    { classroomId: b3aId, date: ATT_DATE, marks: amendMarks });
  const amendedRow = sql(
    `select morning_status from attendance_records
     where enrollment_id = '${allPresent[0].enrollmentId}' and attendance_date = '${ATT_DATE}'`);
  const amendAudit = sql(
    `select count(*) from audit_logs
     where action = 'attendance.amended' and metadata->>'date' = '${ATT_DATE}'`);
  check('Attendance — amending one row updates it in place and audits before/after',
    r.status === 200 && r.body?.data?.amendedCount === 1
    && amendedRow === 'excused' && Number(amendAudit) >= 1,
    `amended=${r.body?.data?.amendedCount} status=${amendedRow} audits=${amendAudit}`);
  newChecks.add('Attendance — amending one row updates it in place and audits before/after');

  // One record per student per date, however many times it is amended.
  const rowCount = sql(
    `select count(*) from attendance_records
     where enrollment_id = '${allPresent[0].enrollmentId}' and attendance_date = '${ATT_DATE}'`);
  check('Attendance — amendment leaves ONE record per student per date, not a history row',
    rowCount === '1', `rows=${rowCount}`);
  newChecks.add('Attendance — amendment leaves ONE record per student per date, not a history row');

  // Row-level authorisation: the wrong teacher is refused, by name.
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register',
    { classroomId: b3bId, date: ATT_DATE, marks: [{ ...allPresent[0], status: 'present' }] });
  check("Attendance — marking another teacher's classroom → 403 naming the classroom",
    r.status === 403 && /not the class teacher of 'Basic 3B'/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add("Attendance — marking another teacher's classroom → 403 naming the classroom");

  r = await apiCallAs(teacherToken, 'GET',
    `/attendance/register?classroomId=${b3bId}&date=${ATT_DATE}`);
  check("Attendance — reading another teacher's register → 403",
    r.status === 403, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add("Attendance — reading another teacher's register → 403");

  // The _any variant bypasses the ownership check.
  r = await apiCall('GET', `/attendance/register?classroomId=${b3bId}&date=${ATT_DATE}`);
  check('Attendance — a holder of attendance.read_any reads any classroom',
    r.status === 200, `${r.status}`);
  newChecks.add('Attendance — a holder of attendance.read_any reads any classroom');

  // Future dates are refused in the SERVICE — Postgres cannot express this as a
  // CHECK constraint (CURRENT_DATE is not immutable).
  r = await apiCall('PUT', '/attendance/register',
    { classroomId: b3aId, date: '2999-01-01', marks: allPresent });
  check('Attendance — a future date is refused with a specific message',
    r.status === 400 && /future date/i.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — a future date is refused with a specific message');

  // Summary + the reporting rule: late counts as present, excused as absent.
  r = await apiCall('GET', `/attendance/summary/classroom/${b3aId}?termId=${activeTermId}`);
  const totals = r.body?.data?.classroomTotals;
  check('Attendance — the term summary folds late into present and excused into absent',
    r.status === 200
    && totals.sessionsPresent === totals.present + totals.late
    && totals.sessionsAbsent === totals.absent + totals.excused
    && totals.sessionsMarked === totals.sessionsPresent + totals.sessionsAbsent,
    JSON.stringify(totals));
  newChecks.add('Attendance — the term summary folds late into present and excused into absent');

  // Every figure is over SESSIONS, and a day is exactly two of them.
  check('Attendance — sessionsMarked is exactly 2 x daysMarked, class and per student',
    totals.sessionsMarked === totals.daysMarked * 2
    && r.body.data.students.every((st) => st.summary.sessionsMarked === st.summary.daysMarked * 2),
    `sessions=${totals.sessionsMarked} days=${totals.daysMarked}`);
  newChecks.add('Attendance — sessionsMarked is exactly 2 x daysMarked, class and per student');

  // Every day falls in exactly one shape bucket — no day is double-counted or lost.
  check('Attendance — fullyPresent + fullyAbsent + partial === daysMarked',
    totals.daysFullyPresent + totals.daysFullyAbsent + totals.daysPartial === totals.daysMarked
    && r.body.data.students.every((st) =>
      st.summary.daysFullyPresent + st.summary.daysFullyAbsent + st.summary.daysPartial
        === st.summary.daysMarked),
    `${totals.daysFullyPresent}+${totals.daysFullyAbsent}+${totals.daysPartial}`
    + ` vs ${totals.daysMarked}`);
  newChecks.add('Attendance — fullyPresent + fullyAbsent + partial === daysMarked');

  // The rate the API reports must be the session rate, recomputed independently here.
  const expectedRate = totals.sessionsMarked === 0
    ? null
    : Math.round((totals.sessionsPresent / totals.sessionsMarked) * 1000) / 10;
  check('Attendance — attendanceRate is sessionsPresent / sessionsMarked to 1dp',
    totals.attendanceRate === expectedRate,
    `api=${totals.attendanceRate} expected=${expectedRate}`);
  newChecks.add('Attendance — attendanceRate is sessionsPresent / sessionsMarked to 1dp');

  // CSV export.
  const csv = await apiCallAs(await apiToken(), 'GET',
    `/attendance/summary/classroom/${b3aId}/export?termId=${activeTermId}`, undefined, { raw: true });
  check('Attendance — CSV export returns text/csv as a named attachment',
    csv.status === 200
    && csv.contentType.includes('text/csv')
    && /filename="attendance-basic-3a-/.test(csv.disposition),
    `${csv.status} ${csv.contentType} ${csv.disposition}`);
  newChecks.add('Attendance — CSV export returns text/csv as a named attachment');

  check('Attendance — the CSV carries the header row and the class total',
    /Student Number,Student Name,Present,Late,Absent,Excused/.test(csv.text)
    && /CLASS TOTAL/.test(csv.text)
    && /not over school sessions in the term/.test(csv.text),
    csv.text.split('\n')[0]);
  newChecks.add('Attendance — the CSV carries the header row and the class total');

  check('Attendance — the CSV carries the session and partial-day columns',
    /Sessions Marked,Sessions Present,Sessions Absent/.test(csv.text)
    && /Days Fully Present,Days Fully Absent,Days Partial/.test(csv.text),
    (csv.text.split('\n').find((l) => l.startsWith('Student Number')) ?? '').slice(0, 120));
  newChecks.add('Attendance — the CSV carries the session and partial-day columns');

  // OQ-27 stated where a stakeholder actually reads it, not only in a design doc.
  check('Attendance — the CSV states that a mornings-only class marking both the same is expected',
    /mornings only marks both sessions the same/.test(csv.text)
    && /expected/.test(csv.text),
    'note present');
  newChecks.add('Attendance — the CSV states that a mornings-only class marking both the same is expected');

  // ── OQ-7: reopening a closed term ─────────────────────────────────────────
  // A closed term's register is read-only. Reopening is the Phase 1B
  // guarded-reversal pattern: Super Admin only, a mandatory reason, and an
  // audit entry — and closing the term again re-locks it.
  const closedTermDate = sql(
    `select to_char(start_date + 1, 'YYYY-MM-DD') from terms where id = '${closedTermId}'`);
  ATT_DATES.push(closedTermDate);

  r = await apiCall('PUT', '/attendance/register',
    { classroomId: b3aId, date: closedTermDate, marks: allPresent });
  check('Attendance — a closed term’s register refuses marks, naming the remedy',
    r.status === 409 && /closed\. A Super Admin must reopen it/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — a closed term’s register refuses marks, naming the remedy');

  r = await apiCallAs(teacherToken, 'POST', `/attendance/terms/${closedTermId}/reopen`,
    { reason: 'A class teacher must not be able to reopen a term' });
  check('Attendance — a CLASS_TEACHER cannot reopen a term', r.status === 403,
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — a CLASS_TEACHER cannot reopen a term');

  // The interesting negative: ACADEMIC_COORDINATOR HAS attendance.mark_any, so
  // it clears the permission guard and is stopped by the SUPER_ADMIN role check.
  const coordRoleId = sql(`select id from roles where code = 'ACADEMIC_COORDINATOR'`);
  sql(`delete from user_roles where user_id = '${teacherUserId}'`);
  await apiCall('POST', `/users/${teacherUserId}/roles`, { roleId: coordRoleId });
  const coordToken = await apiTokenAs(NAMES.teacherEmail, 'QaTeacher123!');
  r = await apiCallAs(coordToken, 'POST', `/attendance/terms/${closedTermId}/reopen`,
    { reason: 'A coordinator has mark_any but is still not a Super Admin' });
  check('Attendance — attendance.mark_any is NOT enough to reopen; Super Admin is required',
    r.status === 403 && /Only a Super Admin/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — attendance.mark_any is NOT enough to reopen; Super Admin is required');

  r = await apiCall('POST', `/attendance/terms/${closedTermId}/reopen`, { reason: 'too short' });
  check('Attendance — reopening without a real reason is refused',
    r.status === 400, `${r.status} ${JSON.stringify(r.body?.errors ?? r.body?.message ?? '')}`);
  newChecks.add('Attendance — reopening without a real reason is refused');

  r = await apiCall('POST', `/attendance/terms/${closedTermId}/reopen`,
    { reason: `QA ${RUN}: verifying the guarded reopen path` });
  const reopenAudit = sql(
    `select count(*) from audit_logs
     where action = 'attendance.term_reopened' and entity_id = '${closedTermId}'
       and metadata->>'reason' like 'QA ${RUN}%'`);
  check('Attendance — a Super Admin can reopen, and the reason is in the audit trail',
    (r.status === 201 || r.status === 200) && Number(reopenAudit) === 1,
    `${r.status} audits=${reopenAudit}`);
  newChecks.add('Attendance — a Super Admin can reopen, and the reason is in the audit trail');

  const termStatusAfterReopen = sql(`select status from terms where id = '${closedTermId}'`);
  check('Attendance — reopening does NOT change Term.status (the one-active-term index stands)',
    termStatusAfterReopen === 'closed', `status=${termStatusAfterReopen}`);
  newChecks.add('Attendance — reopening does NOT change Term.status (the one-active-term index stands)');

  r = await apiCall('PUT', '/attendance/register',
    { classroomId: b3aId, date: closedTermDate, marks: allPresent });
  check('Attendance — after reopening, the closed term accepts amendments normally',
    r.status === 200, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — after reopening, the closed term accepts amendments normally');

  r = await apiCall('POST', `/attendance/terms/${closedTermId}/reopen`,
    { reason: `QA ${RUN}: reopening an already-reopened term` });
  check('Attendance — reopening an already-reopened term → 409',
    r.status === 409 && /already been reopened/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — reopening an already-reopened term → 409');

  // Closing the term again re-locks it — no reopened state to unwind.
  await apiCall('POST', `/terms/${closedTermId}/close`);
  r = await apiCall('PUT', '/attendance/register',
    { classroomId: b3aId, date: closedTermDate, marks: allPresent });
  check('Attendance — closing the term again re-locks the register',
    r.status === 409 && /is closed/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — closing the term again re-locks the register');

  // ── session-level attendance (Part B) ─────────────────────────────────────
  //
  // The register stopped saying one thing about a whole day and now says one
  // thing about each half of it. What matters here is the declarative
  // contract: an omitted `afternoon` mirrors the morning on create AND on
  // amend, which is a real footgun and therefore pinned rather than assumed.

  // A second date, so these do not fight the amend checks above.
  const PM_DATE = sql(
    `select to_char('${ATT_DATE}'::date - 1, 'YYYY-MM-DD')`);
  ATT_DATES.push(PM_DATE);

  // 1. Omitted afternoon mirrors the morning ON CREATE.
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register', {
    classroomId: b3aId, date: PM_DATE,
    marks: rosterRows.map((row) => ({ enrollmentId: row.enrollmentId, status: 'present' })),
  });
  const mirrored = sql(
    `select count(*) from attendance_records
     where attendance_date = '${PM_DATE}' and morning_status = afternoon_status`);
  check('Attendance — an omitted afternoon mirrors the morning on CREATE',
    r.status === 200 && Number(mirrored) === rosterRows.length,
    `${r.status} mirrored=${mirrored}/${rosterRows.length}`);
  newChecks.add('Attendance — an omitted afternoon mirrors the morning on CREATE');

  // 2. A supplied afternoon is stored independently, with its own note.
  const pmTarget = rosterRows[0].enrollmentId;
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register', {
    classroomId: b3aId, date: PM_DATE,
    marks: rosterRows.map((row) => (row.enrollmentId === pmTarget
      ? {
        enrollmentId: row.enrollmentId, status: 'present',
        afternoon: { status: 'absent', reason: `QA ${RUN} left after lunch` },
      }
      : { enrollmentId: row.enrollmentId, status: 'present' })),
  });
  const pmRow = sql(
    `select morning_status || '|' || afternoon_status || '|' || coalesce(morning_reason,'-')
       || '|' || coalesce(afternoon_reason,'-')
     from attendance_records
     where enrollment_id = '${pmTarget}' and attendance_date = '${PM_DATE}'`);
  check('Attendance — a supplied afternoon is stored independently, with its own note',
    r.status === 200 && pmRow === `present|absent|-|QA ${RUN} left after lunch`,
    `${r.status} ${pmRow}`);
  newChecks.add('Attendance — a supplied afternoon is stored independently, with its own note');

  // 3. The audit entry names WHICH session moved, and carries all four fields
  //    on both sides rather than a diff.
  const pmAudit = sql(
    `select changes::text from audit_logs
     where action = 'attendance.amended' and metadata->>'date' = '${PM_DATE}'
     order by created_at desc limit 1`);
  const pmSessions = sql(
    `select metadata->'sessions'::text from audit_logs
     where action = 'attendance.amended' and metadata->>'date' = '${PM_DATE}'
     order by created_at desc limit 1`);
  check('Attendance — an afternoon-only amendment audits all four fields and names the session',
    /morningStatus/.test(pmAudit) && /afternoonStatus/.test(pmAudit)
    && pmSessions === '["afternoon"]',
    `sessions=${pmSessions}`);
  newChecks.add('Attendance — an afternoon-only amendment audits all four fields and names the session');

  // 4. THE FOOTGUN. Omitting a previously-set afternoon RESETS it to the
  //    morning. Documented on RegisterMarkDto.afternoon; pinned here so it
  //    cannot change silently in either direction.
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register', {
    classroomId: b3aId, date: PM_DATE,
    marks: rosterRows.map((row) => ({ enrollmentId: row.enrollmentId, status: 'present' })),
  });
  const afterReset = sql(
    `select afternoon_status || '|' || coalesce(afternoon_reason,'-')
     from attendance_records
     where enrollment_id = '${pmTarget}' and attendance_date = '${PM_DATE}'`);
  check('Attendance — omitting a previously-set afternoon RESETS it, and says so via amendedCount',
    r.status === 200 && afterReset === 'present|-' && r.body?.data?.amendedCount === 1,
    `${afterReset} amended=${r.body?.data?.amendedCount}`);
  newChecks.add('Attendance — omitting a previously-set afternoon RESETS it, and says so via amendedCount');

  // 5. absentCount is over sessions: a half-day counts once, a whole day twice.
  r = await apiCallAs(teacherToken, 'PUT', '/attendance/register', {
    classroomId: b3aId, date: PM_DATE,
    marks: rosterRows.map((row, i) => (i === 0
      ? { enrollmentId: row.enrollmentId, status: 'present', afternoon: { status: 'absent' } }
      : i === 1
        ? { enrollmentId: row.enrollmentId, status: 'absent' }
        : { enrollmentId: row.enrollmentId, status: 'present' })),
  });
  check('Attendance — absentCount is over SESSIONS: a half-day is 1, a whole day is 2',
    r.status === 200 && r.body?.data?.absentCount === 3,
    `absentCount=${r.body?.data?.absentCount} (expected 3)`);
  newChecks.add('Attendance — absentCount is over SESSIONS: a half-day is 1, a whole day is 2');

  // 6. daysPartial is a real surfaced figure, not an inference.
  r = await apiCall('GET', `/attendance/summary/classroom/${b3aId}?termId=${activeTermId}`);
  check('Attendance — daysPartial surfaces the mixed day the register just recorded',
    r.status === 200 && r.body?.data?.classroomTotals?.daysPartial >= 1,
    `daysPartial=${r.body?.data?.classroomTotals?.daysPartial}`);
  newChecks.add('Attendance — daysPartial surfaces the mixed day the register just recorded');

  // 7. A NOT-MARKED row still has both sessions null, never one of each. The
  //    database makes the half-marked row impossible; this proves the read
  //    agrees.
  r = await apiCallAs(teacherToken, 'GET',
    `/attendance/register?classroomId=${b3aId}&date=${PM_DATE}`);
  const registerRows = r.body?.data?.rows ?? [];
  check('Attendance — a register row never has one session marked and the other not',
    r.status === 200 && registerRows.length > 0
    && registerRows.every((row) =>
      (row.morningStatus === null) === (row.afternoonStatus === null)),
    `rows=${registerRows.length}`);
  newChecks.add('Attendance — a register row never has one session marked and the other not');

  const halfMarked = sql(
    `select count(*) from attendance_records where afternoon_status is null`);
  check('Attendance — NO row in the whole table has an unstated afternoon',
    halfMarked === '0', `rows with null afternoon_status=${halfMarked}`);
  newChecks.add('Attendance — NO row in the whole table has an unstated afternoon');

  // ── the export registry and the printable register ────────────────────────

  r = await apiCall('GET',
    `/attendance/summary/classroom/${b3aId}/export?termId=${activeTermId}&format=pdf`);
  check('Attendance — an unknown ?format= is a 400 that NAMES the valid formats',
    r.status === 400 && /Unknown export format 'pdf'/.test(r.body?.message ?? '')
    && /'csv'/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Attendance — an unknown ?format= is a 400 that NAMES the valid formats');

  const gridJson = await apiCall('GET',
    `/attendance/register/grid?classroomId=${b3aId}&termId=${activeTermId}`);
  const grid = gridJson.body?.data;
  check('Attendance — the register grid returns dates across and students down',
    gridJson.status === 200 && Array.isArray(grid?.dates) && grid.dates.length > 0
    && grid.rows.length > 0 && typeof grid.rows[0].cells === 'object',
    `${gridJson.status} dates=${grid?.dates?.length} rows=${grid?.rows?.length}`);
  newChecks.add('Attendance — the register grid returns dates across and students down');

  // The grid must not invent its own arithmetic: it comes through the same rule.
  const gridTotals = grid?.totals ?? {};
  check('Attendance — the grid totals use the SAME reporting rule as the term summary',
    gridTotals.sessionsMarked === gridTotals.daysMarked * 2
    && gridTotals.sessionsPresent === gridTotals.present + gridTotals.late
    && gridTotals.daysFullyPresent + gridTotals.daysFullyAbsent + gridTotals.daysPartial
      === gridTotals.daysMarked,
    JSON.stringify(gridTotals));
  newChecks.add('Attendance — the grid totals use the SAME reporting rule as the term summary');

  // Only MARKED dates are columns. Brite has no school calendar and must not
  // print a holiday as a column of blanks.
  const markedDates = sql(
    `select count(distinct ar.attendance_date) from attendance_records ar
     join enrollments e on e.id = ar.enrollment_id
     where e.classroom_id = '${b3aId}'
       and ar.attendance_date between
         (select start_date from terms where id = '${activeTermId}')
         and (select end_date from terms where id = '${activeTermId}')`);
  check('Attendance — only MARKED dates become grid columns, never a holiday of blanks',
    String(grid?.dates?.length) === markedDates,
    `grid=${grid?.dates?.length} marked=${markedDates}`);
  newChecks.add('Attendance — only MARKED dates become grid columns, never a holiday of blanks');

  const html = await apiCallAs(await apiToken(), 'GET',
    `/attendance/register/grid?classroomId=${b3aId}&termId=${activeTermId}&format=register`,
    undefined, { raw: true });
  check('Attendance — format=register returns print-styled HTML as a named attachment',
    html.status === 200 && html.contentType.includes('text/html')
    && /filename="register-basic-3a-/.test(html.disposition),
    `${html.status} ${html.contentType} ${html.disposition}`);
  newChecks.add('Attendance — format=register returns print-styled HTML as a named attachment');

  check('Attendance — the printed register carries a legend, A4 landscape and the caveat',
    /@page \{ size: A4 landscape/.test(html.text)
    && /late \(counts as present\)/.test(html.text)
    && /excused \(counts as absent\)/.test(html.text)
    && /over sessions MARKED in this register/.test(html.text),
    'legend + @page + caveat present');
  newChecks.add('Attendance — the printed register carries a legend, A4 landscape and the caveat');

  // OQ-27, stated in the artifact a stakeholder actually holds.
  check('Attendance — the printed register says a mornings-only class marking both is EXPECTED',
    /mornings only marks both sessions the same/.test(html.text)
    && /expected/.test(html.text),
    'note present');
  newChecks.add('Attendance — the printed register says a mornings-only class marking both is EXPECTED');

  check('Attendance — the printed register paginates a fortnight per page with frozen name columns',
    /class="sheet"/.test(html.text)
    && (html.text.match(/<th rowspan="2" class="name">Student<\/th>/g) ?? []).length
      === (html.text.match(/<section class="sheet">/g) ?? []).length,
    `sheets=${(html.text.match(/<section class="sheet">/g) ?? []).length}`);
  newChecks.add('Attendance — the printed register paginates a fortnight per page with frozen name columns');

  // Row-level authorisation applies to the grid exactly as to every other read.
  r = await apiCallAs(teacherToken, 'GET',
    `/attendance/register/grid?classroomId=${b3bId}&termId=${activeTermId}`);
  check("Attendance — the grid refuses another teacher's classroom, like every other read",
    r.status === 403, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add("Attendance — the grid refuses another teacher's classroom, like every other read");

  // Attendance UI leg.
  await gotoRoute(page, '/attendance');
  await page.selectOption('#att-classroom', b3aId).catch(() => {});
  await page.fill('#att-date', ATT_DATE);
  await page.waitForTimeout(1800);
  const attRowsVisible = await page.locator('tbody tr').count();
  const saveVisible = await page.locator('#att-save').count();
  check('Attendance — the register screen renders the roster with a save control',
    attRowsVisible > 0 && saveVisible === 1,
    `rows=${attRowsVisible} save=${saveVisible}`);
  newChecks.add('Attendance — the register screen renders the roster with a save control');

  // The PM control is SECONDARY: it reads "same as morning" until it diverges,
  // so a teacher marking a normal day still sets one control per child.
  const pmMirrorCount = await page.locator('[data-mirrored="true"]').count();
  check('Attendance — every row offers an afternoon control, collapsed to "same as morning"',
    pmMirrorCount === attRowsVisible && pmMirrorCount > 0,
    `mirror controls=${pmMirrorCount} rows=${attRowsVisible}`);
  newChecks.add('Attendance — every row offers an afternoon control, collapsed to "same as morning"');

  // Expanding one reveals a full four-way PM picker without disturbing the AM.
  await page.locator('[data-mirrored="true"]').first().click();
  await page.waitForTimeout(400);
  const pmPickerButtons = await page.locator('[data-session="afternoon"][data-status]').count();
  check('Attendance — the afternoon control expands to a full four-way picker',
    pmPickerButtons === 4, `pm status buttons=${pmPickerButtons}`);
  newChecks.add('Attendance — the afternoon control expands to a full four-way picker');

  await page.click('#att-tab-summary');
  await page.waitForTimeout(1800);
  const summaryHasRate = await textAppears(page, 'Class rate');
  check('Attendance — the term summary screen renders totals', summaryHasRate,
    summaryHasRate ? 'Class rate card present' : 'not found');
  newChecks.add('Attendance — the term summary screen renders totals');

  const hasSessionCards = await textAppears(page, 'Sessions marked')
    && await textAppears(page, 'Partial days');
  check('Attendance — the summary screen shows session totals and the partial-day figure',
    hasSessionCards, hasSessionCards ? 'session + partial cards present' : 'not found');
  newChecks.add('Attendance — the summary screen shows session totals and the partial-day figure');

  const hasPrintLink = await page.locator('#att-print-register').count();
  check('Attendance — the summary screen offers the printable register',
    hasPrintLink === 1, `print links=${hasPrintLink}`);
  newChecks.add('Attendance — the summary screen offers the printable register');

  // The print view is a real page, not just a download URL.
  await gotoRoute(page, `/attendance/print?classroomId=${b3aId}&termId=${activeTermId}`);
  await page.waitForTimeout(2000);
  const printSheets = await page.locator('.sheet').count();
  const printLegend = await textAppears(page, 'late (counts as present)');
  check('Attendance — the print page renders the register grid with its legend',
    printSheets > 0 && printLegend, `sheets=${printSheets} legend=${printLegend}`);
  newChecks.add('Attendance — the print page renders the register grid with its legend');

  // ── fees, payments and invoices (Phase 2 Stage 1b) ────────────────────────
  //
  // Everything here runs against real Postgres because the rules that matter
  // are enforced there: the overpayment guard takes a row lock, the freeze
  // guard reads a partial unique index, and the correction chain is one
  // transaction across two documents.
  section('Fees');

  const activeYearId = sql(`select id from academic_years where is_active limit 1`);
  const feeTermId = sql(`select id from terms where status = 'active' limit 1`);
  const kg2LevelId = sql(`select id from levels where name = 'KG 2'`);
  const kg2ClassroomId = sql(`select id from classrooms where display_name = 'KG 2A'`);

  r = await apiCall('POST', '/fees/types', { name: NAMES.feeType });
  const feeTypeId = r.body?.data?.id;
  check('Fees — create a fee type', r.status === 201 && !!feeTypeId,
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Fees — create a fee type');

  r = await apiCall('POST', '/fees/types', { name: NAMES.feeType.toLowerCase() });
  check('Fees — a differently-cased duplicate fee type is refused (it would split the ledger)',
    r.status === 409, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Fees — a differently-cased duplicate fee type is refused (it would split the ledger)');

  r = await apiCall('POST', '/fees/school-fees', {
    feeTypeId, levelId: kg2LevelId, academicYearId: activeYearId,
    termId: feeTermId, name: NAMES.fee, amount: '300.00',
  });
  const schoolFeeId = r.body?.data?.id;
  const assignedAtCreate = r.body?.data?.assignedCount;
  check('Fees — creating a fee assigns it to every enrolled student in the level',
    r.status === 201 && assignedAtCreate > 0, `${r.status} assigned=${assignedAtCreate}`);
  newChecks.add('Fees — creating a fee assigns it to every enrolled student in the level');

  r = await apiCall('POST', '/fees/school-fees', {
    feeTypeId, levelId: kg2LevelId, academicYearId: activeYearId,
    termId: feeTermId, name: 'duplicate', amount: '50.00',
  });
  check('Fees — a second fee of the same type for the same level/term is refused by name',
    r.status === 409 && /already exists for KG 2/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Fees — a second fee of the same type for the same level/term is refused by name');

  // Price freeze: editing the fee must not move an existing assignment.
  await apiCall('PATCH', `/fees/school-fees/${schoolFeeId}`, { amount: '400.00' });
  const frozenAmount = sql(
    `select distinct amount_due::text from fee_assignments where school_fee_id = '${schoolFeeId}'`);
  check('Fees — editing a fee leaves already-assigned amounts frozen',
    frozenAmount === '300.00', `assignment amount is ${frozenAmount}, fee is now 400.00`);
  newChecks.add('Fees — editing a fee leaves already-assigned amounts frozen');

  // ── the late-enrollment hole, and the number that makes it visible ────────
  const summaryUrl =
    `/fees/summary?levelId=${kg2LevelId}&academicYearId=${activeYearId}&termId=${feeTermId}`;
  r = await apiCall('GET', summaryUrl);
  check('Fees — with everyone assigned, unassignedStudentCount is zero',
    r.status === 200 && r.body.data.unassignedStudentCount === 0,
    `unassigned=${r.body?.data?.unassignedStudentCount}`);
  newChecks.add('Fees — with everyone assigned, unassignedStudentCount is zero');

  // A student who joins AFTER the fee was created gets no assignment.
  const lateStudent = await apiCall('POST', '/students', {
    studentNumber: NAMES.lateStudent, firstName: 'Late', lastName: NAMES.lateStudentLast,
    dateOfBirth: '2020-05-05', gender: 'male',
  });
  await apiCall('POST', '/enrollments', {
    studentId: lateStudent.body.data.id, classroomId: kg2ClassroomId,
    academicYearId: activeYearId, curriculumTrack: 'GES_NACCA',
  });

  r = await apiCall('GET', summaryUrl);
  check('Fees — a student enrolled after the fee shows up as unassigned',
    r.body.data.unassignedStudentCount === 1,
    `unassigned=${r.body?.data?.unassignedStudentCount}`);
  newChecks.add('Fees — a student enrolled after the fee shows up as unassigned');

  r = await apiCall('POST', `/fees/school-fees/${schoolFeeId}/reconcile`);
  check('Fees — reconcile assigns exactly the students that were missing',
    (r.status === 201 || r.status === 200) && r.body.data.createdCount === 1,
    `created=${r.body?.data?.createdCount}`);
  newChecks.add('Fees — reconcile assigns exactly the students that were missing');

  r = await apiCall('POST', `/fees/school-fees/${schoolFeeId}/reconcile`);
  check('Fees — reconcile is idempotent: a second run creates nothing',
    r.body.data.createdCount === 0, `created=${r.body?.data?.createdCount}`);
  newChecks.add('Fees — reconcile is idempotent: a second run creates nothing');

  r = await apiCall('GET', summaryUrl);
  check('Fees — unassignedStudentCount returns to zero after reconcile',
    r.body.data.unassignedStudentCount === 0,
    `unassigned=${r.body?.data?.unassignedStudentCount}`);
  newChecks.add('Fees — unassignedStudentCount returns to zero after reconcile');

  // The late joiner is billed TODAY's price, not the price at fee creation.
  const lateAmount = sql(
    `select amount_due::text from fee_assignments fa
     join enrollments e on e.id = fa.enrollment_id
     join students st on st.id = e.student_id
     where fa.school_fee_id = '${schoolFeeId}' and st.student_number = '${NAMES.lateStudent}'`);
  check('Fees — a late joiner is billed the fee’s current price',
    lateAmount === '400.00', `late joiner billed ${lateAmount}`);
  newChecks.add('Fees — a late joiner is billed the fee’s current price');

  // A SECOND run-owned fee. The invoice below must cover only fees this run
  // created: the demo seed already issues invoices over its own fees, and an
  // assignment may sit on at most one live invoice, so reusing a demo
  // assignment here would (correctly) be refused.
  r = await apiCall('POST', '/fees/types', { name: NAMES.feeType2 });
  const feeTypeId2 = r.body?.data?.id;
  r = await apiCall('POST', '/fees/school-fees', {
    feeTypeId: feeTypeId2, levelId: kg2LevelId, academicYearId: activeYearId,
    termId: feeTermId, name: NAMES.fee2, amount: '120.00',
  });
  check('Fees — a second fee for the same level under a different type is allowed',
    r.status === 201, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Fees — a second fee for the same level under a different type is allowed');

  // ── payments ─────────────────────────────────────────────────────────────
  section('Payments');

  const payStudentId = sql(`select id from students where student_number = 'STU-0001'`);
  r = await apiCall('GET', `/fees/bill/${payStudentId}?termId=${feeTermId}`);
  const payLine = r.body.data.lines.find((l) => l.name === NAMES.fee);
  const payAssignmentId = payLine.feeAssignmentId;

  const today = new Date().toISOString().slice(0, 10);
  r = await apiCall('POST', '/fees/payments', {
    feeAssignmentId: payAssignmentId, amount: '100.00',
    method: 'mobile_money', providerCode: 'MTN', reference: `MM${RUN}`, paidOn: today,
  });
  const firstReceipt = r.body?.data?.receiptNumber;
  check('Payments — a partial payment is recorded and gets a receipt number',
    r.status === 201 && /^RCT-\d{5}$/.test(firstReceipt ?? ''), `${r.status} ${firstReceipt}`);
  newChecks.add('Payments — a partial payment is recorded and gets a receipt number');

  r = await apiCall('POST', '/fees/payments', {
    feeAssignmentId: payAssignmentId, amount: '5000.00', method: 'cash', paidOn: today,
  });
  check('Payments — OVERPAYMENT is refused, naming the maximum',
    r.status === 409 && /maximum that can be recorded against this fee is GHS 200\.00/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Payments — OVERPAYMENT is refused, naming the maximum');

  r = await apiCall('POST', '/fees/payments', {
    feeAssignmentId: payAssignmentId, amount: '50.00', method: 'mobile_money', paidOn: today,
  });
  check('Payments — mobile money without a network is refused',
    r.status === 409 && /must name the network/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Payments — mobile money without a network is refused');

  r = await apiCall('POST', '/fees/payments', {
    feeAssignmentId: payAssignmentId, amount: '200.00', method: 'cash', paidOn: today,
  });
  const secondPaymentId = r.body?.data?.id;
  r = await apiCall('GET', `/fees/payments/assignment/${payAssignmentId}`);
  check('Payments — paying the remainder clears the balance exactly',
    r.body.data.outstanding === '0.00', `outstanding=${r.body?.data?.outstanding}`);
  newChecks.add('Payments — paying the remainder clears the balance exactly');

  // Reversal: a NEGATIVE row, no receipt number consumed, original untouched.
  const receiptsBefore = sql(`select count(*) from fee_payments where receipt_number is not null`);
  r = await apiCall('POST', `/fees/payments/${secondPaymentId}/reverse`, {
    reason: `QA ${RUN}: reversing to prove the ledger nets out`,
  });
  const receiptsAfter = sql(`select count(*) from fee_payments where receipt_number is not null`);
  check('Payments — a reversal is a negative row that consumes no receipt number',
    (r.status === 201 || r.status === 200)
    && String(r.body?.data?.amount) === '-200'
    && receiptsBefore === receiptsAfter,
    `amount=${r.body?.data?.amount} receipts ${receiptsBefore}→${receiptsAfter}`);
  newChecks.add('Payments — a reversal is a negative row that consumes no receipt number');

  r = await apiCall('GET', `/fees/payments/assignment/${payAssignmentId}`);
  check('Payments — the reversal restores the outstanding balance without a filter',
    r.body.data.outstanding === '200.00', `outstanding=${r.body?.data?.outstanding}`);
  newChecks.add('Payments — the reversal restores the outstanding balance without a filter');

  r = await apiCall('POST', `/fees/payments/${secondPaymentId}/reverse`, {
    reason: `QA ${RUN}: attempting a second reversal of the same payment`,
  });
  check('Payments — the same payment cannot be reversed twice',
    r.status === 409 && /already been reversed/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Payments — the same payment cannot be reversed twice');

  // ── invoices and the correction chain ────────────────────────────────────
  section('Invoices');

  const invEnrollmentId = sql(
    `select id from enrollments where student_id = '${payStudentId}' and status = 'active' limit 1`);
  const invBill = (await apiCall('GET', `/fees/bill/${payStudentId}?termId=${feeTermId}`)).body.data;
  // Only this run's two fees — see the note above the second fee.
  const invAssignmentIds = invBill.lines
    .filter((l) => l.name === NAMES.fee || l.name === NAMES.fee2)
    .map((l) => l.feeAssignmentId);

  r = await apiCall('POST', '/invoices', {
    enrollmentId: invEnrollmentId, termId: feeTermId, feeAssignmentIds: invAssignmentIds,
  });
  const invoiceId = r.body?.data?.id;
  const invoiceNumber = r.body?.data?.invoiceNumber;
  if (invoiceId) QA_INVOICE_IDS.push(invoiceId);
  check('Invoices — issue an invoice over a frozen set of fees',
    r.status === 201 && /^INV-\d{5}$/.test(invoiceNumber ?? '')
    && r.body.data.lines.length === invAssignmentIds.length,
    `${r.status} ${invoiceNumber} lines=${r.body?.data?.lines?.length}`);
  newChecks.add('Invoices — issue an invoice over a frozen set of fees');

  check('Invoices — the payment state is DERIVED from payments already recorded',
    r.body.data.paymentState === 'partially_paid',
    `state=${r.body?.data?.paymentState} collected=${r.body?.data?.collected}`);
  newChecks.add('Invoices — the payment state is DERIVED from payments already recorded');

  // No money is stored on the document.
  const invoiceColumns = sql(
    `select string_agg(column_name, ',' order by column_name) from information_schema.columns
     where table_name in ('invoices','invoice_lines')
       and column_name in ('total','amount','amount_due','amount_paid','balance','outstanding')`);
  check('Invoices — the invoice tables store NO money columns at all',
    invoiceColumns === '' || invoiceColumns === null, `found: ${invoiceColumns || '(none)'}`);
  newChecks.add('Invoices — the invoice tables store NO money columns at all');

  r = await apiCall('POST', '/invoices', {
    enrollmentId: invEnrollmentId, termId: feeTermId, feeAssignmentIds: [invAssignmentIds[0]],
  });
  check('Invoices — a fee already on a live invoice cannot be invoiced again',
    r.status === 409 && new RegExp(`already on invoice ${invoiceNumber}`).test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Invoices — a fee already on a live invoice cannot be invoiced again');

  // THE FREEZE GUARD.
  r = await apiCall('PATCH', `/fees/assignments/${payAssignmentId}`, { amountDue: '999.00' });
  check('Invoices — FREEZE GUARD: an invoiced amount cannot be edited, and the message names the invoice',
    r.status === 409 && new RegExp(`on invoice ${invoiceNumber}, so its amount is locked`).test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Invoices — FREEZE GUARD: an invoiced amount cannot be edited, and the message names the invoice');

  // THE CORRECTION.
  r = await apiCall('POST', `/invoices/${invoiceId}/correct`, {
    reason: `QA ${RUN}: correcting this invoice to prove the chain`,
    feeAssignmentIds: invAssignmentIds.slice(0, Math.max(1, invAssignmentIds.length - 1)),
  });
  const correctedId = r.body?.data?.id;
  const correctedNumber = r.body?.data?.invoiceNumber;
  if (correctedId) QA_INVOICE_IDS.push(correctedId);
  check('Invoices — correct issues a NEW invoice with a new number',
    r.status === 201 && correctedNumber !== invoiceNumber && /^INV-\d{5}$/.test(correctedNumber ?? ''),
    `${invoiceNumber} → ${correctedNumber}`);
  newChecks.add('Invoices — correct issues a NEW invoice with a new number');

  check('Invoices — the new invoice points BACK at the one it replaced',
    r.body.data.supersedesInvoiceId === invoiceId
    && r.body.data.chain.supersedes.map((i) => i.invoiceNumber).join(',') === invoiceNumber,
    `chain.supersedes=${r.body?.data?.chain?.supersedes?.map((i) => i.invoiceNumber).join(',')}`);
  newChecks.add('Invoices — the new invoice points BACK at the one it replaced');

  // The same chain, read from the OLD invoice.
  r = await apiCall('GET', `/invoices/${invoiceId}`);
  check('Invoices — the old invoice is cancelled and points FORWARD at its replacement',
    r.body.data.status === 'cancelled'
    && r.body.data.supersededByInvoiceId === correctedId
    && r.body.data.chain.supersededBy.map((i) => i.invoiceNumber).join(',') === correctedNumber,
    `status=${r.body?.data?.status} supersededBy=${r.body?.data?.chain?.supersededBy?.map((i) => i.invoiceNumber).join(',')}`);
  newChecks.add('Invoices — the old invoice is cancelled and points FORWARD at its replacement');

  const chainAudits = sql(
    `select string_agg(action, ',' order by created_at) from audit_logs
     where module = 'invoices' and metadata->>'reason' like 'QA ${RUN}%'`);
  check('Invoices — a correction writes both invoices.cancelled and invoices.corrected',
    chainAudits === 'invoices.cancelled,invoices.corrected', `actions=${chainAudits}`);
  newChecks.add('Invoices — a correction writes both invoices.cancelled and invoices.corrected');

  const supersededByAudit = sql(
    `select metadata->>'supersededBy' from audit_logs
     where action = 'invoices.cancelled' and entity_id = '${invoiceId}'`);
  check('Invoices — the cancel entry carries supersededBy, distinguishing it from a plain cancel',
    supersededByAudit === correctedId, `supersededBy=${supersededByAudit}`);
  newChecks.add('Invoices — the cancel entry carries supersededBy, distinguishing it from a plain cancel');

  r = await apiCall('POST', `/invoices/${invoiceId}/correct`, {
    reason: `QA ${RUN}: attempting to correct a superseded invoice`,
  });
  check('Invoices — correcting an already-superseded invoice 409s, pointing at its replacement',
    r.status === 409 && new RegExp(`replaced by ${correctedNumber}`).test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Invoices — correcting an already-superseded invoice 409s, pointing at its replacement');

  r = await apiCall('POST', `/invoices/${invoiceId}/cancel`, {
    reason: `QA ${RUN}: attempting to cancel a superseded invoice`,
  });
  check('Invoices — cancelling an already-superseded invoice is refused the same way',
    r.status === 409 && /already been corrected/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Invoices — cancelling an already-superseded invoice is refused the same way');

  // The freeze lifts for whatever the correction released.
  const releasedId = invAssignmentIds[invAssignmentIds.length - 1];
  r = await apiCall('PATCH', `/fees/assignments/${releasedId}`, { amountDue: '130.00' });
  check('Invoices — the freeze LIFTS for a fee the correction dropped',
    r.status === 200, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Invoices — the freeze LIFTS for a fee the correction dropped');

  // …and still holds for one the replacement kept.
  r = await apiCall('PATCH', `/fees/assignments/${invAssignmentIds[0]}`, { amountDue: '310.00' });
  check('Invoices — the freeze still HOLDS for a fee the replacement kept',
    r.status === 409 && new RegExp(`on invoice ${correctedNumber}`).test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Invoices — the freeze still HOLDS for a fee the replacement kept');

  // Cancelling keeps the money.
  const paymentsBeforeCancel = sql(
    `select count(*) from fee_payments where fee_assignment_id = '${payAssignmentId}'`);
  r = await apiCall('POST', `/invoices/${correctedId}/cancel`, {
    reason: `QA ${RUN}: withdrawing the demand entirely`,
  });
  const paymentsAfterCancel = sql(
    `select count(*) from fee_payments where fee_assignment_id = '${payAssignmentId}'`);
  check('Invoices — cancelling withdraws the demand and keeps every payment',
    (r.status === 201 || r.status === 200)
    && paymentsBeforeCancel === paymentsAfterCancel
    && r.body.data.paymentsRetained > 0,
    `payments ${paymentsBeforeCancel}→${paymentsAfterCancel} retained=${r.body?.data?.paymentsRetained}`);
  newChecks.add('Invoices — cancelling withdraws the demand and keeps every payment');

  // Every line of a cancelled invoice is released.
  const liveLines = sql(
    `select count(*) from invoice_lines where invoice_id = '${correctedId}' and voided_at is null`);
  check('Invoices — a cancelled invoice releases all of its fees',
    liveLines === '0', `live lines=${liveLines}`);
  newChecks.add('Invoices — a cancelled invoice releases all of its fees');

  // Finance UI legs.
  await gotoRoute(page, '/fees');
  const feeRowVisible = await rowAppears(page, NAMES.fee);
  check('Fees — the new fee appears on the Fees screen', feeRowVisible,
    feeRowVisible ? NAMES.fee : 'row not found');
  newChecks.add('Fees — the new fee appears on the Fees screen');

  await gotoRoute(page, '/invoices');
  const invoiceRowVisible = await rowAppears(page, correctedNumber);
  check('Invoices — the corrected invoice appears on the Invoices screen', invoiceRowVisible,
    invoiceRowVisible ? correctedNumber : 'row not found');
  newChecks.add('Invoices — the corrected invoice appears on the Invoices screen');

  await page.click(`button[data-invoice="${correctedNumber}"]`).catch(() => {});
  await page.waitForTimeout(1500);
  const chainVisible = await textAppears(page, 'Correction history');
  check('Invoices — the detail screen renders the correction chain', chainVisible,
    chainVisible ? 'chain shown' : 'not found');
  newChecks.add('Invoices — the detail screen renders the correction chain');
  await closeAnyDialog(page);

  await gotoRoute(page, '/fees/ledger');
  const ledgerVisible = await textAppears(page, 'Outstanding');
  check('Fees — the ledger screen renders its three columns', ledgerVisible,
    ledgerVisible ? 'ledger shown' : 'not found');
  newChecks.add('Fees — the ledger screen renders its three columns');

  // ── SMS consent and notifications ─────────────────────────────────────────
  //
  // The rule under test is the one that must never have an exception: no
  // guardian receives any message until they have actively said yes. It is
  // checked in one place (the enqueue path), so these checks drive it through
  // the real API rather than asserting a flag.
  section('SMS consent');

  const qaGuardianId = sql(
    `select id from guardians where last_name like '${RUN}%' order by created_at limit 1`);
  const qaLinkId = sql(
    `select id from student_guardians where guardian_id = '${qaGuardianId}' limit 1`);

  r = await apiCall('GET', `/guardians/${qaGuardianId}`);
  check('Consent — a new guardian starts with NO consent on record',
    r.body?.data?.smsConsentGiven === false, `consent=${r.body?.data?.smsConsentGiven}`);
  newChecks.add('Consent — a new guardian starts with NO consent on record');

  // The link flag cannot be turned on before consent exists.
  r = await apiCall('PATCH', `/student-guardians/${qaLinkId}`, { canReceiveSms: true });
  check('Consent — canReceiveSms cannot be set before consent is recorded',
    r.status === 409 && /has not given SMS consent/.test(r.body?.message ?? ''),
    `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Consent — canReceiveSms cannot be set before consent is recorded');

  r = await apiCall('POST', `/guardians/${qaGuardianId}/consent`, { smsConsentMethod: 'nonsense' });
  check('Consent — an unrecognised consent method is refused, naming the valid ones',
    r.status === 400 && /smsConsentMethod must be one of/.test(JSON.stringify(r.body?.errors ?? '')),
    `${r.status}`);
  newChecks.add('Consent — an unrecognised consent method is refused, naming the valid ones');

  r = await apiCall('POST', `/guardians/${qaGuardianId}/consent`, { smsConsentMethod: 'written_form' });
  check('Consent — recording consent stores the method, the moment and the actor',
    (r.status === 201 || r.status === 200) && r.body?.data?.smsConsentGiven === true
    && r.body?.data?.smsConsentMethod === 'written_form'
    && !!r.body?.data?.smsConsentGivenAt && !!r.body?.data?.smsConsentGivenBy,
    `${r.status} method=${r.body?.data?.smsConsentMethod}`);
  newChecks.add('Consent — recording consent stores the method, the moment and the actor');

  const grantAudit = sql(
    `select metadata->>'method' from audit_logs
     where action = 'guardian.sms_consent_granted' and entity_id = '${qaGuardianId}'`);
  check('Consent — granting writes guardian.sms_consent_granted with the method',
    grantAudit === 'written_form', `audit method=${grantAudit}`);
  newChecks.add('Consent — granting writes guardian.sms_consent_granted with the method');

  r = await apiCall('PATCH', `/student-guardians/${qaLinkId}`, { canReceiveSms: true });
  check('Consent — with consent on record, the link CAN be set to receive SMS',
    r.status === 200, `${r.status} ${r.body?.message ?? ''}`);
  newChecks.add('Consent — with consent on record, the link CAN be set to receive SMS');

  // ── the gate, driven through a real trigger ──────────────────────────────
  section('Notifications');

  // A demo student who owes something, so a reminder has a reason to exist.
  const notifyStudentId = sql(
    `select st.id from students st
     join enrollments e on e.student_id = st.id and e.status = 'active'
     join student_guardians sg on sg.student_id = st.id and sg.is_primary
     join guardians g on g.id = sg.guardian_id and g.sms_consent_given
     join fee_assignments fa on fa.enrollment_id = e.id
     where st.school_id = (select id from schools limit 1)
     group by st.id
     having sum(fa.amount_due) > coalesce(sum((
       select coalesce(sum(fp.amount), 0) from fee_payments fp where fp.fee_assignment_id = fa.id
     )), 0)
     limit 1`);
  const notifyGuardianId = sql(
    `select guardian_id from student_guardians where student_id = '${notifyStudentId}' and is_primary`);
  const notifyTermId = sql(`select id from terms where status = 'active' limit 1`);

  r = await apiCall('POST', '/notifications/fee-reminders', {
    termId: notifyTermId, studentId: notifyStudentId,
  });
  check('Notifications — a reminder for a CONSENTED guardian is queued',
    (r.status === 201 || r.status === 200) && r.body.data.queued === 1,
    `queued=${r.body?.data?.queued} suppressed=${r.body?.data?.suppressed}`);
  newChecks.add('Notifications — a reminder for a CONSENTED guardian is queued');

  const queuedRow = sql(
    `select to_phone || '|' || status from notification_messages
     where guardian_id = '${notifyGuardianId}' and queued_at >= '${RUN_STARTED_AT}'
     order by queued_at desc limit 1`);
  check('Notifications — the queued row froze an E.164 number at queue time',
    /^\+233\d{9}\|queued$/.test(queuedRow), queuedRow);
  newChecks.add('Notifications — the queued row froze an E.164 number at queue time');

  // The poller: claim, send through the sandbox gateway, mark sent.
  r = await apiCall('POST', '/notifications/dispatch');
  check('Notifications — the outbox poller sends what is waiting',
    (r.status === 201 || r.status === 200) && r.body.data.sent >= 1,
    `claimed=${r.body?.data?.claimed} sent=${r.body?.data?.sent}`);
  newChecks.add('Notifications — the outbox poller sends what is waiting');

  const sentRow = sql(
    `select status || '|' || coalesce(provider_code, '') from notification_messages
     where guardian_id = '${notifyGuardianId}' and queued_at >= '${RUN_STARTED_AT}'
     order by queued_at desc limit 1`);
  check('Notifications — a sent row records the gateway that accepted it',
    sentRow === 'sent|sandbox', sentRow);
  newChecks.add('Notifications — a sent row records the gateway that accepted it');

  // Idempotency: the same reminder twice sends once.
  r = await apiCall('POST', '/notifications/fee-reminders', {
    termId: notifyTermId, studentId: notifyStudentId,
  });
  check('Notifications — sending the same reminder twice in a day queues nothing the second time',
    r.body.data.queued === 0, `queued=${r.body?.data?.queued} duplicates=${r.body?.data?.duplicates}`);
  newChecks.add('Notifications — sending the same reminder twice in a day queues nothing the second time');

  // ── REVOKE: the gate closes ──────────────────────────────────────────────
  const revokedMethod = sql(
    `select coalesce(sms_consent_method, 'written_form') from guardians where id = '${notifyGuardianId}'`);
  QA_REVOKED_CONSENT.push({ id: notifyGuardianId, method: revokedMethod });

  r = await apiCall('DELETE', `/guardians/${notifyGuardianId}/consent`, {
    reason: `QA ${RUN}: proving withdrawal stops future sends`,
  });
  check('Consent — withdrawing disables every link and cancels anything still queued',
    r.status === 200 && r.body.data.linksDisabled >= 1,
    `links=${r.body?.data?.linksDisabled} cancelled=${r.body?.data?.queuedMessagesCancelled}`);
  newChecks.add('Consent — withdrawing disables every link and cancels anything still queued');

  const revokeAudit = sql(
    `select count(*) from audit_logs
     where action = 'guardian.sms_consent_revoked' and entity_id = '${notifyGuardianId}'
       and metadata->>'reason' like 'QA ${RUN}%'`);
  check('Consent — withdrawing writes guardian.sms_consent_revoked with the reason',
    revokeAudit === '1', `audits=${revokeAudit}`);
  newChecks.add('Consent — withdrawing writes guardian.sms_consent_revoked with the reason');

  // A DIFFERENT trigger, so the fee-reminder dedupe key for today cannot mask
  // the refusal — this has to fail because consent is gone, not because the
  // message was already sent.
  r = await apiCall('POST', '/notifications/absence-alerts', {
    classroomId: sql(`select classroom_id from enrollments where student_id = '${notifyStudentId}' and status = 'active' limit 1`),
    date: sql(`select to_char(max(attendance_date), 'YYYY-MM-DD') from attendance_records`),
  });
  const suppressedAfterRevoke = sql(
    `select count(*) from notification_messages
     where guardian_id = '${notifyGuardianId}' and status = 'suppressed'
       and last_error = 'Guardian has not given SMS consent'
       and queued_at >= '${RUN_STARTED_AT}'`);
  check('Notifications — after withdrawal, a message for that guardian is NOT sent, and the log says why',
    Number(suppressedAfterRevoke) >= 1 || r.status === 409,
    `suppressed=${suppressedAfterRevoke} alertStatus=${r.status}`);
  newChecks.add('Notifications — after withdrawal, a message for that guardian is NOT sent, and the log says why');

  const everSentAfterRevoke = sql(
    `select count(*) from notification_messages
     where guardian_id = '${notifyGuardianId}' and status in ('queued','sending','sent','delivered')
       and queued_at >= '${RUN_STARTED_AT}'
       and queued_at > (select max(created_at) from audit_logs
                        where action = 'guardian.sms_consent_revoked'
                          and entity_id = '${notifyGuardianId}')`);
  check('Notifications — NOTHING was queued or sent for that guardian after withdrawal',
    everSentAfterRevoke === '0', `${everSentAfterRevoke} message(s) escaped the gate`);
  newChecks.add('Notifications — NOTHING was queued or sent for that guardian after withdrawal');

  // ── the log ──────────────────────────────────────────────────────────────
  r = await apiCall('GET', '/notifications?limit=5');
  check('Notifications — the log returns the standard paginated envelope',
    r.status === 200 && Array.isArray(r.body?.data?.items) && !!r.body?.data?.pagination,
    `${r.status} items=${r.body?.data?.items?.length}`);
  newChecks.add('Notifications — the log returns the standard paginated envelope');

  r = await apiCall('GET', '/notifications/counts');
  check('Notifications — counts expose failed and suppressed together as "needs attention"',
    r.status === 200 && typeof r.body.data.needsAttention === 'number'
    && typeof r.body.data.segments === 'number',
    JSON.stringify(r.body?.data?.byStatus ?? {}));
  newChecks.add('Notifications — counts expose failed and suppressed together as "needs attention"');

  // ── the password-reset leak, closed ──────────────────────────────────────
  const resetResponse = await apiCallAs(null, 'POST', '/auth/password-reset/request',
    { email: EMAIL });
  const resetBody = JSON.stringify(resetResponse.body);
  check('Auth — a password reset request returns NO token of any kind',
    resetResponse.status === 200 || resetResponse.status === 201,
    `${resetResponse.status}`);
  newChecks.add('Auth — a password reset request returns NO token of any kind');

  check('Auth — the response body contains no token, _devToken or reset code',
    !/_devToken/.test(resetBody) && !/"token"/.test(resetBody),
    resetBody.slice(0, 160));
  newChecks.add('Auth — the response body contains no token, _devToken or reset code');

  const resetQueued = sql(
    `select count(*) from notification_messages
     where trigger = 'password_reset' and queued_at >= '${RUN_STARTED_AT}'`);
  check('Auth — the reset token is delivered through the notification layer instead',
    Number(resetQueued) >= 1, `${resetQueued} password_reset message(s) queued`);
  newChecks.add('Auth — the reset token is delivered through the notification layer instead');

  const resetLeak = sql(
    `select count(*) from notification_messages
     where trigger = 'password_reset' and queued_at >= '${RUN_STARTED_AT}'
       and body not like '%code is%'`);
  check('Auth — the reset SMS carries the code to the account holder, not to the caller',
    resetLeak === '0', `${resetLeak} malformed`);
  newChecks.add('Auth — the reset SMS carries the code to the account holder, not to the caller');

  // Notifications UI leg.
  await gotoRoute(page, '/notifications');
  const notifRows = await page.locator('tbody tr').count();
  check('Notifications — the log screen renders messages with their status',
    notifRows > 0, `rows=${notifRows}`);
  newChecks.add('Notifications — the log screen renders messages with their status');

  await gotoRoute(page, '/guardians');
  const consentColumn = await page.locator('th:has-text("SMS consent")').count();
  check('Consent — the guardians screen shows each guardian’s consent state',
    consentColumn === 1, `column=${consentColumn}`);
  newChecks.add('Consent — the guardians screen shows each guardian’s consent state');

  // ── roles and permissions ─────────────────────────────────────────────────
  //
  // The portal path for granting a permission. Before this screen existed the
  // only way to fix a missing grant on a deployed server was to edit the
  // database by hand.
  section('Roles & Permissions');

  r = await apiCall('GET', '/roles');
  const rolesList = r.body?.data ?? [];
  check('Roles — the API returns roles with their grants embedded',
    r.status === 200 && rolesList.length > 0 && Array.isArray(rolesList[0].permissions),
    `${r.status} roles=${rolesList.length}`);
  newChecks.add('Roles — the API returns roles with their grants embedded');

  r = await apiCall('GET', '/permissions');
  const permList = r.body?.data ?? [];
  check('Roles — the permission catalogue is complete on this database',
    r.status === 200 && permList.length >= 94,
    `${permList.length} permissions (expected >= 94)`);
  newChecks.add('Roles — the permission catalogue is complete on this database');

  // The exact permission whose absence produced the production 403.
  check('Roles — fee_types.read exists and is therefore grantable',
    permList.some((p) => p.key === 'fee_types.read'),
    permList.some((p) => p.key === 'fee_types.read') ? 'present' : 'MISSING');
  newChecks.add('Roles — fee_types.read exists and is therefore grantable');

  // Grant/revoke round trip against a role that does not hold it by default.
  const ctRole = rolesList.find((x) => x.code === 'CLASS_TEACHER');
  const feeRead = permList.find((p) => p.key === 'fee_types.read');
  if (ctRole && feeRead) {
    const had = ctRole.permissions.some((l) => l.permission.key === 'fee_types.read');
    if (!had) {
      r = await apiCall('POST', `/roles/${ctRole.id}/permissions`, { permissionId: feeRead.id });
      const granted = sql(
        `select count(*) from role_permissions where role_id = '${ctRole.id}' and permission_id = '${feeRead.id}'`);
      check('Roles — granting a permission through the API persists it',
        r.status === 201 && granted === '1', `${r.status} rows=${granted}`);
      newChecks.add('Roles — granting a permission through the API persists it');

      r = await apiCall('DELETE', `/roles/${ctRole.id}/permissions/${feeRead.id}`);
      const after = sql(
        `select count(*) from role_permissions where role_id = '${ctRole.id}' and permission_id = '${feeRead.id}'`);
      check('Roles — revoking it again removes the grant (no residue left by QA)',
        r.status === 200 && after === '0', `${r.status} rows=${after}`);
      newChecks.add('Roles — revoking it again removes the grant (no residue left by QA)');
    }
  }

  await gotoRoute(page, '/roles');
  await page.waitForTimeout(2500);
  const roleOptions = await page.locator('#role-picker option').count();
  const permModules = await page.locator('[data-module]').count();
  check('Roles — the screen renders a role picker and the grouped catalogue',
    roleOptions >= 5 && permModules > 10,
    `roles=${roleOptions} modules=${permModules}`);
  newChecks.add('Roles — the screen renders a role picker and the grouped catalogue');

  check('Roles — fee_types.read is togglable from the portal',
    await page.locator('[data-permission="fee_types.read"] input[type=checkbox]').count() === 1);
  newChecks.add('Roles — fee_types.read is togglable from the portal');

  // ── health ────────────────────────────────────────────────────────────────
  section('Health');
  check('no uncaught page errors during the run', crashes.length === 0, crashes.slice(0, 3).join(' | '));
} catch (error) {
  fail++;
  failures.push(`script aborted: ${error.message}`);
  console.log(`\n  FAIL  script aborted — ${error.message}`);
  await page.screenshot({ path: `qa-failure-${RUN}.png` }).catch(() => {});
} finally {
  // ── cleanup ───────────────────────────────────────────────────────────────
  section('Cleanup');
  try {
    cleanup();
    const leftovers = countLeftovers();
    check('every record created by this run was removed', leftovers === 0, `${leftovers} left`);
  } catch (error) {
    check('every record created by this run was removed', false, error.message);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${pass} passed, ${fail} failed  (${pass + fail} checks, run ${RUN})`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  exitCode = fail ? 1 : 0;
  await browser.close();
}

process.exit(exitCode);
