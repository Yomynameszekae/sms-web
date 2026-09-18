'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Lock, PencilLine, Undo2 } from 'lucide-react';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { attendanceApi } from '@/lib/api/endpoints/attendance';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type {
  AttendanceStatus, MarkRegisterPayload, MarkRegisterResult,
} from '@/types/api';
import {
  AfternoonControl, AttendanceStatusPill, STATUSES, STATUS_LABELS, StatusPicker,
} from './_status';

/**
 * A row the user has touched. Held as a SPARSE OVERLAY over the server's rows
 * rather than as a copy of them: an untouched row has no entry here, so there
 * is nothing to keep in sync when the register reloads and no effect that
 * copies server state into local state.
 */
interface RowEdit {
  status?: AttendanceStatus;
  reason?: string;
  /** null means "mirror the morning" — the same meaning the API gives an omitted afternoon. */
  afternoonStatus?: AttendanceStatus | null;
  afternoonReason?: string;
}

export function RegisterPanel({
  classroomId,
  date,
  onDateChange,
}: {
  classroomId: string;
  date: string;
  onDateChange: (date: string) => void;
}) {
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.attendance.register(classroomId, date),
    queryFn: () => attendanceApi.register(classroomId, date).then((r) => r.data.data),
    enabled: !!classroomId && !!date,
  });

  const { mutate: save, isPending: saving } = useApiMutation<
    MarkRegisterResult, MarkRegisterPayload
  >({
    mutationFn: (p) => attendanceApi.markRegister(p).then((r) => r.data.data),
    successMessage: (result) => {
      const parts: string[] = [];
      if (result.createdCount) parts.push(`${result.createdCount} marked`);
      if (result.amendedCount) parts.push(`${result.amendedCount} amended`);
      // Saving an unchanged register is a legitimate no-op, and saying so is
      // better than a success message that implies something was written.
      return parts.length ? `Register saved — ${parts.join(', ')}.` : 'No changes to save.';
    },
    invalidateKeys: [queryKeys.attendance.all],
    // The server's rows become the new baseline, so the overlay is spent.
    onSuccess: () => setEdits({}),
  });

  /**
   * The value shown for a row: the user's edit if there is one, else the
   * server's. All FOUR fields, because the endpoint is declarative and a
   * payload has to describe a complete register state — see the note on
   * `MarkRegisterPayload.marks[].afternoon`.
   */
  const effective = useMemo(() => {
    const map: Record<
      string,
      {
        status: AttendanceStatus | null;
        reason: string;
        afternoonStatus: AttendanceStatus | null;
        afternoonReason: string;
      }
    > = {};
    for (const row of data?.rows ?? []) {
      const edit = edits[row.enrollmentId];
      map[row.enrollmentId] = {
        status: edit?.status ?? row.morningStatus,
        reason: edit?.reason ?? row.morningReason ?? '',
        afternoonStatus:
          edit?.afternoonStatus !== undefined
            ? edit.afternoonStatus
            : row.afternoonStatus,
        afternoonReason: edit?.afternoonReason ?? row.afternoonReason ?? '',
      };
    }
    return map;
  }, [data, edits]);

  const dirty = useMemo(
    () =>
      (data?.rows ?? []).some((row) => {
        const value = effective[row.enrollmentId];
        return (
          value.status !== row.morningStatus ||
          value.reason !== (row.morningReason ?? '') ||
          value.afternoonStatus !== row.afternoonStatus ||
          value.afternoonReason !== (row.afternoonReason ?? '')
        );
      }),
    [data, effective],
  );

  const marked = useMemo(
    () => Object.values(effective).filter((v) => v.status !== null).length,
    [effective],
  );

  /**
   * Live counts over the UNSAVED overlay, so they move as the teacher marks.
   *
   * This is the ONE place a count is computed client-side, and only because
   * there is no server figure for edits that have not been sent yet. It is
   * deliberately not a rate — no percentage is derived here. Every persisted
   * figure (attendanceRate, sessionsPresent, daysPartial on the summary
   * screen) comes from attendance.reporting.ts, which stays the single
   * definition. The fold below must match PRESENT_STATUSES there.
   */
  const countOf = (status: AttendanceStatus) =>
    Object.values(effective).reduce(
      (n, v) =>
        n +
        (v.status === status ? 1 : 0) +
        ((v.afternoonStatus ?? v.status) === status ? 1 : 0),
      0,
    );

  /** Days whose two sessions disagree — what session attendance exists to show. */
  const partialCount = useMemo(
    () =>
      Object.values(effective).filter((v) => {
        const pm = v.afternoonStatus ?? v.status;
        if (v.status === null || pm === null) return false;
        const present = (st: AttendanceStatus) => st === 'present' || st === 'late';
        return present(v.status) !== present(pm);
      }).length,
    [effective],
  );

  function setAll(status: AttendanceStatus) {
    setEdits(() => {
      const next: Record<string, RowEdit> = {};
      for (const row of data?.rows ?? []) {
        next[row.enrollmentId] = { ...edits[row.enrollmentId], status };
      }
      return next;
    });
  }

  /** Discarding is just dropping the overlay — the server rows are untouched. */
  function reset() {
    setEdits({});
  }

  function submit() {
    if (!data) return;
    // COMPLETE ROWS, always. The endpoint treats an omitted `afternoon` as
    // "mirror the morning" on amend as well as on create, so sending a partial
    // patch would silently reset an afternoon somebody had set. Every row here
    // carries its full effective state, which is what makes that rule safe.
    const marks = data.rows
      .map((row) => ({ row, value: effective[row.enrollmentId] }))
      .filter(({ value }) => value && value.status !== null)
      .map(({ row, value }) => {
        const pm = value.afternoonStatus;
        return {
          enrollmentId: row.enrollmentId,
          status: value.status as AttendanceStatus,
          reason: value.reason.trim() || undefined,
          // Omitted only when the afternoon genuinely mirrors the morning,
          // which is the same statement the API's default makes.
          ...(pm !== null && pm !== value.status
            ? { afternoon: { status: pm, reason: value.afternoonReason.trim() || undefined } }
            : {}),
        };
      });

    // The backend rejects an empty marks array; nothing to send is not an error.
    if (!marks.length) return;
    save({ classroomId, date, marks });
  }

  const editable = data?.editable ?? false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label htmlFor="att-date" className="text-sm text-muted-foreground">Date</label>
          <Input
            id="att-date"
            type="date"
            className="w-44"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>

        {data?.term && (
          <div className="space-y-1 text-sm">
            <span className="text-muted-foreground">Term</span>
            <div className="font-medium">
              {data.term.label}
              <span className="ml-2 text-xs text-muted-foreground">
                ({data.term.status})
              </span>
            </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {editable && (
            <>
              <span className="text-xs text-muted-foreground mr-1">Mark all</span>
              {STATUSES.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  id={`att-all-${status}`}
                  className="h-8 text-xs"
                  onClick={() => setAll(status)}
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
            </>
          )}
        </div>
      </div>

      {data && !editable && data.lockReason && (
        <NoticeBar variant="lock">{data.lockReason}</NoticeBar>
      )}

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {data && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            {marked} of {data.rows.length} marked
          </span>
          {STATUSES.map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <AttendanceStatusPill status={status} />
              <span className="tabular-nums">{countOf(status)}</span>
            </span>
          ))}
          <span className="text-muted-foreground">
            sessions · {partialCount} partial {partialCount === 1 ? 'day' : 'days'}
          </span>
        </div>
      )}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Student No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="w-[340px]">Morning / Afternoon</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={4} />
          ) : !data?.rows.length ? (
            <EmptyTable
              columns={4}
              message="No active enrolments in this classroom, so there is no register to mark."
            />
          ) : (
            <TableBody>
              {data.rows.map((row) => {
                const value = effective[row.enrollmentId] ?? {
                  status: row.morningStatus,
                  reason: row.morningReason ?? '',
                  afternoonStatus: row.afternoonStatus,
                  afternoonReason: row.afternoonReason ?? '',
                };
                return (
                  <TableRow key={row.enrollmentId} data-enrollment={row.enrollmentId}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {row.studentNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {row.fullName}
                        {row.amended && (
                          <span
                            title="This row was amended after it was first marked"
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                          >
                            <PencilLine className="h-3 w-3" />
                            amended
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <span className="flex flex-col items-start gap-1">
                          <StatusPicker
                            rowId={row.studentNumber}
                            value={value.status}
                            onChange={(status) =>
                              setEdits((prev) => ({
                                ...prev,
                                [row.enrollmentId]: { ...prev[row.enrollmentId], status },
                              }))
                            }
                          />
                          <AfternoonControl
                            rowId={row.studentNumber}
                            morning={value.status}
                            afternoon={value.afternoonStatus}
                            onChange={(status) =>
                              setEdits((prev) => ({
                                ...prev,
                                [row.enrollmentId]: {
                                  ...prev[row.enrollmentId],
                                  afternoonStatus: status,
                                },
                              }))
                            }
                            onReset={() =>
                              setEdits((prev) => ({
                                ...prev,
                                [row.enrollmentId]: {
                                  ...prev[row.enrollmentId],
                                  // null, not undefined: an explicit "mirror the
                                  // morning" that overrides the server's value.
                                  afternoonStatus: null,
                                  afternoonReason: '',
                                },
                              }))
                            }
                          />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <AttendanceStatusPill status={row.morningStatus} />
                          {row.afternoonStatus !== row.morningStatus && (
                            <>
                              <span className="text-[11px] text-muted-foreground">PM</span>
                              <AttendanceStatusPill status={row.afternoonStatus} />
                            </>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <span className="flex flex-col gap-1">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Optional note"
                            value={value.reason}
                            onChange={(e) =>
                              setEdits((prev) => ({
                                ...prev,
                                [row.enrollmentId]: {
                                  ...prev[row.enrollmentId],
                                  reason: e.target.value,
                                },
                              }))
                            }
                          />
                          {value.afternoonStatus !== null &&
                            value.afternoonStatus !== value.status && (
                              <Input
                                className="h-7 text-[11px]"
                                placeholder="Afternoon note"
                                value={value.afternoonReason}
                                onChange={(e) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [row.enrollmentId]: {
                                      ...prev[row.enrollmentId],
                                      afternoonReason: e.target.value,
                                    },
                                  }))
                                }
                              />
                            )}
                        </span>
                      ) : (
                        <span className="flex flex-col text-xs text-muted-foreground">
                          <span>{row.morningReason ?? '—'}</span>
                          {row.afternoonReason && <span>PM: {row.afternoonReason}</span>}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          )}
        </Table>
      </Card>

      {editable && !!data?.rows.length && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            id="att-reset"
            disabled={!dirty || saving}
            onClick={reset}
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            Discard changes
          </Button>
          <Button size="sm" id="att-save" disabled={saving || marked === 0} onClick={submit}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save register'}
          </Button>
        </div>
      )}

      {!editable && data && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          This register is read-only.
        </p>
      )}
    </div>
  );
}
