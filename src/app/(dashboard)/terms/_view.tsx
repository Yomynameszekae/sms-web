'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { termsApi } from '@/lib/api/endpoints/terms';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type {
  Term, TermStatus, CurriculumScope,
  CreateTermPayload, UpdateTermPayload,
  AcademicYear,
} from '@/types/api';

const CURRICULUM_SCOPES: CurriculumScope[] = ['GES_NACCA', 'ABEKA', 'BOTH'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const termSchema = z.object({
  academicYearId:  z.string().min(1, 'Academic year is required'),
  termNumber:      z.number().int().min(1).max(4),
  label:           z.string().min(1, 'Label is required'),
  startDate:       z.string().min(1, 'Start date is required'),
  endDate:         z.string().min(1, 'End date is required'),
  examStartDate:   z.string().optional(),
  examEndDate:     z.string().optional(),
  curriculumScope: z.enum(['GES_NACCA', 'ABEKA', 'BOTH']).optional(),
}).refine((d) => d.endDate > d.startDate, { message: 'End date must be after start date', path: ['endDate'] });

type FormValues = z.infer<typeof termSchema>;

const STATUS_VARIANT: Record<TermStatus, 'active' | 'pending' | 'closed' | 'inactive'> = {
  draft:   'inactive',
  pending: 'pending',
  active:  'active',
  closed:  'closed',
};
const STATUS_LABEL: Record<TermStatus, string> = {
  draft:   'Draft',
  pending: 'Pending',
  active:  'Active',
  closed:  'Closed',
};

function TermForm({
  academicYears,
  defaultValues,
  onSubmit,
  lockedAcademicYearId,
}: {
  academicYears: AcademicYear[];
  defaultValues?: Partial<FormValues>;
  onSubmit: (v: FormValues) => void;
  lockedAcademicYearId?: string;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(termSchema),
    defaultValues: defaultValues ?? {
      academicYearId: lockedAcademicYearId ?? '',
      termNumber: 1,
      label: '',
      startDate: '',
      endDate: '',
    },
  });

  return (
    <form id="term-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="t-ay">Academic Year *</Label>
        <Select id="t-ay" {...form.register('academicYearId')} disabled={!!lockedAcademicYearId}>
          <option value="">Select year…</option>
          {academicYears.map((ay) => (
            <option key={ay.id} value={ay.id}>{ay.label}</option>
          ))}
        </Select>
        {form.formState.errors.academicYearId && (
          <p className="text-xs text-destructive">{form.formState.errors.academicYearId.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="t-num">Term Number *</Label>
          <Input id="t-num" type="number" min={1} max={4} {...form.register('termNumber', { valueAsNumber: true })} />
          {form.formState.errors.termNumber && (
            <p className="text-xs text-destructive">{form.formState.errors.termNumber.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-label">Label *</Label>
          <Input id="t-label" placeholder="e.g. Term 1" {...form.register('label')} />
          {form.formState.errors.label && (
            <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="t-start">Start Date *</Label>
          <Input id="t-start" type="date" {...form.register('startDate')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-end">End Date *</Label>
          <Input id="t-end" type="date" {...form.register('endDate')} />
          {form.formState.errors.endDate && (
            <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="t-exam-start">Exam Start (optional)</Label>
          <Input id="t-exam-start" type="date" {...form.register('examStartDate')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="t-exam-end">Exam End (optional)</Label>
          <Input id="t-exam-end" type="date" {...form.register('examEndDate')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="t-scope">Curriculum Scope</Label>
        <Select id="t-scope" {...form.register('curriculumScope')}>
          <option value="">— Any —</option>
          {CURRICULUM_SCOPES.map((s) => (
            <option key={s} value={s}>{s.replace('_', '/')}</option>
          ))}
        </Select>
      </div>

    </form>
  );
}

export function TermsView() {
  const [filterYear, setFilterYear] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Term | null>(null);

  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.terms.list(filterYear || undefined),
    queryFn: () => termsApi.list(filterYear || undefined).then((r) => r.data.data),
  });

  const invalidateAll = [queryKeys.terms.list(filterYear || undefined), queryKeys.terms.list()];

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateTermPayload>({
    mutationFn: (p) => termsApi.create(p).then((r) => r.data.data),
    successMessage: 'Term created.',
    invalidateKeys: invalidateAll,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateTermPayload>({
    mutationFn: ({ id, ...p }) => termsApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Term updated.',
    invalidateKeys: invalidateAll,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: activate } = useApiMutation<unknown, string>({
    mutationFn: (id) => termsApi.activate(id).then((r) => r.data.data),
    successMessage: 'Term activated.',
    invalidateKeys: invalidateAll,
  });

  const { mutate: close } = useApiMutation<unknown, string>({
    mutationFn: (id) => termsApi.close(id).then((r) => r.data.data),
    successMessage: 'Term closed.',
    invalidateKeys: invalidateAll,
  });

  const yearLabelMap = Object.fromEntries(years.map((y) => [y.id, y.label]));
  const COLS = 6;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms"
        description="Academic terms within each year. Activate one term at a time."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Term
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Label htmlFor="year-filter" className="text-sm font-medium shrink-0">Filter by year:</Label>
        <Select
          id="year-filter"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="w-48"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </Select>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>#</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS} />
          ) : !data?.length ? (
            <EmptyTable columns={COLS} message="No terms found." />
          ) : (
            <TableBody>
              {data.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {yearLabelMap[term.academicYearId] ?? '—'}
                  </TableCell>
                  <TableCell>{term.termNumber}</TableCell>
                  <TableCell className="font-medium">{term.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(term.startDate)} – {fmtDate(term.endDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[term.status]} label={STATUS_LABEL[term.status]} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => setEditTarget(term)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {(term.status === 'draft' || term.status === 'pending') && (
                        <Button
                          size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => activate(term.id)}
                        >
                          Activate
                        </Button>
                      )}
                      {term.status === 'active' && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                          onClick={() => close(term.id)}
                        >
                          Close
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

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Term"
        description="Terms belong to an academic year. Only one term can be active at a time."
        maxWidth="max-w-xl"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="term-form" submitLabel="Create" />}
      >
        <TermForm
          academicYears={years}
          lockedAcademicYearId={filterYear || undefined}
          onSubmit={(v) =>
            create({
              academicYearId:  v.academicYearId,
              termNumber:      v.termNumber,
              label:           v.label,
              startDate:       v.startDate,
              endDate:         v.endDate,
              examStartDate:   v.examStartDate || undefined,
              examEndDate:     v.examEndDate || undefined,
              curriculumScope: v.curriculumScope || undefined,
            })
          }
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Term"
        maxWidth="max-w-xl"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="term-form" />}
      >
        {editTarget && (
          <TermForm
            academicYears={years}
            defaultValues={{
              academicYearId:  editTarget.academicYearId,
              termNumber:      editTarget.termNumber,
              label:           editTarget.label,
              startDate:       editTarget.startDate.slice(0, 10),
              endDate:         editTarget.endDate.slice(0, 10),
              examStartDate:   editTarget.examStartDate?.slice(0, 10) ?? '',
              examEndDate:     editTarget.examEndDate?.slice(0, 10) ?? '',
              curriculumScope: editTarget.curriculumScope ?? undefined,
            }}
            onSubmit={(v) =>
              update({
                id:              editTarget.id,
                termNumber:      v.termNumber,
                label:           v.label,
                startDate:       v.startDate,
                endDate:         v.endDate,
                examStartDate:   v.examStartDate || undefined,
                examEndDate:     v.examEndDate || undefined,
                curriculumScope: v.curriculumScope || undefined,
              })
            }
          />
        )}
      </FormDialog>
    </div>
  );
}
