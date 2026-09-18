'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { ApiError } from '@/components/shared/api-error';
import { Button } from '@/components/ui/button';
import { attendanceApi } from '@/lib/api/endpoints/attendance';
import { queryKeys } from '@/lib/query-keys';
import type { AttendanceStatus, ClassroomRegisterGrid } from '@/types/api';

/**
 * Students down the page, dates across, each cell a two-glyph AM/PM pair.
 *
 * Laid out a fortnight per page — ten school days x two sub-columns is about
 * the widest that stays legible on A4 landscape — with the student name and
 * number repeated as frozen left-hand columns on every page. A register whose
 * second page does not say whose row is whose is not a register.
 *
 * Nothing here recomputes a rate or a count: every figure arrives already
 * summarised by attendance.reporting.ts, which is the single definition.
 */
const GLYPH: Record<AttendanceStatus, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
};

const DATES_PER_PAGE = 10;

function chunk<T>(items: T[], size: number): T[][] {
  if (!items.length) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function dateParts(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    dow: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
    dom: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
  };
}

const isPresent = (status: AttendanceStatus | null) =>
  status === 'present' || status === 'late';

export function RegisterPrintView() {
  const params = useSearchParams();
  const classroomId = params.get('classroomId') ?? '';
  const termId = params.get('termId') ?? '';
  const from = params.get('from') ?? undefined;
  const to = params.get('to') ?? undefined;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.attendance.grid(classroomId, termId, from, to),
    queryFn: () =>
      attendanceApi.registerGrid({ classroomId, termId, from, to }).then((r) => r.data.data),
    enabled: !!classroomId && !!termId,
  });

  if (!classroomId || !termId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Open this page from the attendance summary — it needs a classroom and a term.
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ApiError error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Preparing the register…</div>;
  }

  return (
    <div className="register-print overflow-auto">
      <style>{PRINT_CSS}</style>

      <div className="no-print flex items-center justify-end gap-2 p-4">
        <Button size="sm" id="att-print" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      {chunk(data.dates, DATES_PER_PAGE).map((dates, index, pages) => (
        <Sheet
          key={index}
          grid={data}
          dates={dates}
          pageIndex={index}
          pageCount={pages.length}
        />
      ))}
    </div>
  );
}

function Sheet({
  grid,
  dates,
  pageIndex,
  pageCount,
}: {
  grid: ClassroomRegisterGrid;
  dates: string[];
  pageIndex: number;
  pageCount: number;
}) {
  return (
    <section className="sheet">
      <header>
        <h1>{grid.school.name}</h1>
        <h2>
          Attendance register — {grid.classroom.displayName} — {grid.term.label}
          {pageCount > 1 && (
            <span className="page-of"> (page {pageIndex + 1} of {pageCount})</span>
          )}
        </h2>
      </header>

      <table>
        <thead>
          <tr>
            <th rowSpan={2} className="num">No.</th>
            <th rowSpan={2} className="name">Student</th>
            {dates.map((date) => {
              const { dow, dom } = dateParts(date);
              return (
                <th key={date} colSpan={2}>
                  <span className="dow">{dow}</span>
                  <span className="dom">{dom}</span>
                </th>
              );
            })}
            <th colSpan={2} className="total">Total</th>
          </tr>
          <tr>
            {dates.map((date) => (
              <>
                <th key={`${date}-am`} className="sub">AM</th>
                <th key={`${date}-pm`} className="sub">PM</th>
              </>
            ))}
            <th className="sub total">Sess.</th>
            <th className="sub total">Rate</th>
          </tr>
        </thead>

        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.enrollmentId}>
              <td className="num">{row.studentNumber}</td>
              <td className="name">{row.fullName}</td>
              {dates.map((date) => {
                const cell = row.cells[date];
                if (!cell) {
                  // Not marked. A dash, not a blank and certainly not an 'A' —
                  // inventing an absence nobody recorded is the whole reason
                  // there is no stored `not_marked` status.
                  return (
                    <>
                      <td key={`${date}-am`} className="unmarked">—</td>
                      <td key={`${date}-pm`} className="unmarked">—</td>
                    </>
                  );
                }
                const mixed = isPresent(cell.am) !== isPresent(cell.pm) ? ' mixed' : '';
                return (
                  <>
                    <td key={`${date}-am`} className={`s-${cell.am}${mixed}`}>
                      {cell.am ? GLYPH[cell.am] : '—'}
                    </td>
                    <td key={`${date}-pm`} className={`s-${cell.pm}${mixed}`}>
                      {cell.pm ? GLYPH[cell.pm] : '—'}
                    </td>
                  </>
                );
              })}
              <td className="total">
                {row.summary.sessionsPresent}/{row.summary.sessionsMarked}
              </td>
              <td className="total">
                {row.summary.attendanceRate === null ? '—' : `${row.summary.attendanceRate}%`}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={2} className="name">CLASS TOTAL</td>
            <td colSpan={Math.max(dates.length * 2, 1)} className="shape">
              {grid.totals.daysFullyPresent} full days present ·{' '}
              {grid.totals.daysFullyAbsent} full days absent ·{' '}
              {grid.totals.daysPartial} partial
            </td>
            <td className="total">
              {grid.totals.sessionsPresent}/{grid.totals.sessionsMarked}
            </td>
            <td className="total">
              {grid.totals.attendanceRate === null ? '—' : `${grid.totals.attendanceRate}%`}
            </td>
          </tr>
        </tfoot>
      </table>

      <footer>
        <p className="legend">
          <strong>P</strong> present · <strong>L</strong> late (counts as present) ·{' '}
          <strong>A</strong> absent · <strong>E</strong> excused (counts as absent) ·{' '}
          <strong>—</strong> not marked. Each day has two sessions: AM and PM.
        </p>
        <p className="caveat">
          {grid.school.name} · {grid.classroom.displayName} ({grid.classroom.levelName}) ·{' '}
          {grid.term.label} · {grid.range.from} to {grid.range.to}.{' '}
          <strong>Rates are over sessions MARKED in this register</strong>, not over school
          sessions in the term: only dates somebody marked appear as columns, and this
          system holds no school calendar that could tell a holiday from an unmarked day.
          A class that runs mornings only marks both sessions the same, which is expected
          and does not change the rate.
        </p>
      </footer>
    </section>
  );
}

