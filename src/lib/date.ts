/**
 * Date helpers.
 *
 * The backend stores two distinct kinds of value:
 *
 *  - **Date-only** columns (`@db.Date`) — enrollment date, exit date, date of
 *    birth, admission date, term/academic-year start and end. These come back
 *    as midnight UTC (`2026-06-21T00:00:00.000Z`) but carry no time meaning.
 *    Rendering them with `new Date(iso).toLocaleDateString()` shifts them into
 *    the viewer's timezone, so anyone behind UTC sees the *previous* day.
 *    Use {@link formatDateOnly}.
 *
 *  - **Timestamps** (`@db.Timestamptz`) — audit log times, archivedAt,
 *    offeredAt, enrolledAt. These are real instants and *should* be shown in
 *    the viewer's local time. Format those with plain `toLocaleString`.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

/**
 * Formats a date-only value without letting the viewer's timezone move it.
 * Returns `placeholder` for null, undefined or unparseable input.
 */
export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS,
  placeholder = '—',
): string {
  if (!value) return placeholder;

  const parts = DATE_ONLY.exec(value);
  // Pin the calendar day to UTC, then read it back in UTC, so the rendered
  // day matches the stored day everywhere on earth.
  const date = parts
    ? new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return placeholder;

  return date.toLocaleDateString('en-GB', { timeZone: 'UTC', ...options });
}

/** Long form: `21 Jun 2026`. */
export const DATE_ONLY_LONG: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

/**
 * Today's *local* calendar date as `YYYY-MM-DD`, ready for an `<input
 * type="date">`. Deliberately not `toISOString().slice(0, 10)`, which yields
 * tomorrow's date for anyone ahead of UTC late in the day.
 */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
