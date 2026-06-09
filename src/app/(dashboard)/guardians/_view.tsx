'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { guardiansApi } from '@/lib/api/endpoints/guardians';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { Guardian, StudentGuardian, CreateGuardianPayload, UpdateGuardianPayload } from '@/types/api';

const guardianSchema = z.object({
  firstName:      z.string().min(1, 'First name is required'),
  lastName:       z.string().min(1, 'Last name is required'),
  phonePrimary:   z.string().min(1, 'Primary phone is required'),
  phoneSecondary: z.string().optional(),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  occupation:     z.string().optional(),
  address:        z.string().optional(),
});
type GuardianForm = z.infer<typeof guardianSchema>;

function GuardianForm({
  id, defaultValues, onSubmit,
}: {
  id: string;
  defaultValues?: Partial<GuardianForm>;
  onSubmit: (v: GuardianForm) => void;
}) {
  const form = useForm<GuardianForm>({
    resolver: zodResolver(guardianSchema),
    defaultValues: defaultValues ?? {},
  });

  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gf-fn">First Name *</Label>
          <Input id="gf-fn" {...form.register('firstName')} />
          {form.formState.errors.firstName && (
            <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gf-ln">Last Name *</Label>
          <Input id="gf-ln" {...form.register('lastName')} />
          {form.formState.errors.lastName && (
            <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gf-ph1">Primary Phone *</Label>
          <Input id="gf-ph1" {...form.register('phonePrimary')} />
          {form.formState.errors.phonePrimary && (
            <p className="text-xs text-destructive">{form.formState.errors.phonePrimary.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gf-ph2">Secondary Phone</Label>
          <Input id="gf-ph2" {...form.register('phoneSecondary')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gf-email">Email</Label>
          <Input id="gf-email" type="email" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gf-occ">Occupation</Label>
          <Input id="gf-occ" {...form.register('occupation')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gf-addr">Address</Label>
        <Input id="gf-addr" {...form.register('address')} />
      </div>
    </form>
  );
}

function LinkedStudentsPanel({ guardianId }: { guardianId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.guardians.students(guardianId),
    queryFn: () => guardiansApi.getStudents(guardianId).then((r) => r.data.data),
  });

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (!data?.length) return <p className="text-xs text-muted-foreground italic">No students linked.</p>;

  return (
    <div className="space-y-1">
      {(data as StudentGuardian[]).map((link) => (
        <div key={link.id} className="flex items-center gap-2 text-xs">
          <span className="font-medium">
            {link.student?.firstName} {link.student?.lastName}
          </span>
          <code className="text-muted-foreground bg-muted rounded px-1 py-0.5">
            {link.student?.studentNumber}
          </code>
          {link.relationship && <span className="text-muted-foreground">{link.relationship}</span>}
          {link.isPrimary && <span className="font-medium" style={{ color: 'var(--success)' }}>★ Primary</span>}
        </div>
      ))}
    </div>
  );
}

export function GuardiansView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Guardian | null>(null);

  const queryParams = { page, limit: 50, ...(search ? { search } : {}) };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.guardians.list(queryParams),
    queryFn: () => guardiansApi.list(queryParams).then((r) => r.data.data),
  });

  const INVALIDATE = [queryKeys.guardians.all];

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateGuardianPayload>({
    mutationFn: (p) => guardiansApi.create(p).then((r) => r.data.data),
    successMessage: 'Guardian created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateGuardianPayload>({
    mutationFn: ({ id, ...p }) => guardiansApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Guardian updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => guardiansApi.archive(id).then((r) => r.data.data),
    successMessage: 'Guardian archived.',
    invalidateKeys: INVALIDATE,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const COLS = 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardians"
        description="Parents and guardians of enrolled students. Archiving is permanent in Phase 1 — archived guardians cannot be restored."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Guardian
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead>Primary Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS + 1} />
          ) : !items.length ? (
            <EmptyTable columns={COLS + 1} message="No guardians found." />
          ) : (
            <TableBody>
              {items.map((g) => (
                <Fragment key={g.id}>
                  <TableRow className={g.archivedAt ? 'opacity-60' : ''}>
                    <TableCell>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                      >
                        {expandedId === g.id
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{g.firstName} {g.lastName}</TableCell>
                    <TableCell className="text-sm">{g.phonePrimary}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.email ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{g.occupation ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!g.archivedAt && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => archive(g.id)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === g.id && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={COLS + 1} className="py-3 pl-10">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Linked Students</p>
                        <LinkedStudentsPanel guardianId={g.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          )}
        </Table>
        {pagination && <Pagination {...pagination} onPageChange={setPage} />}
      </Card>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Guardian"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="guardian-create-form" submitLabel="Create" />}
      >
        <GuardianForm
          id="guardian-create-form"
          onSubmit={(v) => create({ ...v, email: v.email || undefined, phoneSecondary: v.phoneSecondary || undefined, occupation: v.occupation || undefined, address: v.address || undefined })}
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Guardian"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="guardian-edit-form" />}
      >
        {editTarget && (
          <GuardianForm
            id="guardian-edit-form"
            defaultValues={{
              firstName: editTarget.firstName,
              lastName:  editTarget.lastName,
              phonePrimary: editTarget.phonePrimary,
              phoneSecondary: editTarget.phoneSecondary ?? '',
              email:     editTarget.email ?? '',
              occupation: editTarget.occupation ?? '',
              address:   editTarget.address ?? '',
            }}
            onSubmit={(v) => update({ id: editTarget.id, ...v, email: v.email || undefined, phoneSecondary: v.phoneSecondary || undefined })}
          />
        )}
      </FormDialog>
    </div>
  );
}
