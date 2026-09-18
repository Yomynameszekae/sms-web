'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { StatusBadge, type StatusVariant } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { notificationsApi } from '@/lib/api/endpoints/notifications';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { NotificationStatus, NotificationTrigger } from '@/types/api';

/**
 * `sent` is green but not the same as `delivered`; `suppressed` is deliberately
 * distinct from `failed`, because one means "we were not allowed to" and the
 * other means "we tried and it did not work", and they need different fixes.
 */
const STATUS_VARIANT: Record<NotificationStatus, StatusVariant> = {
  queued: 'pending',
  sending: 'pending',
  sent: 'info',
  delivered: 'active',
  failed: 'error',
  suppressed: 'warning',
  cancelled: 'inactive',
};

const STATUS_LABEL: Record<NotificationStatus, string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent to network',
  delivered: 'Delivered',
  failed: 'Failed',
  suppressed: 'Not sent',
  cancelled: 'Cancelled',
};

const TRIGGER_LABEL: Record<NotificationTrigger, string> = {
  fee_reminder: 'Fee reminder',
  fee_receipt: 'Payment receipt',
  attendance_absence: 'Absence alert',
  account_setup: 'Account setup',
  password_reset: 'Password reset',
  announcement: 'Announcement',
};

export function NotificationsView() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<NotificationStatus | ''>('');
  const [trigger, setTrigger] = useState<NotificationTrigger | ''>('');

  const params = {
    page, limit: 20,
    ...(status ? { status: status as NotificationStatus } : {}),
    ...(trigger ? { trigger: trigger as NotificationTrigger } : {}),
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsApi.list(params).then((r) => r.data.data),
  });

  const { data: counts } = useQuery({
    queryKey: queryKeys.notifications.counts(),
    queryFn: () => notificationsApi.counts().then((r) => r.data.data),
  });

  const { mutate: dispatch, isPending: dispatching } = useApiMutation<
    { claimed: number; sent: number; failed: number; retrying: number }, void
  >({
    mutationFn: () => notificationsApi.dispatch().then((r) => r.data.data),
    successMessage: (r) =>
      r.claimed
        ? `Processed ${r.claimed}: ${r.sent} sent, ${r.failed} failed, ${r.retrying} will retry.`
        : 'Nothing waiting to send.',
    invalidateKeys: [queryKeys.notifications.all],
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Every SMS Brite has queued, and what happened to it. Messages send automatically every few seconds."
        action={
          <Button size="sm" variant="outline" id="nt-dispatch"
            disabled={dispatching} onClick={() => dispatch()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Send waiting messages now
          </Button>
        }
      />

      <NoticeBar>
        Brite is running against a <strong>sandbox gateway</strong>: messages are recorded and
        logged in full but no SMS actually leaves the building, and nothing is charged. Choosing a
        real provider is a separate step.
      </NoticeBar>

      {!!counts?.needsAttention && (
        <div className="flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning-bg)' }}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span id="nt-attention">
            <strong>{counts.needsAttention} message(s) did not reach a parent.</strong>{' '}
            {counts.byStatus.suppressed} were not sent (usually no SMS consent on record, or an
            unusable phone number) and {counts.byStatus.failed} failed at the network.
          </span>
        </div>
      )}

      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Delivered', value: counts.byStatus.delivered },
            { label: 'Sent to network', value: counts.byStatus.sent },
            { label: 'Waiting', value: counts.inFlight },
            { label: 'Need attention', value: counts.needsAttention },
            { label: 'Billable segments', value: counts.segments },
          ].map((s) => (
            <Card key={s.label} className="p-3 gap-0">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{s.value}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nt-status" className="text-sm text-muted-foreground">Status</Label>
          <Select id="nt-status" className="w-44" value={status}
            onChange={(e) => { setStatus(e.target.value as NotificationStatus | ''); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nt-trigger" className="text-sm text-muted-foreground">Type</Label>
          <Select id="nt-trigger" className="w-48" value={trigger}
            onChange={(e) => { setTrigger(e.target.value as NotificationTrigger | ''); setPage(1); }}>
            <option value="">All</option>
            {Object.entries(TRIGGER_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="text-right">Parts</TableHead>
              <TableHead className="text-right">Tries</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4">Why not</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? <TableSkeleton columns={7} />
            : !items.length ? <EmptyTable columns={7} message="No messages yet." />
            : (
              <TableBody>
                {items.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-sm">{TRIGGER_LABEL[n.trigger]}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {n.guardian ? `${n.guardian.firstName} ${n.guardian.lastName}` : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {n.toPhone || 'no usable number'}
                        {n.student && ` · ${n.student.firstName} ${n.student.lastName}`}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{n.segmentCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{n.attemptCount}</TableCell>
                    <TableCell>
                      <StatusBadge variant={STATUS_VARIANT[n.status]} label={STATUS_LABEL[n.status]} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <span className="text-xs text-destructive">{n.lastError ?? ''}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
        </Table>
      </Card>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onPageChange={setPage}
        />
      )}

      <p className="text-xs text-muted-foreground">
        <strong>Sent to network</strong> means the provider accepted the message;{' '}
        <strong>Delivered</strong> means it reached the handset, where the provider reports that.
        <strong> Not sent</strong> means Brite never tried — almost always because SMS consent is
        not recorded for that guardian.
      </p>
    </div>
  );
}
