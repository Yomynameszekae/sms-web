'use client';

import { ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@/types/api';

/**
 * The four statuses, and the ONE place the UI describes what they mean for
 * the rate. The arithmetic itself lives on the backend
 * (attendance.reporting.ts) and is never repeated here — these labels only
 * explain it.
 */
export const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
};

/** How each status is counted in the attendance rate. */
export const STATUS_COUNTS_AS: Record<AttendanceStatus, 'present' | 'absent'> = {
  present: 'present',
  late: 'present',
  absent: 'absent',
  excused: 'absent',
};

/**
 * Semantic tokens, never the design file's literal hex. Each status keeps the
 * meaning the rest of the app already gives that colour, so the register reads
 * correctly on all five themes and in both light and dark.
 */
const STATUS_STYLE: Record<AttendanceStatus, { bg: string; color: string }> = {
  present: { bg: 'var(--success-bg)', color: 'var(--success)' },
  late: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  absent: { bg: 'var(--error-bg)', color: 'var(--error)' },
  excused: { bg: 'var(--info-bg)', color: 'var(--info)' },
};

export function AttendanceStatusPill({
  status,
  className,
}: {
  status: AttendanceStatus | null;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
          className,
        )}
        style={{ backgroundColor: 'var(--inactive-bg)', color: 'var(--inactive)' }}
      >
        Not marked
      </span>
    );
  }
  const { bg, color } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
        className,
      )}
      style={{ backgroundColor: bg, color }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * The session label that sits in front of a picker — ALL DAY, AM or PM.
 *
 * ALL DAY is tinted with the accent so the common case reads as the settled
 * one, and a row showing AM/PM instead is visibly the exception.
 */
export function SessionTag({ children, day }: { children: React.ReactNode; day?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded px-1.5 py-1 text-[10px] font-bold uppercase leading-none tracking-wider"
      style={
        day
          ? { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--border)' }
          : { backgroundColor: 'var(--surface-alt)', color: 'var(--muted-text)', border: '1px solid var(--border)' }
      }
    >
      {children}
    </span>
  );
}

/**
 * Segmented status picker for ONE SESSION of a register row.
 *
 * `session` only affects the element ids, so the morning and afternoon
 * controls of the same row stay addressable apart. The dot carries the status
 * colour at low opacity until selected, which gives the unselected buttons a
 * legible resting state without four competing colours in every row.
 */
export function StatusPicker({
  value,
  disabled,
  onChange,
  rowId,
  session = 'morning',
}: {
  value: AttendanceStatus | null;
  disabled?: boolean;
  onChange: (status: AttendanceStatus) => void;
  rowId: string;
  session?: 'morning' | 'afternoon';
}) {
  const prefix = session === 'afternoon' ? `att-pm-${rowId}` : `att-${rowId}`;
  return (
    <div className="inline-flex flex-wrap gap-1.5" role="group">
      {STATUSES.map((status) => {
        const active = value === status;
        const style = STATUS_STYLE[status];
        return (
          <button
            key={status}
            type="button"
            id={`${prefix}-${status}`}
            data-status={status}
            data-session={session}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex h-[34px] min-w-[86px] items-center justify-center gap-2 rounded-[10px]',
              'border text-[12.5px] font-semibold transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !active && 'text-muted-foreground hover:bg-muted',
            )}
            style={
              active
                ? { backgroundColor: style.bg, color: style.color, borderColor: style.color }
                : { borderColor: 'var(--border)' }
            }
          >
            <span
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: style.color, opacity: active ? 1 : 0.4 }}
            />
            {STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A row's whole attendance control: one mark for the day, or two.
 *
 * The register is per SESSION. Most days both halves agree, so the resting
 * state is a single ALL DAY control and the row only grows a second picker
 * when a teacher says the two differ — which is also exactly what the API
 * means by an omitted afternoon.
 *
 * Splitting does NOT write an afternoon value. The PM picker simply displays
 * the morning until the teacher moves it, so opening the split and changing
 * nothing leaves the row unedited and produces no amendment.
 *
 * NOTE FOR ANYONE READING THIS SCREEN: a Creche or nursery class that runs
 * mornings only leaves every row on ALL DAY. That is expected, not a bug.
 */
export function SessionControl({
  rowId,
  morning,
  afternoon,
  split,
  disabled,
  onMorningChange,
  onAfternoonChange,
  onSplitChange,
  onUseOneMark,
}: {
  rowId: string;
  morning: AttendanceStatus | null;
  afternoon: AttendanceStatus | null;
  split: boolean;
  disabled?: boolean;
  onMorningChange: (status: AttendanceStatus) => void;
  onAfternoonChange: (status: AttendanceStatus) => void;
  onSplitChange: (split: boolean) => void;
  onUseOneMark: () => void;
}) {
  if (!split) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <SessionTag day>All day</SessionTag>
          <StatusPicker rowId={rowId} value={morning} disabled={disabled} onChange={onMorningChange} />
        </div>
        <button
          type="button"
          id={`att-pm-${rowId}-mirror`}
          data-session="afternoon"
          data-mirrored="true"
          disabled={disabled}
          onClick={() => onSplitChange(true)}
          className={cn(
            'inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border px-3',
            'text-xs font-semibold transition-colors hover:bg-muted',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Split AM / PM
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <SessionTag>AM</SessionTag>
          <StatusPicker rowId={rowId} value={morning} disabled={disabled} onChange={onMorningChange} />
        </div>
        <div className="flex items-center gap-2">
          <SessionTag>PM</SessionTag>
          <StatusPicker
            rowId={rowId}
            session="afternoon"
            value={afternoon ?? morning}
            disabled={disabled}
            onChange={onAfternoonChange}
          />
        </div>
      </div>
      <button
        type="button"
        id={`att-pm-${rowId}-clear`}
        disabled={disabled}
        onClick={() => { onUseOneMark(); onSplitChange(false); }}
        className={cn(
          'inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border border-transparent px-2.5',
          'text-xs font-semibold text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground disabled:opacity-50',
        )}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        Use one mark
      </button>
    </div>
  );
}
