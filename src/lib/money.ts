/**
 * ONE currency formatter for the whole product.
 *
 * The benchmarked product rendered currency as "GHS" on some pages and "GH₵"
 * on others (its defect D13). Brite is a Ghana-only product, amounts carry no
 * currency column, and this is the only place a cedi symbol is written.
 *
 * Input is always a STRING — the backend serialises money as a fixed-2dp
 * string, never as a JSON number. Never parseFloat one of these to do
 * arithmetic; ask the backend for the sum instead.
 */
const FORMATTER = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  // Formatting only: the value is never fed back into a calculation.
  if (!Number.isFinite(n)) return String(value);
  return `GH₵${FORMATTER.format(n)}`;
}

/** True when a money string is greater than zero. String-safe comparison. */
export function isPositive(value: string | null | undefined): boolean {
  if (!value) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}
