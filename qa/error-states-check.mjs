/**
 * Spot-check for the shared <ApiError> card. Simulates three responses per
 * view, because the product owes the user a DIFFERENT answer to each:
 *   1. connection refused — transient, alarming, retry offered
 *   2. a 500 with a specific message — unexpected, alarming, retry offered
 *   3. a 403 — expected and static: calm, no retry, and above all NO raw
 *      permission key. The backend says "Missing required permission(s):
 *      fee_types.read"; a head teacher must never see that sentence.
 *
 * Usage: node qa/error-states-check.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000';
const NETWORK_TEXT = 'Cannot reach the server. Check your connection and try again.';
const DENIED_HINT = 'Contact your administrator if you believe this is a mistake.';
// Anything that looks like an internal permission key: module.action
const PERMISSION_KEY = /\b[a-z_]+\.(read|create|update|delete|read_any|mark|mark_any|approve|reverse|reconcile)\b/;

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

  // 3. 403 — the permission-denied state
  await page.route(view.endpoint, (r) =>
    r.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        statusCode: 403,
        message: 'Missing required permission(s): fee_types.read',
      }),
    }));
  await page.goto(`${BASE}${view.route}`);
  await page.waitForTimeout(2500);

  const denied = await page.$('[data-state="access-denied"]');
  check(`${view.route} renders the calm access-denied state on 403`, !!denied);

  const bodyText = await page.textContent('body');
  check(`${view.route} does NOT leak a permission key to the user`,
    !PERMISSION_KEY.test(bodyText ?? ''),
    (PERMISSION_KEY.exec(bodyText ?? '') ?? [''])[0] || 'clean');

  check(`${view.route} offers no "Try again" on a permission failure`,
    !(await page.getByRole('button', { name: /try again/i }).count()));

  check(`${view.route} tells the user what to do instead`,
    (bodyText ?? '').includes(DENIED_HINT));

  await page.unroute(view.endpoint);
}

// The access-denied panel must be legible on every theme, not just the
// default — it paints on --surface-alt/--border, which every theme defines.
await page.route('**/api/v1/fees/types**', (r) =>
  r.fulfill({ status: 403, contentType: 'application/json',
    body: JSON.stringify({ statusCode: 403, message: 'Missing required permission(s): fee_types.read' }) }));
for (const theme of ['deep-navy', 'sand-clay', 'greige-sage']) {
  await page.goto(`${BASE}/fees/types`);
  // Same budget the per-view checks use; the panel only paints after the
  // query has resolved and re-rendered.
  await page.waitForSelector('[data-state="access-denied"]', { timeout: 15000 }).catch(() => {});
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(400);
  const box = await page.$('[data-state="access-denied"]');
  const visible = box ? await box.isVisible() : false;
  const colours = box
    ? await box.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, border: cs.borderColor };
      })
    : null;
  check(`access-denied panel renders on the ${theme} theme`,
    visible && !!colours && colours.bg !== 'rgba(0, 0, 0, 0)',
    colours ? `bg=${colours.bg}` : 'not rendered');
}
await page.unroute('**/api/v1/fees/types**');

check('no uncaught page errors', crashes.length === 0, crashes.join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
