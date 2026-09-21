'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Ban, PencilLine } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { isPermissionDenied } from '@/lib/api/errors';
import { NoticeBar } from '@/components/shared/notice-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { invoicesApi } from '@/lib/api/endpoints/invoices';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { formatMoney } from '@/lib/money';
import type { Invoice, InvoiceStatus, PaymentState } from '@/types/api';
import { CorrectionChain } from './_chain';

const STATE_VARIANT: Record<PaymentState, 'active' | 'pending' | 'warning'> = {
  paid: 'active', partially_paid: 'warning', pending: 'pending',
};
const STATE_LABEL: Record<PaymentState, string> = {
  paid: 'Paid', partially_paid: 'Part paid', pending: 'Unpaid',
};

const reasonSchema = z.object({
  reason: z.string().min(10, 'Give a reason of at least 10 characters — it goes into the audit trail'),
});
type ReasonValues = z.infer<typeof reasonSchema>;

export function InvoicesView() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [action, setAction] = useState<'cancel' | 'correct' | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.invoices.list({ status: statusFilter }),
    queryFn: () => invoicesApi.list(statusFilter ? { status: statusFilter } : {}).then((r) => r.data.data),
  });

  const { data: detail } = useQuery({
    queryKey: queryKeys.invoices.detail(openId ?? undefined),
    queryFn: () => invoicesApi.get(openId!).then((r) => r.data.data),
    enabled: !!openId,
  });

  const form = useForm<ReasonValues>({
    resolver: zodResolver(reasonSchema), defaultValues: { reason: '' },
  });

  const INVALIDATE = [queryKeys.invoices.all, queryKeys.fees.all];

  const { mutate: cancel, isPending: cancelling } = useApiMutation<Invoice, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => invoicesApi.cancel(id, reason).then((r) => r.data.data),
    successMessage: (inv) =>
      inv.paymentsRetained
        ? `${inv.invoiceNumber} cancelled. ${inv.paymentsRetained} payment(s) totalling ${formatMoney(inv.paymentsRetainedTotal)} remain recorded.`
        : `${inv.invoiceNumber} cancelled.`,
    invalidateKeys: INVALIDATE,
    onSuccess: () => { setAction(null); form.reset(); },
  });

  const { mutate: correct, isPending: correcting } = useApiMutation<Invoice, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => invoicesApi.correct(id, { reason }).then((r) => r.data.data),
    successMessage: (inv) => `Reissued as ${inv.invoiceNumber}.`,
    invalidateKeys: INVALIDATE,
    // Follow the chain to the replacement, which is the invoice that now matters.
    onSuccess: (inv) => { setAction(null); form.reset(); setOpenId(inv.id); },
  });

  const rows = data?.items ?? [];
  const canAct = detail?.status === 'issued' && !detail?.supersededByInvoiceId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Formal bills issued to parents. An invoice fixes which fees it covers; what has been paid against them is always read live."
      />

      <NoticeBar>
        An invoice stores no money of its own. <strong>Billed, paid and outstanding are read
        from the fees underneath it every time it is opened</strong>, so a payment or a reversal
        shows up here without anything needing to be kept in step.
      </NoticeBar>

      <div className="flex items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-status" className="text-sm text-muted-foreground">Status</Label>
          <Select id="inv-status" className="w-44" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}>
            <option value="">All</option>
            <option value="issued">Issued</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!isPermissionDenied(error) && (
        <Card className="p-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Number</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right pr-4">Open</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? <TableSkeleton columns={8} />
              : !rows.length ? <EmptyTable columns={8} message="No invoices issued yet." />
              : (
                <TableBody>
                  {rows.map((i) => (
                    <TableRow key={i.id} className={i.status === 'cancelled' ? 'opacity-60' : ''}>
                      <TableCell className="font-medium tabular-nums">
                        {i.invoiceNumber}
                        {i.supersedesInvoiceId && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground">(correction)</span>
                        )}
                      </TableCell>
                      <TableCell>{i.student.fullName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.term.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(i.billed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(i.outstanding)}</TableCell>
                      <TableCell>
                        <StatusBadge variant={i.status === 'issued' ? 'active' : 'archived'}
                          label={i.status === 'issued' ? 'Issued' : 'Cancelled'} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={STATE_VARIANT[i.paymentState]} label={STATE_LABEL[i.paymentState]} />
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          data-invoice={i.invoiceNumber} onClick={() => setOpenId(i.id)}>
                          <FileText className="mr-1 h-3.5 w-3.5" /> Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
          </Table>
        </Card>
      )}

      <FormDialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setAction(null); } }}
        maxWidth="max-w-2xl"
        title={detail ? `Invoice ${detail.invoiceNumber}` : 'Invoice'}
        description={detail ? `${detail.student.fullName} · ${detail.classroom} · ${detail.term.label}` : undefined}>
        {detail && (
          <div className="space-y-4">
            <CorrectionChain invoice={detail} />

            {detail.status === 'cancelled' && detail.cancellationReason && (
              <NoticeBar variant="lock">
                Cancelled: {detail.cancellationReason}
              </NoticeBar>
            )}

            <Card className="p-0 gap-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right pr-4">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.lines.map((l) => (
                    <TableRow key={l.invoiceLineId}>
                      <TableCell>
                        <span className="font-medium">{l.feeTypeName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{l.name}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.billed)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(l.collected)}</TableCell>
                      <TableCell className="text-right pr-4 tabular-nums">{formatMoney(l.outstanding)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium bg-muted/40">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(detail.billed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(detail.collected)}</TableCell>
                    <TableCell className="text-right pr-4 tabular-nums">{formatMoney(detail.outstanding)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Issued {detail.issuedOn.slice(0, 10)}</span>
              {detail.dueOn && <span className="text-muted-foreground">Due {detail.dueOn.slice(0, 10)}</span>}
              <StatusBadge variant={STATE_VARIANT[detail.paymentState]} label={STATE_LABEL[detail.paymentState]} />
            </div>

            {canAct && (
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button size="sm" variant="outline" id="inv-correct"
                  onClick={() => { form.reset(); setAction('correct'); }}>
                  <PencilLine className="mr-1.5 h-3.5 w-3.5" /> Correct &amp; reissue
                </Button>
                <Button size="sm" variant="outline" id="inv-cancel"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { form.reset(); setAction('cancel'); }}>
                  <Ban className="mr-1.5 h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </FormDialog>

      <FormDialog open={!!action} onOpenChange={(o) => { if (!o) setAction(null); }}
        title={action === 'correct' ? 'Correct and reissue' : 'Cancel this invoice'}
        description={
          action === 'correct'
            ? 'The current invoice is cancelled and a new one is issued in its place, with a new number. Both stay in the record, linked to each other.'
            : 'The invoice is withdrawn. Payments already recorded against these fees are NOT affected — they keep their receipts.'
        }
        footer={
          <FormFooter onCancel={() => setAction(null)} isPending={cancelling || correcting}
            formId="invoice-reason-form"
            submitLabel={action === 'correct' ? 'Correct & reissue' : 'Cancel invoice'} />
        }>
        {detail && (
          <form id="invoice-reason-form" className="space-y-4"
            onSubmit={form.handleSubmit((v) =>
              action === 'correct'
                ? correct({ id: detail.id, reason: v.reason })
                : cancel({ id: detail.id, reason: v.reason }))}>
            {action === 'cancel' && detail.collected !== '0.00' && (
              <NoticeBar variant="lock">
                {formatMoney(detail.collected)} has already been paid against these fees. That money
                stays recorded and keeps its receipts — cancelling withdraws the demand, not the payment.
              </NoticeBar>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="inv-reason">Reason *</Label>
              <Textarea id="inv-reason" rows={3}
                placeholder="e.g. Transport billed in error — this child does not use the bus"
                {...form.register('reason')} />
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
            </div>
          </form>
        )}
      </FormDialog>
    </div>
  );
}
