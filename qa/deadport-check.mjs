import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SHOT = '/private/tmp/claude-501/-Users-kanla-Documents-Applications-js-sms-main/e96eb979-988b-4f01-9c5c-3eb461732817/scratchpad';
const log = (...a) => console.log(...a);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 950 } })).newPage();

const crashes = [];
page.on('pageerror', (e) => crashes.push(e.message));

// The API base URL points at a dead port, so login itself is the only thing
// reachable in this mode — everything else redirects to /login.
await page.goto(`${BASE}/login`);
await page.fill('#email', 'admin@example.com');
await page.fill('#password', 'ChangeMe123!');
await page.click('button[type=submit]');
await page.waitForTimeout(3500);
log('DEAD PORT / login toast:', await page.$$eval('[data-sonner-toast]', (e) => e.map((x) => x.innerText.replace(/\n+/g, ' | '))));
log('  still on /login (no crash-through):', page.url().includes('/login'));
log('  page still rendered (form visible):', await page.isVisible('#email'));
await page.screenshot({ path: `${SHOT}/20-deadport-login.png` });

log('  uncaught page errors:', crashes.length ? crashes : 'none');
await browser.close();
