'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { attendanceApi } from '@/lib/api/endpoints/attendance';
import { queryKeys } from '@/lib/query-keys';
import { apiErrorMessage } from '@/lib/api/errors';
import type { Term } from '@/types/api';

function rate(value: number | null) {
  // A child nobody marked has no rate. Rendering 0% would be a lie.
  return value === null ? '—' : `${value}%`;
}

export function SummaryPanel({
  classroomId,
  terms,
  termId,
  onTermChange,
}: {
  classroomId: string;
  terms: Term[];
  termId: string;
  onTermChange: (termId: string) => void;
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.attendance.classroomSummary(classroomId, termId),
    queryFn: () =>
      attendanceApi.classroomSummary(classroomId, termId).then((r) => r.data.data),
    enabled: !!classroomId && !!termId,
  });

  async function download() {
    try {
      const response = await attendanceApi.exportClassroomSummary(classroomId, termId);
      // The filename is the server's to choose — it is part of the export
      // format, which lives in the backend formatter, not here.
      const disposition = String(response.headers['content-disposition'] ?? '');
      const match = disposition.match(/filename="?([^";]+)"?/);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = match?.[1] ?? 'attendance.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  const totals = data?.classroomTotals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="att-term" className="text-sm text-muted-foreground">Term</Label>
          <Select
            id="att-term"
            className="w-56"
            value={termId}
            onChange={(e) => onTermChange(e.target.value)}
          >
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label} ({term.status})
              </option>
            ))}
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* A link rather than a Button: it opens a separate print view. */}
          <Link
            id="att-print-register"
            href={`/attendance/print?classroomId=${classroomId}&termId=${termId}`}
            target="_blank"
            aria-disabled={!classroomId || !termId}
            className={cn(
              buttonVariants({ size: 'sm', variant: 'outline' }),
              (!classroomId || !termId) && 'pointer-events-none opacity-50',
            )}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Printable register
          </Link>
          <Button
            size="sm"
            variant="outline"
            id="att-export"
            disabled={!data}
            onClick={download}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <NoticeBar>
        Each day has two sessions, morning and afternoon. Rates are over{' '}
        <strong>sessions marked in this register</strong>, not over school sessions in the
        term. Brite does not yet hold a school calendar, so it cannot tell an unmarked day
        from a holiday. A class that runs mornings only marks both sessions the same —
        that is expected, and it gives the same rate a morning-only count would.
      </NoticeBar>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {[
            { label: 'Dates marked', value: data.datesMarked },
            { label: 'Sessions present', value: totals?.sessionsPresent ?? 0 },
            { label: 'Sessions absent', value: totals?.sessionsAbsent ?? 0 },
            { label: 'Sessions marked', value: totals?.sessionsMarked ?? 0 },
            // The number session attendance exists to surface: days a child was
            // in school for one half and not the other.
            { label: 'Partial days', value: totals?.daysPartial ?? 0 },
            { label: 'Class rate', value: rate(totals?.attendanceRate ?? null) },
          ].map((stat) => (
            <Card key={stat.label} className="p-3 gap-0">
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Student No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">Excused</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Partial</TableHead>
              <TableHead className="text-right pr-4">Rate</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={9} />
          ) : !data?.students.length ? (
            <EmptyTable columns={9} message="No active enrolments in this classroom." />
          ) : (
            <TableBody>
              {data.students.map((row) => (
                <TableRow key={row.enrollmentId}>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {row.studentNumber}
                  </TableCell>
                  <TableCell className="font-medium">{row.fullName}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.summary.present}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.summary.late}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.summary.absent}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.summary.excused}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.summary.sessionsMarked}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.summary.daysPartial}
                  </TableCell>
                  <TableCell className="text-right pr-4 tabular-nums font-medium">
                    {rate(row.summary.attendanceRate)}
                  </TableCell>
                </TableRow>
              ))}
              {totals && (
                <TableRow className="font-medium bg-muted/40">
                  <TableCell />
                  <TableCell>Class total</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.present}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.late}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.absent}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.excused}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.sessionsMarked}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{totals.daysPartial}</TableCell>
                  <TableCell className="text-right pr-4 tabular-nums">
                    {rate(totals.attendanceRate)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Late counts as present; excused counts as absent. Both are also shown in their own
        columns, and every count is over sessions — a day contributes two. “Partial” is
        the number of days a child was in school for one session and not the other.
      </p>
    </div>
  );
}
