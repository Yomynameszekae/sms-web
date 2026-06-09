'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive } from 'lucide-react';
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
import { levelsApi } from '@/lib/api/endpoints/levels';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { Level, LevelGroup, CreateLevelPayload, UpdateLevelPayload } from '@/types/api';

const LEVEL_GROUPS: LevelGroup[] = [
  'CRECHE', 'NURSERY', 'KG', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JHS',
];

const GROUP_LABELS: Record<LevelGroup, string> = {
  CRECHE:        'Crèche',
  NURSERY:       'Nursery',
  KG:            'Kindergarten',
  LOWER_PRIMARY: 'Lower Primary',
  UPPER_PRIMARY: 'Upper Primary',
  JHS:           'JHS',
};

const levelSchema = z.object({
  name:             z.string().min(1, 'Name is required'),
  gesDesignation:   z.string().optional(),
  abekaDesignation: z.string().optional(),
  orderIndex:       z.number().int().min(1, 'Order must be ≥ 1'),
  levelGroup:       z.enum(['CRECHE', 'NURSERY', 'KG', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JHS']),
});

type FormValues = z.infer<typeof levelSchema>;

const INVALIDATE = [queryKeys.levels.list()];

function LevelForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit: (v: FormValues) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(levelSchema),
    defaultValues: defaultValues ?? {
      name: '', gesDesignation: '', abekaDesignation: '', orderIndex: 1, levelGroup: 'LOWER_PRIMARY',
    },
  });

  return (
    <form id="level-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="lv-name">Name *</Label>
        <Input id="lv-name" placeholder="e.g. Primary 1" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lv-group">Level Group *</Label>
        <Select id="lv-group" {...form.register('levelGroup')}>
          {LEVEL_GROUPS.map((g) => (
            <option key={g} value={g}>{GROUP_LABELS[g]}</option>
          ))}
        </Select>
        {form.formState.errors.levelGroup && (
          <p className="text-xs text-destructive">{form.formState.errors.levelGroup.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lv-order">Sort Order *</Label>
        <Input id="lv-order" type="number" min={1} {...form.register('orderIndex', { valueAsNumber: true })} />
        {form.formState.errors.orderIndex && (
          <p className="text-xs text-destructive">{form.formState.errors.orderIndex.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lv-ges">GES Designation</Label>
          <Input id="lv-ges" placeholder="e.g. Basic 1" {...form.register('gesDesignation')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lv-abeka">Abeka Designation</Label>
          <Input id="lv-abeka" placeholder="e.g. Grade 1" {...form.register('abekaDesignation')} />
        </div>
      </div>
    </form>
  );
}

export function LevelsView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Level | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.levels.list(),
    queryFn: () => levelsApi.list().then((r) => r.data.data),
  });

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateLevelPayload>({
    mutationFn: (p) => levelsApi.create(p).then((r) => r.data.data),
    successMessage: 'Level created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateLevelPayload>({
    mutationFn: ({ id, ...p }) => levelsApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Level updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => levelsApi.archive(id).then((r) => r.data.data),
    successMessage: 'Level archived.',
    invalidateKeys: INVALIDATE,
  });

  const sorted = data ? [...data].sort((a, b) => a.orderIndex - b.orderIndex) : [];
  const COLS = 6;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Levels"
        description="Year groups and class stages — Crèche, Primary 1–6, JHS 1–3, and others. Archiving is permanent in Phase 1."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Level
          </Button>
        }
      />

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>GES</TableHead>
              <TableHead>Abeka</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS + 1} />
          ) : !sorted.length ? (
            <EmptyTable columns={COLS + 1} message="No levels yet. Add your first level." />
          ) : (
            <TableBody>
              {sorted.map((level) => (
                <TableRow key={level.id} className={level.isActive ? '' : 'opacity-50'}>
                  <TableCell className="text-muted-foreground text-xs">{level.orderIndex}</TableCell>
                  <TableCell className="font-medium">{level.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {GROUP_LABELS[level.levelGroup]}
                  </TableCell>
                  <TableCell className="text-sm">{level.gesDesignation ?? '—'}</TableCell>
                  <TableCell className="text-sm">{level.abekaDesignation ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge variant={level.isActive ? 'active' : 'archived'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => setEditTarget(level)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {level.isActive && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => archive(level.id)}
                        >
                          <Archive className="h-3.5 w-3.5" />
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
        title="New Level"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="level-form" submitLabel="Create" />}
      >
        <LevelForm
          onSubmit={(v) =>
            create({
              name:             v.name,
              gesDesignation:   v.gesDesignation || undefined,
              abekaDesignation: v.abekaDesignation || undefined,
              orderIndex:       v.orderIndex,
              levelGroup:       v.levelGroup,
            })
          }
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Level"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="level-form" />}
      >
        {editTarget && (
          <LevelForm
            defaultValues={{
              name:             editTarget.name,
              gesDesignation:   editTarget.gesDesignation ?? '',
              abekaDesignation: editTarget.abekaDesignation ?? '',
              orderIndex:       editTarget.orderIndex,
              levelGroup:       editTarget.levelGroup,
            }}
            onSubmit={(v) =>
              update({
                id:               editTarget.id,
                name:             v.name,
                gesDesignation:   v.gesDesignation || undefined,
                abekaDesignation: v.abekaDesignation || undefined,
                orderIndex:       v.orderIndex,
                levelGroup:       v.levelGroup,
              })
            }
          />
        )}
      </FormDialog>
    </div>
  );
}