/**
 * Scoped to `.register-print` so it cannot leak into the dashboard chrome, and
 * written in plain CSS rather than utilities because `@page` and the print
 * media query have no utility equivalent.
 */
const PRINT_CSS = `
@page { size: A4 landscape; margin: 10mm; }
.register-print { font-size: 10pt; color: #111; }
.register-print .sheet { background: #fff; padding: 8mm; margin: 0 auto 8mm; max-width: 297mm; }
.register-print .sheet + .sheet { page-break-before: always; }
.register-print header h1 { font-size: 13pt; margin: 0; }
.register-print header h2 { font-size: 11pt; margin: 2pt 0 6pt; font-weight: 600; color: #333; }
.register-print .page-of { font-weight: 400; color: #666; }
.register-print table { border-collapse: collapse; width: 100%; }
.register-print th, .register-print td { border: 0.5pt solid #999; padding: 2pt 3pt; text-align: center; }
.register-print thead th { background: #eee; font-size: 8.5pt; line-height: 1.15; }
.register-print th.sub { font-size: 7.5pt; font-weight: 500; color: #444; }
.register-print .dow, .register-print .dom { display: block; }
.register-print .dow { font-weight: 400; color: #555; }
.register-print th.num, .register-print td.num { width: 18mm; text-align: left; font-variant-numeric: tabular-nums; }
.register-print th.name, .register-print td.name { width: 42mm; text-align: left; }
.register-print td.name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.register-print td.total, .register-print th.total { width: 13mm; font-variant-numeric: tabular-nums; background: #fafafa; }
.register-print td.unmarked { color: #bbb; }
.register-print td.mixed { border-bottom: 1.5pt solid #444; }
.register-print td.s-absent, .register-print td.s-excused { background: #f6f6f6; font-weight: 600; }
.register-print tfoot td { background: #f0f0f0; font-weight: 600; }
.register-print tfoot td.shape { font-weight: 400; }
.register-print footer { margin-top: 4pt; }
.register-print .legend { font-size: 8.5pt; margin: 4pt 0 2pt; }
.register-print .caveat { font-size: 7.5pt; color: #444; margin: 0; line-height: 1.35; }
@media print {
  .no-print { display: none !important; }
  .register-print .sheet { margin: 0; padding: 0; }
}
`;
