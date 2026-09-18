'use client';

import { useState } from 'react';
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
 * Segmented status picker for ONE SESSION of a register row.
 *
 * `session` only affects sizing and the element ids: the afternoon control is
 * visually secondary so a teacher marking a normal day reads one obvious
 * control per child and the PM sits quietly beneath it.
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
  const secondary = session === 'afternoon';
  const prefix = secondary ? `att-pm-${rowId}` : `att-${rowId}`;
  return (
    <div className="inline-flex rounded-lg border overflow-hidden" role="group">
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
              'font-medium transition-colors border-r last:border-r-0',
              secondary ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !active && 'text-muted-foreground hover:bg-muted',
            )}
            style={active ? { backgroundColor: style.bg, color: style.color } : undefined}
          >
            {STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The afternoon control for one row.
 *
 * Until the afternoon diverges it reads "same as morning" rather than showing
 * a second identical picker — the common case is a whole day with one status,
 * and making a teacher set two controls for it would be the feature getting in
 * the way of the work. Divergence is one click away and stays visible once
 * chosen.
 *
 * NOTE FOR ANYONE READING THIS SCREEN: a Creche or nursery class that runs
 * mornings only marks both sessions the same. That is expected, not a bug and
 * not a data-entry error — the rate comes out identical to a morning-only
 * count.
 */
export function AfternoonControl({
  morning,
  afternoon,
  disabled,
  onChange,
  onReset,
  rowId,
}: {
  morning: AttendanceStatus | null;
  afternoon: AttendanceStatus | null;
  disabled?: boolean;
  onChange: (status: AttendanceStatus) => void;
  onReset: () => void;
  rowId: string;
}) {
  const diverged = afternoon !== null && morning !== null && afternoon !== morning;
  // Collapsed until the teacher asks for it, or until the row already has a
  // divergent afternoon to show.
  const [open, setOpen] = useState(false);
  const expanded = open || diverged;

  if (!expanded) {
    return (
      <button
        type="button"
        id={`att-pm-${rowId}-mirror`}
        data-session="afternoon"
        data-mirrored="true"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2',
          'hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        PM: same as morning
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">PM</span>
      <StatusPicker
        session="afternoon"
        rowId={rowId}
        value={afternoon ?? morning}
        disabled={disabled}
        onChange={onChange}
      />
      <button
        type="button"
        id={`att-pm-${rowId}-clear`}
        disabled={disabled}
        onClick={() => {
          setOpen(false);
          onReset();
        }}
        className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        match AM
      </button>
    </span>
  );
}
