/**
 * Builds BRITE_SMS_PHASE_1_USER_GUIDE.pdf from BRITE_SMS_PHASE_1_USER_GUIDE.md.
 *
 * Every `> 📷 *Screenshot: <caption>*` placeholder is replaced with the
 * matching image from screenshots-guide/ (captured by
 * qa/capture-guide-screenshots.mjs), embedded as base64 so the PDF is
 * self-contained. The build FAILS if any placeholder has no image — a
 * regenerated guide must have zero placeholders.
 *
 *   node qa/capture-guide-screenshots.mjs   # after seed:demo, servers up
 *   node qa/build-user-guide-pdf.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MD = path.join(ROOT, 'BRITE_SMS_PHASE_1_USER_GUIDE.md');
const SHOTS = path.join(ROOT, 'screenshots-guide');
const PDF = path.join(ROOT, 'BRITE_SMS_PHASE_1_USER_GUIDE.pdf');

const slugify = (caption) =>
  caption.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// ── tiny markdown → HTML (headings, tables, lists, blockquotes, code) ───────
function inline(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let missing = [];
  let i = 0;
  const flushList = (buf, ordered) =>
    out.push(`<${ordered ? 'ol' : 'ul'}>${buf.map((x) => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);

  while (i < lines.length) {
    const line = lines[i];

    const img = line.match(/^>\s*📷\s*\*Screenshot:\s*(.+?)\*\s*$/);
    if (img) {
      const file = path.join(SHOTS, `${slugify(img[1])}.png`);
      if (!existsSync(file)) { missing.push(img[1]); i++; continue; }
      const b64 = readFileSync(file).toString('base64');
      out.push(`<figure><img src="data:image/png;base64,${b64}" alt="${inline(img[1])}"/><figcaption>${inline(img[1])}</figcaption></figure>`);
      i++; continue;
    }
    if (/^---\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}${lvl <= 2 ? ' class="page-break"' : ''}>${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${buf.map((x) => inline(x)).join('<br/>')}</blockquote>`);
      continue;
    }
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.split('|').slice(1, -1).map((c) => c.trim());
      const header = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<table><thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
      flushList(buf, false); continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
      flushList(buf, true); continue;
    }
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  return { html: out.join('\n'), missing };
}

const md = readFileSync(MD, 'utf8');
const { html, missing } = mdToHtml(md);
if (missing.length) {
  console.error(`FAIL — ${missing.length} placeholder(s) with no screenshot:`);
  missing.forEach((m) => console.error(`  - ${m}`));
  process.exit(1);
}

const doc = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font: 10.5pt/1.55 -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1c2733; margin: 0; }
  h1 { font-size: 21pt; } h2 { font-size: 15pt; border-bottom: 2px solid #14213d; padding-bottom: 4px; }
  h3 { font-size: 12pt; } h4 { font-size: 10.5pt; }
  h2.page-break { page-break-before: always; }
  code { background: #eef1f5; border-radius: 3px; padding: 1px 4px; font-size: 9pt; }
  blockquote { border-left: 3px solid #fca311; background: #fdf6ea; margin: 8px 0; padding: 8px 12px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9.5pt; }
  th, td { border: 1px solid #cdd5df; padding: 5px 8px; text-align: left; }
  th { background: #14213d; color: #fff; }
  figure { margin: 12px 0; page-break-inside: avoid; }
  figure img { width: 100%; border: 1px solid #cdd5df; border-radius: 6px; }
  figcaption { font-size: 8.5pt; color: #5b6b7b; margin-top: 4px; text-align: center; }
  hr { border: none; border-top: 1px solid #e3e8ee; margin: 14px 0; }
</style></head><body>${html}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(doc, { waitUntil: 'load' });
await page.pdf({
  path: PDF, format: 'A4', printBackground: true,
  margin: { top: '16mm', bottom: '16mm', left: '13mm', right: '13mm' },
});
await browser.close();

const images = (html.match(/<figure>/g) || []).length;
console.log(`Built ${PDF}`);
console.log(`  ${images} screenshots embedded, 0 unresolved placeholders`);
