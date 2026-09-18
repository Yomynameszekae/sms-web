/**
 * Spot-check for the shared <ApiError> card after it was switched to
 * apiErrorMessage(). Simulates both failure modes per view:
 *   1. connection refused (what a dead API port looks like to the browser)
 *   2. a 500 whose body carries a specific message
 *
 * Usage: node qa/error-states-check.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const NETWORK_TEXT = 'Cannot reach the server. Check your connection and try again.';

const VIEWS = [
  { route: '/students', endpoint: '**/api/v1/students?**' },
  { route: '/guardians', endpoint: '**/api/v1/guardians?**' },
  { route: '/classrooms', endpoint: '**/api/v1/classrooms**' },
  { route: '/terms', endpoint: '**/api/v1/terms**' },
  { route: '/academic-years', endpoint: '**/api/v1/academic-years**' },
  // Phase 2 Stage 1a
  { route: '/labels', endpoint: '**/api/v1/labels**' },
  // /attendance fans out to several calls; the classroom picker is the one
  // the page cannot render without, so it is the meaningful failure to test.
  { route: '/attendance', endpoint: '**/api/v1/attendance/classrooms**' },
  // Phase 2 Stage 1b
  { route: '/fees/types', endpoint: '**/api/v1/fees/types**' },
  { route: '/invoices', endpoint: '**/api/v1/invoices**' },
  { route: '/notifications', endpoint: '**/api/v1/notifications?**' },
];

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 950 } })).newPage();

const crashes = [];
page.on('pageerror', (e) => crashes.push(e.message));

await page.goto(`${BASE}/login`);
await page.fill('#email', 'admin@example.com');
await page.fill('#password', 'ChangeMe123!');
await page.click('button[type=submit]');
await page.waitForURL(/dashboard/, { timeout: 20000 });

// The error card is the only element that paints on --error; read its text.
const cardText = () =>
  page.$$eval('p.text-sm.font-medium', (ps) =>
    ps.map((p) => p.textContent?.trim()).filter(Boolean));

for (const view of VIEWS) {
  console.log(`\n${view.route}`);

  // 1. connection refused
  await page.route(view.endpoint, (r) => r.abort('connectionrefused'));
  await page.goto(`${BASE}${view.route}`);
  await page.waitForTimeout(2500);
  let texts = await cardText();
  check(`${view.route} shows a network message on connection refused`,
    texts.some((t) => t === NETWORK_TEXT), texts.join(' / ') || '(no card text)');
  check(`${view.route} still renders its heading (no blank page)`,
    await page.isVisible('h1'));
  await page.unroute(view.endpoint);

  // 2. 500 with a specific body message
  await page.route(view.endpoint, (r) =>
    r.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, statusCode: 500, message: 'Database unavailable' }),
    }));
  await page.goto(`${BASE}${view.route}`);
  await page.waitForTimeout(2500);
  texts = await cardText();
  check(`${view.route} surfaces the server's specific message`,
    texts.some((t) => t === 'Database unavailable'), texts.join(' / ') || '(no card text)');
  await page.unroute(view.endpoint);
}

check('no uncaught page errors', crashes.length === 0, crashes.join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
