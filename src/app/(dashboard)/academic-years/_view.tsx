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
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { AcademicYear, CreateAcademicYearPayload, UpdateAcademicYearPayload } from '@/types/api';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const schema = z.object({
  label:     z.string().min(1, 'Label is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate:   z.string().min(1, 'End date is required'),
}).refine((d) => d.endDate > d.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type FormValues = z.infer<typeof schema>;

const INVALIDATE = [queryKeys.academicYears.list()];

function AcademicYearForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit: (v: FormValues) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { label: '', startDate: '', endDate: '' },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="ay-form">
      <div className="space-y-1.5">
        <Label htmlFor="ay-label">Label *</Label>
        <Input id="ay-label" placeholder="e.g. 2025/2026" {...form.register('label')} />
        {form.formState.errors.label && (
          <p className="text-xs text-destructive">{form.formState.errors.label.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ay-start">Start Date *</Label>
          <Input id="ay-start" type="date" {...form.register('startDate')} />
          {form.formState.errors.startDate && (
            <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ay-end">End Date *</Label>
          <Input id="ay-end" type="date" {...form.register('endDate')} />
          {form.formState.errors.endDate && (
            <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
          )}
        </div>
      </div>
    </form>
  );
}

export function AcademicYearsView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcademicYear | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateAcademicYearPayload>({
    mutationFn: (p) => academicYearsApi.create(p).then((r) => r.data.data),
    successMessage: 'Academic year created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateAcademicYearPayload>({
    mutationFn: ({ id, ...p }) => academicYearsApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Academic year updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: activate } = useApiMutation<unknown, string>({
    mutationFn: (id) => academicYearsApi.activate(id).then((r) => r.data.data),
    successMessage: 'Academic year activated.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: close } = useApiMutation<unknown, string>({
    mutationFn: (id) => academicYearsApi.close(id).then((r) => r.data.data),
    successMessage: 'Academic year closed.',
    invalidateKeys: INVALIDATE,
  });

  const COLS = 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Years"
        description="Create and manage annual academic cycles. Only one year can be active at a time."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Academic Year
          </Button>
        }
      />

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS} />
          ) : !data?.length ? (
            <EmptyTable columns={COLS} message="No academic years yet. Create one to get started." />
          ) : (
            <TableBody>
              {data.map((ay) => (
                <TableRow key={ay.id}>
                  <TableCell className="font-medium">{ay.label}</TableCell>
                  <TableCell>{fmtDate(ay.startDate)}</TableCell>
                  <TableCell>{fmtDate(ay.endDate)}</TableCell>
                  <TableCell>
                    <StatusBadge variant={ay.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditTarget(ay)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!ay.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => activate(ay.id)}
                        >
                          Activate
                        </Button>
                      )}
                      {ay.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                          onClick={() => close(ay.id)}
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

      {/* Create dialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Academic Year"
        description="Only one academic year can be active at a time."
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="ay-form" submitLabel="Create" />}
      >
        <AcademicYearForm
          onSubmit={(v) => create(v)}
        />
      </FormDialog>

      {/* Edit dialog */}
      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Academic Year"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="ay-form" />}
      >
        {editTarget && (
          <AcademicYearForm
            defaultValues={{
              label:     editTarget.label,
              startDate: editTarget.startDate.slice(0, 10),
              endDate:   editTarget.endDate.slice(0, 10),
            }}
            onSubmit={(v) => update({ id: editTarget.id, ...v })}
          />
        )}
      </FormDialog>
    </div>
  );
}
