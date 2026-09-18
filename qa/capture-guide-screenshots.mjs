/**
 * Captures every screenshot referenced by BRITE_SMS_PHASE_1_USER_GUIDE.md
 * into screenshots-guide/, keyed by a slug of the placeholder caption.
 *
 * Read-only against the app: dialogs are opened and filled but NEVER
 * submitted (the one "Validation errors" shot submits an empty form, which
 * client-side zod blocks before any request). Run AFTER `npm run seed:demo`
 * in sms-pre so the shots show the demo dataset, then rebuild the PDF:
 *
 *   node qa/capture-guide-screenshots.mjs
 *   node qa/build-user-guide-pdf.mjs
 *
 * Env: QA_BASE_URL / QA_EMAIL / QA_PASSWORD as in qa-pass.mjs.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.QA_EMAIL ?? 'admin@example.com';
const PASSWORD = process.env.QA_PASSWORD ?? 'ChangeMe123!';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'screenshots-guide');
mkdirSync(OUT, { recursive: true });

export const slugify = (caption) =>
  caption.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const browser = await chromium.launch();
const page = await (await browser.newContext({
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2,
})).newPage();

let taken = 0;
async function shot(caption) {
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(OUT, `${slugify(caption)}.png`) });
  taken++;
  console.log(`  ✓ ${caption}`);
}
async function go(route) {
  await page.goto(`${BASE}${route}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}
async function open(buttonText, formSelector) {
  await page.click(`button:has-text("${buttonText}")`);
  await page.waitForSelector(formSelector, { timeout: 10000 });
  await page.waitForTimeout(450);
}
async function esc() {
  for (let i = 0; i < 3 && (await page.locator('[role=dialog]').count()); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }
}

// ── auth ─────────────────────────────────────────────────────────────────────
await go('/login');
await shot('Login page');
await page.fill('#email', EMAIL);
await page.fill('#password', PASSWORD);
await shot('Filled login form');
await page.click('button[type=submit]');
await page.waitForURL(/dashboard/, { timeout: 25000 });
await page.waitForLoadState('networkidle');
await shot('Dashboard after login');
await shot('Dashboard');

// ── school ───────────────────────────────────────────────────────────────────
await go('/school');
await shot('School Profile page');
await open('Edit', '#sp-name, [role=dialog] form').catch(async () => {
  await page.click('button:has-text("Edit")');
  await page.waitForTimeout(600);
});
await shot('Edit School Profile dialog');
await esc();

await go('/school/settings');
await shot('School Settings page');
await page.locator('text=Appearance').first().scrollIntoViewIfNeeded().catch(() => {});
await shot('Theme picker');
await shot('Theme picker in School Settings');

await go('/document-sequences');
await shot('Document Sequences page');
await page.locator('tr:has-text("Student Number") button, tr:has-text("student_number") button').first().click();
await page.waitForSelector('[role=dialog]');
await shot('Edit Student Number dialog');
await esc();

// ── academic structure ───────────────────────────────────────────────────────
await go('/academic-years');
await shot('Academic Years page');
await open('New Academic Year', 'form#ay-form');
await shot('New Academic Year dialog');
await esc();

await go('/terms');
await shot('Terms page');
await open('New Term', 'form#term-form');
await shot('New Term dialog');
await esc();

await go('/levels');
await shot('Levels page');
// The demo seed keeps every level active; archive one, capture the toggle
// view, then restore it so the dataset is left untouched.
await page.locator('tr:has-text("JHS 3") button[title="Archive"]').click();
await page.waitForTimeout(1200);
await page.click('#lv-show-archived');
await page.waitForTimeout(1200);
await shot('Levels with Show archived and Restore');
await page.locator('tr:has-text("JHS 3") button[title="Restore"]').click();
await page.waitForTimeout(1200);
await page.click('#lv-show-archived');
await page.waitForTimeout(800);
await open('New Level', 'form#level-form');
await shot('New Level dialog');
await esc();

await go('/classrooms');
await shot('Classrooms page');
await open('New Classroom', 'form#classroom-create-form');
await shot('New Classroom dialog');
await esc();
await page.locator('button[title="Assign teacher"]').first().click();
await page.waitForSelector('form#assign-teacher-form');
await shot('Assign Teacher dialog');
await esc();

// ── people ───────────────────────────────────────────────────────────────────
await go('/staff');
await shot('Staff page');
await open('New Staff Member', 'form#staff-create-form');
await shot('New Staff Member dialog');
await esc();

await go('/students');
await shot('Students list');
// expand a student with linked guardians (a Boakye sibling in the demo seed)
await page.locator('tr:has-text("Boakye") button').first().click();
await page.waitForTimeout(900);
// the expanded panel may render below the fold — bring it into view
await page.mouse.wheel(0, 500);
await shot('Expanded guardian panel');
await page.mouse.wheel(0, -500);
await open('New Student', 'form#student-create-form');
await shot('New Student dialog');
await page.click('button[form=student-create-form]'); // blank submit → zod errors, no request
await page.waitForTimeout(600);
await shot('Validation errors');
await page.fill('#st-num', 'STU-0020');
await page.fill('#st-fn', 'Nana Kwame');
await page.fill('#st-ln', 'Ampofo');
await page.fill('#st-dob', '2018-03-12');
await page.selectOption('#st-gender', 'male');
await page.fill('#st-nat', 'Ghanaian');
await shot('Filled New Student form');
await esc();

await go('/guardians');
await shot('Guardians list');
// Same in-and-out for an archived guardian (Kingsley Gyasi has one link, no
// primary complications beyond his own student).
await page.locator('tr:has-text("Gyasi") button[title="Archive"]').click();
await page.waitForTimeout(1200);
await page.click('#gd-show-archived');
await page.waitForTimeout(1200);
await shot('Archived guardian with Restore button');
await page.locator('tr:has-text("Gyasi") button[title="Restore"]').click();
await page.waitForTimeout(1200);
await page.click('#gd-show-archived');
await page.waitForTimeout(800);
await page.locator('tbody tr button').first().click();
await page.waitForTimeout(900);
await shot('Expanded linked-students panel');
await open('New Guardian', 'form#guardian-create-form');
await shot('New Guardian dialog');
await esc();

await go('/student-guardians');
await shot('Student-Guardian Links page');
await page.locator('button:has-text("Link Guardian")').first().click();
await page.waitForSelector('[role=dialog] form');
await shot('Link Guardian dialog');
await esc();

// ── admissions ───────────────────────────────────────────────────────────────
await go('/admissions');
await shot('Admissions list');
await shot('Status badges in Admissions list');
await shot('Admission row actions by status');
await page.selectOption('select.max-w-\\[180px\\]', 'enquiry');
await page.waitForTimeout(1000);
await shot('Enquiry filter with Offer button');
await page.selectOption('select.max-w-\\[180px\\]', 'offered');
await page.waitForTimeout(1000);
await shot('Offered filter with Enroll button');
await page.locator('button:has-text("Enroll")').first().click();
await page.waitForSelector('form#adm-enroll-form');
await shot('Enroll dialog');
await esc();
await page.selectOption('select.max-w-\\[180px\\]', '');
await open('New Admission', 'form#adm-create-form');
await shot('New Admission dialog');
await esc();

// ── enrollments ──────────────────────────────────────────────────────────────
await go('/enrollments');
await shot('Enrollments list');
await open('New Enrollment', 'form#enr-create-form');
await shot('New Enrollment dialog');
await esc();
await page.locator('button:has-text("Withdraw")').first().click();
await page.waitForSelector('form#enr-withdraw-form');
await shot('Withdraw dialog');
await esc();

// ── files + audit ────────────────────────────────────────────────────────────
await go('/files');
await shot('Files page');
await open('New File Record', 'form#file-create-form');
await shot('New File Record dialog');
await esc();

await go('/audit-logs');
await shot('Audit Logs page');
await page.fill('input[placeholder*="odule"], input[placeholder*="Module"]', 'enrollments').catch(() => {});
await page.waitForTimeout(1200);
await shot('Filtered by module');
await page.locator('tbody tr button').first().click().catch(() => {});
await page.waitForTimeout(700);
await shot('Expanded Before/After diff');

await browser.close();
console.log(`\n${taken} screenshots captured to ${OUT}`);
