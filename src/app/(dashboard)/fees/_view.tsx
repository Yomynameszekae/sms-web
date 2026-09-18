'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive, ArchiveRestore, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { feesApi } from '@/lib/api/endpoints/fees';
import { termsApi } from '@/lib/api/endpoints/terms';
import { levelsApi } from '@/lib/api/endpoints/levels';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { formatMoney } from '@/lib/money';
import type { SchoolFee, CreateSchoolFeePayload, UpdateSchoolFeePayload } from '@/types/api';

const createSchema = z.object({
  feeTypeId: z.string().min(1, 'Choose a fee type'),
  levelId: z.string().min(1, 'Choose a level'),
  termId: z.string().min(1, 'Choose a term'),
  name: z.string().min(1, 'Name is required').max(150),
  amount: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 450 or 450.00')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
});
type CreateValues = z.infer<typeof createSchema>;
const INVALIDATE = [queryKeys.fees.all];

export function SchoolFeesView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editTarget, setEditTarget] = useState<SchoolFee | null>(null);
  const [yearOverride, setYearOverride] = useState('');
  const [termOverride, setTermOverride] = useState('');

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
    () => (terms ?? []).filter((t) => t.academicYearId === year?.id)
      .sort((a, b) => a.termNumber - b.termNumber),
    [terms, year],
  );
  const term = useMemo(() => {
    if (!termsForYear.length) return undefined;
    return termsForYear.find((t) => t.id === termOverride)
      ?? termsForYear.find((t) => t.status === 'active')
      ?? termsForYear[termsForYear.length - 1];
  }, [termsForYear, termOverride]);

  const { data: levels } = useQuery({
    queryKey: queryKeys.levels.list(),
    queryFn: () => levelsApi.list().then((r) => r.data.data),
  });
  const { data: feeTypes } = useQuery({
    queryKey: queryKeys.fees.types({}),
    queryFn: () => feesApi.listTypes().then((r) => r.data.data),
  });

  const params = { academicYearId: year?.id, termId: term?.id, includeArchived: showArchived };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.fees.schoolFees(params),
    queryFn: () => feesApi.listFees({
      academicYearId: year!.id, termId: term!.id, includeArchived: showArchived,
    }).then((r) => r.data.data),
    enabled: !!year?.id && !!term?.id,
  });

  const { mutate: create, isPending: creating } = useApiMutation<SchoolFee, CreateSchoolFeePayload>({
    mutationFn: (p) => feesApi.createFee(p).then((r) => r.data.data),
    successMessage: (fee) => `Fee created and assigned to ${fee.assignedCount ?? 0} student(s).`,
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });
  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateSchoolFeePayload>({
    mutationFn: ({ id, ...p }) => feesApi.updateFee(id, p).then((r) => r.data.data),
    successMessage: 'Fee updated. Students already assigned keep their original amount.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });
  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => feesApi.archiveFee(id).then((r) => r.data.data),
    successMessage: 'Fee archived.', invalidateKeys: INVALIDATE,
  });
  const { mutate: restore } = useApiMutation<unknown, string>({
    mutationFn: (id) => feesApi.restoreFee(id).then((r) => r.data.data),
    successMessage: 'Fee restored.', invalidateKeys: INVALIDATE,
  });
  const { mutate: reconcile, isPending: reconciling } = useApiMutation<
    { createdCount: number }, string
  >({
    mutationFn: (id) => feesApi.reconcile(id).then((r) => r.data.data),
    successMessage: (res) => res.createdCount
      ? `${res.createdCount} student(s) assigned this fee.`
      : 'Every eligible student already has this fee.',
    invalidateKeys: INVALIDATE,
  });

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { feeTypeId: '', levelId: '', termId: '', name: '', amount: '' },
  });
  const editForm = useForm<{ name: string; amount: string }>({
    resolver: zodResolver(createSchema.pick({ name: true, amount: true })),
    defaultValues: { name: '', amount: '' },
  });

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees"
        description="What each level pays this term. Creating a fee assigns it to every actively enrolled student in that level."
        action={
          <Button size="sm" id="fee-new" onClick={() => { form.reset({ feeTypeId: '', levelId: '', termId: term?.id ?? '', name: '', amount: '' }); setCreateOpen(true); }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Fee
          </Button>
        }
      />

      <NoticeBar>
        A fee is priced for a <strong>level</strong>, so every classroom in that level pays it.
        Editing an amount changes future assignments only — students already billed keep the
        amount they were billed.
      </NoticeBar>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fee-year" className="text-sm text-muted-foreground">Academic year</Label>
          <Select id="fee-year" className="w-48" value={year?.id ?? ''}
            onChange={(e) => { setYearOverride(e.target.value); setTermOverride(''); }}>
            {(years ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fee-term" className="text-sm text-muted-foreground">Term</Label>
          <Select id="fee-term" className="w-48" value={term?.id ?? ''}
            onChange={(e) => setTermOverride(e.target.value)}>
            {termsForYear.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.status})</option>)}
          </Select>
        </div>
        <Checkbox id="fee-show-archived" label="Show archived"
          checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Fee type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? <TableSkeleton columns={7} />
            : !rows.length ? <EmptyTable columns={7} message="No fees for this term yet." />
            : (
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id} className={f.isActive ? '' : 'opacity-50'}>
                    <TableCell className="font-medium">{f.level?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{f.feeType?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(f.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{f._count?.assignments ?? 0}</TableCell>
                    <TableCell><StatusBadge variant={f.isActive ? 'active' : 'archived'} /></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          title="Assign this fee to any student who joined after it was created"
                          disabled={reconciling} onClick={() => reconcile(f.id)}>
                          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reconcile
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit"
                          onClick={() => { editForm.reset({ name: f.name, amount: f.amount }); setEditTarget(f); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {f.isActive ? (
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Archive" onClick={() => archive(f.id)}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            title="Restore" onClick={() => restore(f.id)}>
                            <ArchiveRestore className="mr-1 h-3.5 w-3.5" /> Restore
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
        </Table>
      </Card>

      <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="New Fee"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating}
          formId="fee-form" submitLabel="Create & assign" />}>
        <form id="fee-form" className="space-y-4"
          onSubmit={form.handleSubmit((v) => create({
            feeTypeId: v.feeTypeId, levelId: v.levelId,
            academicYearId: year!.id, termId: v.termId,
            name: v.name, amount: v.amount,
          }))}>
          <div className="space-y-1.5">
            <Label htmlFor="fee-type">Fee type *</Label>
            <Select id="fee-type" {...form.register('feeTypeId')}>
              <option value="">Choose…</option>
              {(feeTypes ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            {form.formState.errors.feeTypeId && (
              <p className="text-xs text-destructive">{form.formState.errors.feeTypeId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-level">Level *</Label>
            <Select id="fee-level" {...form.register('levelId')}>
              <option value="">Choose…</option>
              {(levels ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
            {form.formState.errors.levelId && (
              <p className="text-xs text-destructive">{form.formState.errors.levelId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-term-pick">Term *</Label>
            <Select id="fee-term-pick" {...form.register('termId')}>
              <option value="">Choose…</option>
              {termsForYear.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            {form.formState.errors.termId && (
              <p className="text-xs text-destructive">{form.formState.errors.termId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-name">Name *</Label>
            <Input id="fee-name" placeholder="e.g. Basic 3 Tuition" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-amount">Amount (GH₵) *</Label>
            <Input id="fee-amount" inputMode="decimal" placeholder="450.00" {...form.register('amount')} />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>
        </form>
      </FormDialog>

      <FormDialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        title="Edit Fee"
        description="Changes apply to students assigned from now on. Students already billed keep the amount they were billed."
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="fee-edit-form" />}>
        <form id="fee-edit-form" className="space-y-4"
          onSubmit={editForm.handleSubmit((v) => update({ id: editTarget!.id, name: v.name, amount: v.amount }))}>
          <div className="space-y-1.5">
            <Label htmlFor="fee-edit-name">Name *</Label>
            <Input id="fee-edit-name" {...editForm.register('name')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee-edit-amount">Amount (GH₵) *</Label>
            <Input id="fee-edit-amount" inputMode="decimal" {...editForm.register('amount')} />
            {editForm.formState.errors.amount && (
              <p className="text-xs text-destructive">{editForm.formState.errors.amount.message}</p>
            )}
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
