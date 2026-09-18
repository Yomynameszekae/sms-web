'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { feesApi } from '@/lib/api/endpoints/fees';
import { termsApi } from '@/lib/api/endpoints/terms';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { queryKeys } from '@/lib/query-keys';
import { formatMoney } from '@/lib/money';

export function LedgerView() {
  const [yearOverride, setYearOverride] = useState('');
  const [termId, setTermId] = useState('');

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.fees.ledger({ y: year?.id, t: termId }),
    queryFn: () => feesApi.ledger(year!.id, termId || undefined).then((r) => r.data.data),
    enabled: !!year?.id,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Ledger"
        description="What each fee type has billed and collected, by term."
      />

      <NoticeBar>
        Three columns and no fourth: <strong>outstanding is billed minus collected</strong>.
        Collected is a signed sum, so a reversed payment removes itself rather than needing to
        be filtered out.
      </NoticeBar>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lg-year" className="text-sm text-muted-foreground">Academic year</Label>
          <Select id="lg-year" className="w-48" value={year?.id ?? ''}
            onChange={(e) => { setYearOverride(e.target.value); setTermId(''); }}>
            {(years ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lg-term" className="text-sm text-muted-foreground">Term</Label>
          <Select id="lg-term" className="w-48" value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">All terms</option>
            {termsForYear.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </div>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Billed', value: data.totals.billed },
            { label: 'Collected', value: data.totals.collected },
            { label: 'Outstanding', value: data.totals.outstanding },
          ].map((s) => (
            <Card key={s.label} className="p-3 gap-0">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(s.value)}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Statement section</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Billed</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right pr-4">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? <TableSkeleton columns={6} />
            : !data?.rows.length ? <EmptyTable columns={6} message="No fees billed in this period." />
            : (
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={`${r.feeTypeId}:${r.termId}`}>
                    <TableCell className="font-medium">{r.accountName}</TableCell>
                    <TableCell>
                      {r.label ? <StatusBadge variant="info" label={r.label.name} />
                        : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.assignmentCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.billed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.collected)}</TableCell>
                    <TableCell className="text-right pr-4 tabular-nums font-medium">
                      {formatMoney(r.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
                {data.totals && (
                  <TableRow className="font-medium bg-muted/40">
                    <TableCell>Total</TableCell>
                    <TableCell /><TableCell />
                    <TableCell className="text-right tabular-nums">{formatMoney(data.totals.billed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(data.totals.collected)}</TableCell>
                    <TableCell className="text-right pr-4 tabular-nums">{formatMoney(data.totals.outstanding)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            )}
        </Table>
      </Card>
    </div>
  );
}
