'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { isPermissionDenied } from '@/lib/api/errors';
import { NoticeBar } from '@/components/shared/notice-bar';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { Pagination } from '@/components/shared/pagination';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { auditLogsApi } from '@/lib/api/endpoints/audit-logs';
import { queryKeys } from '@/lib/query-keys';
import type { AuditLog } from '@/types/api';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

const DIFF_STYLE: Record<string, { bg: string; labelColor: string }> = {
  Before: { bg: 'var(--error-bg)',   labelColor: 'var(--error)' },
  After:  { bg: 'var(--success-bg)', labelColor: 'var(--success)' },
};

function ChangesPanel({ changes }: { changes: AuditLog['changes'] }) {
  if (!changes) return <p className="text-xs text-muted-foreground italic">No changes recorded.</p>;

  const sections: Array<[string, Record<string, unknown> | undefined]> = [
    ['Before', changes.before],
    ['After', changes.after],
  ];

  return (
    <div className="space-y-3">
      {sections.map(([label, obj]) =>
        obj ? (
          <div key={label}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: DIFF_STYLE[label]?.labelColor ?? 'var(--muted-text)' }}
            >
              {label}
            </p>
            <pre
              className="text-xs rounded p-2 overflow-auto max-h-32 font-mono"
              style={{ backgroundColor: DIFF_STYLE[label]?.bg ?? 'var(--surface-alt)' }}
            >
              {JSON.stringify(obj, null, 2)}
            </pre>
          </div>
        ) : null,
      )}
    </div>
  );
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = log.changes && (log.changes.before || log.changes.after);

  return (
    <>
      <TableRow className="align-top">
        <TableCell className="w-8 pt-3">
          {hasChanges ? (
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((x) => !x)}
              aria-label="Toggle details"
            >
              {expanded
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="block h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {fmtDate(log.createdAt)}
        </TableCell>
        <TableCell className="text-sm font-medium">{log.action}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{log.module}</TableCell>
        <TableCell className="text-sm text-muted-foreground capitalize">{log.actorType}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {log.entityType ?? '—'}
          {log.entityId && (
            <div className="text-xs opacity-60">{log.entityId.slice(0, 8)}…</div>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {log.userId ? <code className="bg-muted rounded px-1">{log.userId.slice(0, 8)}…</code> : '—'}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell />
          <TableCell colSpan={6} className="py-3 pr-6">
            <ChangesPanel changes={log.changes} />
            {log.ipAddress && (
              <p className="text-xs text-muted-foreground mt-2">
                IP: {log.ipAddress}
                {log.userAgent && <span className="ml-3">UA: {log.userAgent.slice(0, 60)}{log.userAgent.length > 60 ? '…' : ''}</span>}
              </p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AuditLogsView() {
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  const queryParams = {
    page,
    limit: 20,
    ...(moduleFilter ? { module: moduleFilter } : {}),
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.auditLogs.list(queryParams),
    queryFn: () => auditLogsApi.list(queryParams).then((r) => r.data.data),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const COLS = 7;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Tamper-proof record of all system actions. Read-only — logs cannot be edited or deleted."
      />

      <NoticeBar variant="lock">
        Audit logs are immutable. Entries cannot be added, edited, or deleted.
      </NoticeBar>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by module…"
          value={moduleFilter}
          onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
          className="max-w-[180px]"
        />
        <Input
          placeholder="Filter by action…"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="max-w-[200px]"
        />
        <Input
          placeholder="Filter by entity type…"
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
          className="max-w-[200px]"
        />
        {(moduleFilter || actionFilter || entityTypeFilter) && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => { setModuleFilter(''); setActionFilter(''); setEntityTypeFilter(''); setPage(1); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!isPermissionDenied(error) && (
        <Card className="p-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : !items.length ? (
              <EmptyTable columns={COLS} message="No audit logs found." />
            ) : (
              <TableBody>
                {items.map((log) => (
                  <AuditLogRow key={log.id} log={log} />
                ))}
              </TableBody>
            )}
          </Table>
          {pagination && <Pagination {...pagination} onPageChange={setPage} />}
        </Card>
      )}
    </div>
  );
}
