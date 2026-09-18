'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { NoticeBar } from '@/components/shared/notice-bar';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { consentApi } from '@/lib/api/endpoints/notifications';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { Guardian, SmsConsentMethod } from '@/types/api';

/**
 * Consent capture — deliberately NOT a checkbox.
 *
 * The method is required because it is what a school would have to produce if
 * anyone asked how consent was obtained. A tick box answers "may we message
 * them"; it does not answer "on what basis", and the second question is the
 * one that matters.
 */
const METHOD_LABELS: Record<SmsConsentMethod, string> = {
  verbal_at_enrollment: 'Agreed verbally at enrolment',
  written_form: 'Signed a written form',
  verbal_in_person: 'Agreed verbally in person',
  verbal_by_phone: 'Agreed verbally by phone',
  sms_reply: 'Replied to confirm by SMS',
};

const grantSchema = z.object({
  smsConsentMethod: z.enum([
    'verbal_at_enrollment', 'written_form', 'verbal_in_person', 'verbal_by_phone', 'sms_reply',
  ]),
});
const revokeSchema = z.object({
  reason: z.string().min(5, 'Give a short reason — it goes into the audit trail'),
});

export function ConsentDialog({
  guardian, open, onOpenChange,
}: {
  guardian: Guardian | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const revoking = !!guardian?.smsConsentGiven;

  const grantForm = useForm<z.infer<typeof grantSchema>>({
    resolver: zodResolver(grantSchema),
    defaultValues: { smsConsentMethod: 'verbal_at_enrollment' },
  });
  const revokeForm = useForm<z.infer<typeof revokeSchema>>({
    resolver: zodResolver(revokeSchema),
    defaultValues: { reason: '' },
  });

  const INVALIDATE = [queryKeys.guardians.all, queryKeys.notifications.all];

  const { mutate: grant, isPending: granting } = useApiMutation<
    unknown, { id: string; method: SmsConsentMethod }
  >({
    mutationFn: ({ id, method }) => consentApi.grant(id, method).then((r) => r.data.data),
    successMessage: 'SMS consent recorded.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => { grantForm.reset(); onOpenChange(false); },
  });

  const { mutate: revoke, isPending: revokingNow } = useApiMutation<
    { queuedMessagesCancelled: number }, { id: string; reason: string }
  >({
    mutationFn: ({ id, reason }) => consentApi.revoke(id, reason).then((r) => r.data.data),
    successMessage: (r) =>
      `SMS consent withdrawn. ${r.queuedMessagesCancelled} message(s) already waiting were cancelled.`,
    invalidateKeys: INVALIDATE,
    onSuccess: () => { revokeForm.reset(); onOpenChange(false); },
  });

  const name = guardian ? `${guardian.firstName} ${guardian.lastName}` : '';

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={revoking ? 'Withdraw SMS consent' : 'Record SMS consent'}
      description={name}
      footer={
        <FormFooter
          onCancel={() => onOpenChange(false)}
          isPending={granting || revokingNow}
          formId="consent-form"
          submitLabel={revoking ? 'Withdraw consent' : 'Record consent'}
        />
      }
    >
      {guardian && (revoking ? (
        <form id="consent-form" className="space-y-4"
          onSubmit={revokeForm.handleSubmit((v) => revoke({ id: guardian.id, reason: v.reason }))}>
          <NoticeBar variant="lock">
            {name} will stop receiving <strong>all</strong> SMS immediately — fee reminders,
            payment receipts and absence alerts. Anything already waiting to send is cancelled.
          </NoticeBar>
          <div className="space-y-1.5">
            <Label htmlFor="consent-reason">Reason *</Label>
            <Textarea id="consent-reason" rows={3}
              placeholder="e.g. Parent asked us to stop texting them"
              {...revokeForm.register('reason')} />
            {revokeForm.formState.errors.reason && (
              <p className="text-xs text-destructive">{revokeForm.formState.errors.reason.message}</p>
            )}
          </div>
          {guardian.smsConsentGivenAt && (
            <p className="text-xs text-muted-foreground">
              Consent was recorded on {guardian.smsConsentGivenAt.slice(0, 10)}
              {guardian.smsConsentMethod && ` — ${METHOD_LABELS[guardian.smsConsentMethod as SmsConsentMethod] ?? guardian.smsConsentMethod}`}.
            </p>
          )}
        </form>
      ) : (
        <form id="consent-form" className="space-y-4"
          onSubmit={grantForm.handleSubmit((v) =>
            grant({ id: guardian.id, method: v.smsConsentMethod }))}>
          <NoticeBar>
            Until consent is recorded, <strong>{name} receives no SMS at all</strong> — no
            reminders, no receipts, no absence alerts. Only record it if they have actually agreed.
          </NoticeBar>
          <div className="space-y-1.5">
            <Label htmlFor="consent-method">How was consent given? *</Label>
            <Select id="consent-method" {...grantForm.register('smsConsentMethod')}>
              {Object.entries(METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Recorded against your name, so the school can show how consent was obtained.
            </p>
          </div>
        </form>
      ))}
    </FormDialog>
  );
}
