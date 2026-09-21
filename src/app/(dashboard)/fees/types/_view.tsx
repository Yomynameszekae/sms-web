'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { isPermissionDenied } from '@/lib/api/errors';
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
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { feesApi } from '@/lib/api/endpoints/fees';
import { labelsApi } from '@/lib/api/endpoints/labels';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { FeeType, CreateFeeTypePayload, UpdateFeeTypePayload } from '@/types/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().optional(),
  labelId: z.string().optional(),
});
type Values = z.infer<typeof schema>;
const INVALIDATE = [queryKeys.fees.all];

function TypeForm({
  defaultValues, labels, onSubmit,
}: {
  defaultValues?: Partial<Values>;
  labels: { id: string; name: string }[];
  onSubmit: (v: Values) => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: '', description: '', labelId: '' },
  });
  return (
    <form id="fee-type-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ft-name">Name *</Label>
        <Input id="ft-name" placeholder="e.g. Tuition" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Names are unique per school and ignore capitalisation — the ledger groups by fee
          type, so &ldquo;Tuition&rdquo; and &ldquo;tuition&rdquo; must not become two accounts.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ft-label">Statement section</Label>
        <Select id="ft-label" {...form.register('labelId')}>
          <option value="">No section</option>
          {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <p className="text-xs text-muted-foreground">
          A <strong>fee</strong> label. Decides which part of a future statement this rolls up to.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ft-desc">Description</Label>
        <Textarea id="ft-desc" rows={2} {...form.register('description')} />
      </div>
    </form>
  );
}

export function FeeTypesView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeType | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.fees.types({ includeArchived: showArchived }),
    queryFn: () => feesApi.listTypes(showArchived).then((r) => r.data.data),
  });

  const { data: labels } = useQuery({
    queryKey: queryKeys.labels.list({ category: 'fee' }),
    queryFn: () => labelsApi.list({ category: 'fee' }).then((r) => r.data.data),
  });

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateFeeTypePayload>({
    mutationFn: (p) => feesApi.createType(p).then((r) => r.data.data),
    successMessage: 'Fee type created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });
  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateFeeTypePayload>({
    mutationFn: ({ id, ...p }) => feesApi.updateType(id, p).then((r) => r.data.data),
    successMessage: 'Fee type updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });
  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => feesApi.archiveType(id).then((r) => r.data.data),
    successMessage: 'Fee type archived.', invalidateKeys: INVALIDATE,
  });
  const { mutate: restore } = useApiMutation<unknown, string>({
    mutationFn: (id) => feesApi.restoreType(id).then((r) => r.data.data),
    successMessage: 'Fee type restored.', invalidateKeys: INVALIDATE,
  });

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Types"
        description="The named charges a school bills — Tuition, Feeding, Transport. Each can sit under a statement section."
        action={
          <Button size="sm" id="ft-new" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Fee Type
          </Button>
        }
      />

      <NoticeBar>
        Archiving a fee type leaves existing fees and the money billed under it untouched —
        it only drops out of pickers.
      </NoticeBar>

      <Checkbox
        id="ft-show-archived" label="Show archived"
        checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)}
      />

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!isPermissionDenied(error) && (
        <Card className="p-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Statement section</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? <TableSkeleton columns={5} />
              : !rows.length ? <EmptyTable columns={5} message="No fee types yet." />
              : (
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id} className={t.isActive ? '' : 'opacity-50'}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        {t.label ? <StatusBadge variant="info" label={t.label.name} />
                          : <span className="text-sm text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.description ?? '—'}</TableCell>
                      <TableCell><StatusBadge variant={t.isActive ? 'active' : 'archived'} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit"
                            onClick={() => setEditTarget(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {t.isActive ? (
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Archive" onClick={() => archive(t.id)}>
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              title="Restore" onClick={() => restore(t.id)}>
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
      )}

      <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="New Fee Type"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating}
          formId="fee-type-form" submitLabel="Create" />}>
        <TypeForm labels={labels ?? []} onSubmit={(v) => create({
          name: v.name, description: v.description || undefined, labelId: v.labelId || undefined,
        })} />
      </FormDialog>

      <FormDialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        title="Edit Fee Type"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="fee-type-form" />}>
        {editTarget && (
          <TypeForm labels={labels ?? []}
            defaultValues={{
              name: editTarget.name,
              description: editTarget.description ?? '',
              labelId: editTarget.labelId ?? '',
            }}
            onSubmit={(v) => update({
              id: editTarget.id, name: v.name,
              description: v.description || undefined, labelId: v.labelId || undefined,
            })} />
        )}
      </FormDialog>
    </div>
  );
}
