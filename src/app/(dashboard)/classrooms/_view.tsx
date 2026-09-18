'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive, ArchiveRestore, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { classroomsApi } from '@/lib/api/endpoints/classrooms';
import { levelsApi } from '@/lib/api/endpoints/levels';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { staffApi } from '@/lib/api/endpoints/staff';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { Classroom, CreateClassroomPayload, UpdateClassroomPayload } from '@/types/api';

const classroomSchema = z.object({
  levelId:       z.string().min(1, 'Level is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  sectionLabel:  z.string().min(1, 'Section label is required'),
  displayName:   z.string().min(1, 'Display name is required'),
  capacity:      z.string().optional(),
});
type ClassroomForm = z.infer<typeof classroomSchema>;

const assignTeacherSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
});

const INVALIDATE = [queryKeys.classrooms.all];

function ClassroomForm({
  id, defaultValues, onSubmit,
}: {
  id: string;
  defaultValues?: Partial<ClassroomForm>;
  onSubmit: (v: ClassroomForm) => void;
}) {
  const form = useForm<ClassroomForm>({
    resolver: zodResolver(classroomSchema),
    defaultValues: defaultValues ?? { levelId: '', academicYearId: '', sectionLabel: '', displayName: '' },
  });

  const { data: levels = [] } = useQuery({
    queryKey: queryKeys.levels.list(),
    queryFn: () => levelsApi.list().then((r) => r.data.data),
  });
  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });

  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cr-level">Level *</Label>
          <Select id="cr-level" {...form.register('levelId')}>
            <option value="">Select level…</option>
            {levels.sort((a, b) => a.orderIndex - b.orderIndex).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
          {form.formState.errors.levelId && (
            <p className="text-xs text-destructive">{form.formState.errors.levelId.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cr-year">Academic Year *</Label>
          <Select id="cr-year" {...form.register('academicYearId')}>
            <option value="">Select year…</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </Select>
          {form.formState.errors.academicYearId && (
            <p className="text-xs text-destructive">{form.formState.errors.academicYearId.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cr-section">Section Label *</Label>
          <Input id="cr-section" placeholder="e.g. A" {...form.register('sectionLabel')} />
          {form.formState.errors.sectionLabel && (
            <p className="text-xs text-destructive">{form.formState.errors.sectionLabel.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cr-display">Display Name *</Label>
          <Input id="cr-display" placeholder="e.g. Basic 2A" {...form.register('displayName')} />
          {form.formState.errors.displayName && (
            <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cr-cap">Capacity</Label>
        <Input id="cr-cap" type="number" min={1} placeholder="e.g. 30" {...form.register('capacity')} />
      </div>
    </form>
  );
}

function AssignTeacherDialog({
  classroom, open, onOpenChange,
}: { classroom: Classroom; open: boolean; onOpenChange: (v: boolean) => void }) {
  const form = useForm({
    resolver: zodResolver(assignTeacherSchema),
    defaultValues: { staffId: classroom.classTeacherId ?? '' },
  });
  // Server-side search (staff list capped at 100); active teachers only —
  // the backend refuses non-active assignments regardless.
  const [staffSearch, setStaffSearch] = useState('');
  const { data: staffData, isPending: staffLoading } = useQuery({
    queryKey: queryKeys.staff.list({ roleCategory: 'teacher', status: 'active', search: staffSearch }),
    queryFn: () =>
      staffApi
        .list({ roleCategory: 'teacher', status: 'active', limit: 100, ...(staffSearch ? { search: staffSearch } : {}) })
        .then((r) => r.data.data.items),
  });
  // Persist-with-flag: a terminated teacher keeps the assignment on record.
  // If the current teacher is no longer in the active list, show them
  // flagged so the dialog reflects reality.
  const { data: currentTeacher } = useQuery({
    queryKey: queryKeys.staff.detail(classroom.classTeacherId ?? 'none'),
    queryFn: () => staffApi.get(classroom.classTeacherId!).then((r) => r.data.data),
    enabled: !!classroom.classTeacherId,
  });
  const teacherOptions = (staffData ?? []).map((st) => ({
    value: st.id,
    label: `${st.firstName} ${st.lastName} (${st.staffNumber})`,
  }));
  if (
    currentTeacher &&
    currentTeacher.status !== 'active' &&
    !teacherOptions.some((o) => o.value === currentTeacher.id)
  ) {
    teacherOptions.unshift({
      value: currentTeacher.id,
      label: `${currentTeacher.firstName} ${currentTeacher.lastName} (${currentTeacher.staffNumber})`,
      hint: `(${currentTeacher.status.replace('_', ' ')})`,
    } as (typeof teacherOptions)[number]);
  }

  const { mutate, isPending } = useApiMutation({
    mutationFn: ({ staffId }: { staffId: string }) =>
      classroomsApi.assignTeacher(classroom.id, staffId).then((r) => r.data.data),
    successMessage: 'Class teacher assigned.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => onOpenChange(false),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Assign Teacher — ${classroom.displayName}`}
      footer={<FormFooter onCancel={() => onOpenChange(false)} isPending={isPending} formId="assign-teacher-form" submitLabel="Assign" />}
    >
      <form id="assign-teacher-form" onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="at-staff">Staff Member *</Label>
          <Controller
            control={form.control}
            name="staffId"
            render={({ field }) => (
              <SearchableSelect
                id="at-staff"
                value={field.value ?? ''}
                onChange={field.onChange}
                loading={staffLoading}
                onSearch={setStaffSearch}
                placeholder="Select staff…"
                options={teacherOptions}
                emptyMessage={(q) => (q ? `No active teachers match '${q}'` : 'No active teachers')}
                aria-invalid={!!form.formState.errors.staffId}
              />
            )}
          />
          {form.formState.errors.staffId && (
            <p className="text-xs text-destructive">{String(form.formState.errors.staffId.message)}</p>
          )}
        </div>
      </form>
    </FormDialog>
  );
}

export function ClassroomsView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Classroom | null>(null);
  const [assignTarget, setAssignTarget] = useState<Classroom | null>(null);

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.classrooms.list(),
    queryFn: () => classroomsApi.list().then((r) => r.data.data),
  });

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateClassroomPayload>({
    mutationFn: (p) => classroomsApi.create(p).then((r) => r.data.data),
    successMessage: 'Classroom created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateClassroomPayload>({
    mutationFn: ({ id, ...p }) => classroomsApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Classroom updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => classroomsApi.archive(id).then((r) => r.data.data),
    successMessage: 'Classroom archived.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: restore } = useApiMutation<unknown, string>({
    mutationFn: (id) => classroomsApi.restore(id).then((r) => r.data.data),
    successMessage: 'Classroom restored.',
    invalidateKeys: INVALIDATE,
  });

  const sorted = [...data].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const COLS = 6;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classrooms"
        description="Class groups for each academic year and level. Archived classrooms can be restored (restore the level first if it is archived)."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Classroom
          </Button>
        }
      />

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS} />
          ) : !sorted.length ? (
            <EmptyTable columns={COLS} message="No classrooms yet." />
          ) : (
            <TableBody>
              {sorted.map((cr) => (
                <TableRow key={cr.id} className={!cr.isActive ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">
                    {cr.displayName}
                    <div className="text-xs text-muted-foreground">Section {cr.sectionLabel}</div>
                  </TableCell>
                  <TableCell className="text-sm">{cr.level?.name ?? cr.levelId.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">{cr.academicYear?.label ?? cr.academicYearId.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">{cr.capacity ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge variant={cr.isActive ? 'active' : 'archived'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Assign teacher"
                        onClick={() => setAssignTarget(cr)}>
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(cr)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {cr.isActive ? (
                        <Button size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title="Archive"
                          onClick={() => archive(cr.id)}>
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          title="Restore"
                          onClick={() => restore(cr.id)}>
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
        title="New Classroom"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="classroom-create-form" submitLabel="Create" />}
      >
        <ClassroomForm
          id="classroom-create-form"
          onSubmit={(v) => create({ ...v, capacity: v.capacity ? parseInt(v.capacity, 10) : undefined })}
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Classroom"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="classroom-edit-form" />}
      >
        {editTarget && (
          <ClassroomForm
            id="classroom-edit-form"
            defaultValues={{
              levelId: editTarget.levelId,
              academicYearId: editTarget.academicYearId,
              sectionLabel: editTarget.sectionLabel,
              displayName: editTarget.displayName,
              capacity: editTarget.capacity?.toString() ?? '',
            }}
            onSubmit={(v) => update({ id: editTarget.id, ...v, capacity: v.capacity ? parseInt(v.capacity, 10) : undefined })}
          />
        )}
      </FormDialog>

      {assignTarget && (
        <AssignTeacherDialog
          classroom={assignTarget}
          open={!!assignTarget}
          onOpenChange={(v) => { if (!v) setAssignTarget(null); }}
        />
      )}
    </div>
  );
}
