'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Receipt, FileText, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { feesApi } from '@/lib/api/endpoints/fees';
import { invoicesApi } from '@/lib/api/endpoints/invoices';
import { notificationsApi } from '@/lib/api/endpoints/notifications';
import { termsApi } from '@/lib/api/endpoints/terms';
import { levelsApi } from '@/lib/api/endpoints/levels';
import { classroomsApi } from '@/lib/api/endpoints/classrooms';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { formatMoney } from '@/lib/money';
import type { BillLine, CreateInvoicePayload, DispatchResult, FeeSummaryStudent, PaymentState } from '@/types/api';
import { PaymentDialog } from './_payment-dialog';

const STATE_VARIANT: Record<PaymentState, 'active' | 'pending' | 'warning'> = {
  paid: 'active', partially_paid: 'warning', pending: 'pending',
};
const STATE_LABEL: Record<PaymentState, string> = {
  paid: 'Paid', partially_paid: 'Part paid', pending: 'Unpaid',
};

export function BillingView() {
  const [yearOverride, setYearOverride] = useState('');
  const [termOverride, setTermOverride] = useState('');
  const [levelOverride, setLevelOverride] = useState('');
  const [billFor, setBillFor] = useState<FeeSummaryStudent | null>(null);
  const [payLine, setPayLine] = useState<BillLine | null>(null);

  const { data: years } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });
  const year = useMemo(
    () => years?.find((y) => y.id === yearOverride) ?? years?.find((y) => y.isActive) ?? years?.[0],
    [years, yearOverride],
  );

  const { data: terms } = useQuery({
    queryKey: queryKeys.terms.list(),
    queryFn: () => termsApi.list().then((r) => r.data.data),
  });
  const termsForYear = useMemo(
    () => (terms ?? []).filter((t) => t.academicYearId === year?.id).sort((a, b) => a.termNumber - b.termNumber),
    [terms, year],
  );
  const term = useMemo(() => {
    if (!termsForYear.length) return undefined;
    return termsForYear.find((t) => t.id === termOverride)
      ?? termsForYear.find((t) => t.status === 'active') ?? termsForYear[termsForYear.length - 1];
  }, [termsForYear, termOverride]);

  const { data: levels } = useQuery({
    queryKey: queryKeys.levels.list(),
    queryFn: () => levelsApi.list().then((r) => r.data.data),
  });

  // Only levels that actually have a classroom in the selected year can have
  // anyone enrolled — and therefore anyone to bill. Offering the full level
  // list would open this page on Crèche showing nothing, which reads as
  // broken rather than as empty.
  const { data: classrooms } = useQuery({
    queryKey: queryKeys.classrooms.list({ academicYearId: year?.id }),
    queryFn: () => classroomsApi.list({ academicYearId: year!.id }).then((r) => r.data.data),
    enabled: !!year?.id,
  });

  const billableLevels = useMemo(() => {
    if (!levels) return [];
    const withClasses = new Set((classrooms ?? []).map((c) => c.levelId));
    const filtered = levels.filter((l) => withClasses.has(l.id));
    // Before the classrooms load, fall back to every level rather than to an
    // empty picker.
    return filtered.length ? filtered : levels;
  }, [levels, classrooms]);

  const level = useMemo(
    () => billableLevels.find((l) => l.id === levelOverride) ?? billableLevels[0],
    [billableLevels, levelOverride],
  );

  const summaryParams = { levelId: level?.id, academicYearId: year?.id, termId: term?.id };
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.fees.summary(summaryParams),
    queryFn: () => feesApi.summary(level!.id, year!.id, term!.id).then((r) => r.data.data),
    enabled: !!level?.id && !!year?.id && !!term?.id,
  });

  const { data: bill } = useQuery({
    queryKey: queryKeys.fees.bill(billFor?.studentId, term?.id),
    queryFn: () => feesApi.bill(billFor!.studentId, term!.id).then((r) => r.data.data),
    enabled: !!billFor?.studentId && !!term?.id,
  });

  /**
   * Manual by design: every reminder is a paid message, so a human decides.
   * Brite has no scheduler and an automatic reminder round is exactly the
   * feature that should not arrive by accident.
   */
  const { mutate: sendReminders, isPending: reminding } = useApiMutation<
    DispatchResult, { termId: string; levelId?: string; studentId?: string }
  >({
    mutationFn: (p) => notificationsApi.sendFeeReminders(p).then((r) => r.data.data),
    successMessage: (r) =>
      r.queued
        ? `${r.queued} reminder(s) queued${r.suppressed ? `, ${r.suppressed} not sent (no SMS consent or no usable number)` : ''}.`
        : (r.message ?? 'Nothing to send — nobody in this selection owes anything.'),
    invalidateKeys: [queryKeys.notifications.all],
  });

  const { mutate: issueInvoice, isPending: issuing } = useApiMutation<
    { invoiceNumber: string }, CreateInvoicePayload
  >({
    mutationFn: (p) => invoicesApi.create(p).then((r) => r.data.data),
    successMessage: (inv) => `Invoice ${inv.invoiceNumber} issued.`,
    invalidateKeys: [queryKeys.invoices.all, queryKeys.fees.all],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="What each student owes this term, what they have paid, and what is carried over from earlier terms."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bl-year" className="text-sm text-muted-foreground">Academic year</Label>
          <Select id="bl-year" className="w-44" value={year?.id ?? ''}
            onChange={(e) => { setYearOverride(e.target.value); setTermOverride(''); }}>
            {(years ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bl-term" className="text-sm text-muted-foreground">Term</Label>
          <Select id="bl-term" className="w-44" value={term?.id ?? ''}
            onChange={(e) => setTermOverride(e.target.value)}>
            {termsForYear.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bl-level" className="text-sm text-muted-foreground">Level</Label>
          <Select id="bl-level" className="w-44" value={level?.id ?? ''}
            onChange={(e) => setLevelOverride(e.target.value)}>
            {billableLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!!summary?.unassignedStudentCount && (
        <div className="flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning-bg)' }}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span id="bl-unassigned">
            <strong>{summary.unassignedStudentCount} student(s) in {summary.level.name} have no
            fees assigned for {summary.term.label}.</strong>{' '}
            They joined after these fees were created. Use <em>Reconcile</em> on the Fees screen
            to assign them.
          </span>
        </div>
      )}

      {summary && !!summary.students.length && (
        <div className="flex justify-end">
          <Button
            size="sm" variant="outline" id="bl-remind-level" disabled={reminding}
            title="Send an SMS reminder to the primary guardian of every student here who still owes something"
            onClick={() => sendReminders({ termId: term!.id, levelId: level!.id })}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send fee reminders to {summary.level.name}
          </Button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Students', value: String(summary.studentCount) },
            { label: 'Billed', value: formatMoney(summary.totals.billed) },
            { label: 'Collected', value: formatMoney(summary.totals.collected) },
            { label: 'Outstanding', value: formatMoney(summary.totals.outstanding) },
          ].map((s) => (
            <Card key={s.label} className="p-3 gap-0">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{s.value}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Student No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">B/f</TableHead>
              <TableHead className="text-right">Total due</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right pr-4">Bill</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? <TableSkeleton columns={9} />
            : !summary?.students.length ? <EmptyTable columns={9} message="No active enrolments in this level." />
            : (
              <TableBody>
                {summary.students.map((s) => (
                  <TableRow key={s.enrollmentId}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{s.studentNumber}</TableCell>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.classroom}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.billed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.collected)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMoney(s.broughtForward)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatMoney(s.totalDue)}</TableCell>
                    <TableCell>
                      {s.paymentState
                        ? <StatusBadge variant={STATE_VARIANT[s.paymentState]} label={STATE_LABEL[s.paymentState]} />
                        : <StatusBadge variant="inactive" label="No fees" />}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        data-student={s.studentNumber} onClick={() => setBillFor(s)}>
                        <FileText className="mr-1 h-3.5 w-3.5" /> Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
        </Table>
      </Card>

      <FormDialog open={!!billFor} onOpenChange={(o) => { if (!o) setBillFor(null); }}
        maxWidth="max-w-2xl"
        title={billFor ? `Bill — ${billFor.fullName}` : 'Bill'}
        description={term ? `${term.label}` : undefined}>
        {bill && (
          <div className="space-y-4">
            <Card className="p-0 gap-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right pr-4">Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bill.lines.map((l) => (
                    <TableRow key={l.feeAssignmentId}>
                      <TableCell>
                        <span className="font-medium">{l.feeTypeName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{l.name}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.billed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.collected)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.outstanding)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          disabled={l.paymentState === 'paid'} onClick={() => setPayLine(l)}>
                          <Receipt className="mr-1 h-3.5 w-3.5" /> Record
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">This term</span>
                <span className="tabular-nums">{formatMoney(bill.currentTermOutstanding)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brought forward</span>
                <span className="tabular-nums">{formatMoney(bill.broughtForward)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Total due</span>
                <span className="tabular-nums">{formatMoney(bill.totalDue)}</span>
              </div>
            </div>

            <NoticeBar>
              Brought forward is unpaid fees from <strong>earlier terms</strong>. It is shown here,
              never re-billed as a line — the original term&rsquo;s fees remain the record of that debt.
            </NoticeBar>

            {billFor && bill.totalDue !== '0.00' && (
              <Button
                size="sm" variant="outline" id="bl-remind-student" disabled={reminding}
                onClick={() => sendReminders({ termId: term!.id, studentId: billFor.studentId })}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Send a reminder to {billFor.fullName}&rsquo;s guardian
              </Button>
            )}

            {!!bill.lines.length && billFor && (
              <Button size="sm" variant="outline" id="bl-issue-invoice" disabled={issuing}
                onClick={() => issueInvoice({
                  enrollmentId: billFor.enrollmentId,
                  termId: term!.id,
                  feeAssignmentIds: bill.lines.map((l) => l.feeAssignmentId),
                })}>
                Issue an invoice for these {bill.lines.length} fee(s)
              </Button>
            )}
          </div>
        )}
      </FormDialog>

      <PaymentDialog
        line={payLine}
        studentName={billFor?.fullName ?? ''}
        open={!!payLine}
        onOpenChange={(o) => { if (!o) setPayLine(null); }}
      />
    </div>
  );
}
