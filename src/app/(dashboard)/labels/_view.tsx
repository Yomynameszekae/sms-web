'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive, ArchiveRestore } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { labelsApi } from '@/lib/api/endpoints/labels';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type {
  FinanceLabel, LabelCategory, CreateLabelPayload, UpdateLabelPayload,
} from '@/types/api';

const CATEGORIES: LabelCategory[] = ['fee', 'income', 'expenditure'];

const CATEGORY_LABELS: Record<LabelCategory, string> = {
  fee: 'Fee',
  income: 'Income',
  expenditure: 'Expenditure',
};

const createSchema = z.object({
  category: z.enum(['fee', 'income', 'expenditure']),
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;

const INVALIDATE = [queryKeys.labels.all];

function LabelForm({
  defaultValues,
  categoryLocked,
  onSubmit,
}: {
  defaultValues?: Partial<CreateValues>;
  /** True when editing: category is immutable after creation. */
  categoryLocked?: boolean;
  onSubmit: (v: CreateValues) => void;
}) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: defaultValues ?? { category: 'fee', name: '', description: '' },
  });

  return (
    <form id="label-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="lb-category">Category *</Label>
        <Select id="lb-category" disabled={categoryLocked} {...form.register('category')}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </Select>
        {categoryLocked && (
          <p className="text-xs text-muted-foreground">
            A label&rsquo;s category cannot be changed. Archive it and create a new one instead.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lb-name">Name *</Label>
        <Input id="lb-name" placeholder="e.g. Tuition" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Names are unique per category and ignore capitalisation, so the same word can
          be used in two different categories.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lb-description">Description</Label>
        <Textarea id="lb-description" rows={2} {...form.register('description')} />
      </div>
    </form>
  );
}

export function LabelsView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<LabelCategory | ''>('');
  const [editTarget, setEditTarget] = useState<FinanceLabel | null>(null);

  const params = {
    ...(categoryFilter ? { category: categoryFilter as LabelCategory } : {}),
    includeArchived: showArchived,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.labels.list(params),
    queryFn: () => labelsApi.list(params).then((r) => r.data.data),
  });

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateLabelPayload>({
    mutationFn: (p) => labelsApi.create(p).then((r) => r.data.data),
    successMessage: 'Label created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<
    unknown,
    { id: string } & UpdateLabelPayload
  >({
    mutationFn: ({ id, ...p }) => labelsApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Label updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => labelsApi.archive(id).then((r) => r.data.data),
    successMessage: 'Label archived.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: restore } = useApiMutation<unknown, string>({
    mutationFn: (id) => labelsApi.restore(id).then((r) => r.data.data),
    successMessage: 'Label restored.',
    invalidateKeys: INVALIDATE,
  });

  const rows = data ?? [];
  const COLS = 4;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels"
        description="Shared section headings used to group financial records. A label's category decides which part of a statement it rolls up to."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Label
          </Button>
        }
      />

      <NoticeBar>
        Only <strong>Fee</strong> labels have a consumer today. Income and expenditure
        labels can be set up now and will be used when those modules arrive.
      </NoticeBar>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="lb-filter" className="text-sm text-muted-foreground">Category</Label>
          <Select
            id="lb-filter"
            className="w-44"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as LabelCategory | '')}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </Select>
        </div>
        <Checkbox
          id="lb-show-archived"
          label="Show archived"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS + 1} />
          ) : !rows.length ? (
            <EmptyTable columns={COLS + 1} message="No labels yet. Add your first label." />
          ) : (
            <TableBody>
              {rows.map((label) => (
                <TableRow key={label.id} className={label.isActive ? '' : 'opacity-50'}>
                  <TableCell className="font-medium">{label.name}</TableCell>
                  <TableCell>
                    <StatusBadge variant="info" label={CATEGORY_LABELS[label.category]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {label.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={label.isActive ? 'active' : 'archived'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0"
                        title="Edit"
                        onClick={() => setEditTarget(label)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {label.isActive ? (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Archive"
                          onClick={() => archive(label.id)}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          title="Restore"
                          onClick={() => restore(label.id)}
                        >
                          <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                          Restore
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
        title="New Label"
        footer={
          <FormFooter
            onCancel={() => setCreateOpen(false)}
            isPending={creating}
            formId="label-form"
            submitLabel="Create"
          />
        }
      >
        <LabelForm
          onSubmit={(v) =>
            create({
              category: v.category,
              name: v.name,
              description: v.description || undefined,
            })
          }
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Label"
        footer={
          <FormFooter
            onCancel={() => setEditTarget(null)}
            isPending={updating}
            formId="label-form"
          />
        }
      >
        {editTarget && (
          <LabelForm
            categoryLocked
            defaultValues={{
              category: editTarget.category,
              name: editTarget.name,
              description: editTarget.description ?? '',
            }}
            onSubmit={(v) =>
              // `category` is deliberately not sent: the backend rejects it.
              update({
                id: editTarget.id,
                name: v.name,
                description: v.description || undefined,
              })
            }
          />
        )}
      </FormDialog>
    </div>
  );
}
