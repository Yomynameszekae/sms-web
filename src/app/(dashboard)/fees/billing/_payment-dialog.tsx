'use client';

import { useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RotateCcw } from 'lucide-react';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { NoticeBar } from '@/components/shared/notice-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { feesApi } from '@/lib/api/endpoints/fees';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { formatMoney } from '@/lib/money';
import type { BillLine, CreatePaymentPayload, FeePaymentMethod, MomoProviderCode } from '@/types/api';

/**
 * Methods in market-weight order — mobile money dominates Ghanaian school fee
 * collection, cash remains common, card is marginal. The backend enum is
 * declared in the same order for the same reason.
 */
const METHODS: { value: FeePaymentMethod; label: string }[] = [
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
];

/** Networks, not brands-in-an-enum: these churn (Vodafone Cash → Telecel Cash). */
const PROVIDERS: { value: MomoProviderCode; label: string }[] = [
  { value: 'MTN', label: 'MTN MoMo' },
  { value: 'TELECEL', label: 'Telecel Cash' },
  { value: 'AIRTELTIGO', label: 'AT Money' },
];

const schema = z.object({
  amount: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 200 or 200.50')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
  method: z.enum(['mobile_money', 'cash', 'bank_transfer', 'cheque', 'card']),
  providerCode: z.string().optional(),
  reference: z.string().optional(),
  paidOn: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function PaymentDialog({
  line, studentName, open, onOpenChange,
}: {
  line: BillLine | null;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: history } = useQuery({
    queryKey: queryKeys.fees.assignmentPayments(line?.feeAssignmentId),
    queryFn: () => feesApi.paymentsForAssignment(line!.feeAssignmentId).then((r) => r.data.data),
    enabled: !!line?.feeAssignmentId && open,
  });

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '', method: 'mobile_money', providerCode: 'MTN',
      reference: '', paidOn: new Date().toISOString().slice(0, 10), notes: '',
    },
  });
  // useWatch rather than form.watch(): the latter returns a fresh function
  // each render and cannot be memoized, which the lint rule flags.
  const method = useWatch({ control: form.control, name: 'method' });

  const { mutate: record, isPending } = useApiMutation<{ receiptNumber: string | null }, CreatePaymentPayload>({
    mutationFn: (p) => feesApi.createPayment(p).then((r) => r.data.data),
    successMessage: (res) => `Payment recorded — receipt ${res.receiptNumber}.`,
    invalidateKeys: [queryKeys.fees.all, queryKeys.invoices.all],
    onSuccess: () => { form.reset(); onOpenChange(false); },
  });

  const { mutate: reverse } = useApiMutation<unknown, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => feesApi.reversePayment(id, reason).then((r) => r.data.data),
    successMessage: 'Payment reversed. The original receipt still stands.',
    invalidateKeys: [queryKeys.fees.all, queryKeys.invoices.all],
  });

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title="Record a payment"
      description={line ? `${studentName} — ${line.feeTypeName}: ${line.name}` : undefined}
      maxWidth="max-w-xl"
      footer={<FormFooter onCancel={() => onOpenChange(false)} isPending={isPending}
        formId="payment-form" submitLabel="Record payment" />}
    >
      {history && (
        <NoticeBar>
          Outstanding <strong>{formatMoney(history.outstanding)}</strong> of{' '}
          {formatMoney(history.amountDue)}. The most that can be recorded is{' '}
          <strong>{formatMoney(history.maximumPayable)}</strong> — overpayment is refused
          rather than held as credit.
        </NoticeBar>
      )}

      <form id="payment-form" className="space-y-4"
        onSubmit={form.handleSubmit((v) => record({
          feeAssignmentId: line!.feeAssignmentId,
          amount: v.amount,
          method: v.method,
          providerCode: v.method === 'mobile_money' ? (v.providerCode as MomoProviderCode) : undefined,
          reference: v.reference || undefined,
          paidOn: v.paidOn,
          notes: v.notes || undefined,
        }))}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount (GH₵) *</Label>
            <Input id="pay-amount" inputMode="decimal" placeholder="200.00" {...form.register('amount')} />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Paid on *</Label>
            <Input id="pay-date" type="date" {...form.register('paidOn')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-method">Method *</Label>
            <Select id="pay-method" {...form.register('method')}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          {method === 'mobile_money' && (
            <div className="space-y-1.5">
              <Label htmlFor="pay-provider">Network *</Label>
              <Select id="pay-provider" {...form.register('providerCode')}>
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pay-ref">Reference</Label>
          <Input id="pay-ref" placeholder="MoMo transaction ID, cheque or bank reference"
            {...form.register('reference')} />
          <p className="text-xs text-muted-foreground">
            Brite records payments; it does not collect them. This reference is the reconciliation.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pay-notes">Notes</Label>
          <Textarea id="pay-notes" rows={2} {...form.register('notes')} />
        </div>
      </form>

      {!!history?.payments.length && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Payment history</p>
          {history.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={p.reversesPaymentId ? 'text-destructive tabular-nums' : 'tabular-nums'}>
                  {formatMoney(p.amount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.receiptNumber ?? (p.reversesPaymentId ? 'reversal' : '—')} · {p.paidOn.slice(0, 10)}
                </span>
              </span>
              {!p.reversesPaymentId && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => {
                    const reason = window.prompt(
                      'Why is this payment being reversed? (at least 10 characters)',
                    );
                    if (reason && reason.trim().length >= 10) reverse({ id: p.id, reason: reason.trim() });
                  }}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reverse
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </FormDialog>
  );
}
