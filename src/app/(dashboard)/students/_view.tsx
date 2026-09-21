'use client';

import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive, ArchiveRestore, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { isPermissionDenied } from '@/lib/api/errors';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { studentsApi } from '@/lib/api/endpoints/students';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { formatDateOnly, DATE_ONLY_LONG } from '@/lib/date';
import type { Student, StudentStatus, Gender, CreateStudentPayload, UpdateStudentPayload, StudentGuardian } from '@/types/api';

// Student.status is the backend's EnrollmentStatus enum. Phase 1 only ever
// sets 'active' and 'withdrawn' (archiving stores withdrawn + archivedAt),
// but the map covers the full enum so a value set via the API still renders.
const STATUS_VARIANT: Record<StudentStatus, 'active' | 'pending' | 'closed' | 'inactive'> = {
  active: 'active', withdrawn: 'inactive', transferred: 'pending',
  completed: 'closed', graduated: 'closed',
};
const STATUS_LABEL: Record<StudentStatus, string> = {
  active: 'Active', withdrawn: 'Withdrawn', transferred: 'Transferred',
  completed: 'Completed', graduated: 'Graduated',
};

const studentSchema = z.object({
  studentNumber: z.string().optional(),
  firstName:     z.string().min(1, 'First name is required'),
  middleName:    z.string().optional(),
  lastName:      z.string().min(1, 'Last name is required'),
  preferredName: z.string().optional(),
  dateOfBirth:   z.string().min(1, 'Date of birth is required'),
  gender:        z.enum(['male', 'female', 'other']),
  nationality:   z.string().optional(),
  religion:      z.string().optional(),
  ghanaCardId:   z.string().optional(),
  previousSchool: z.string().optional(),
  admissionDate: z.string().optional(),
});

const updateSchema = studentSchema.omit({ studentNumber: true });
type CreateForm = z.infer<typeof studentSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

function fmtDate(iso: string) {
  return formatDateOnly(iso, DATE_ONLY_LONG);
}

function StudentCoreFields<T extends UpdateForm>({ form }: { form: ReturnType<typeof useForm<T>> }) {
  const f = form as unknown as ReturnType<typeof useForm<UpdateForm>>;
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="st-fn">First Name *</Label>
          <Input id="st-fn" {...f.register('firstName')} />
          {f.formState.errors.firstName && <p className="text-xs text-destructive">{f.formState.errors.firstName.message as string}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-mn">Middle Name</Label>
          <Input id="st-mn" {...f.register('middleName')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-ln">Last Name *</Label>
          <Input id="st-ln" {...f.register('lastName')} />
          {f.formState.errors.lastName && <p className="text-xs text-destructive">{f.formState.errors.lastName.message as string}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="st-pref">Preferred Name</Label>
          <Input id="st-pref" {...f.register('preferredName')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-dob">Date of Birth *</Label>
          <Input id="st-dob" type="date" {...f.register('dateOfBirth')} />
          {f.formState.errors.dateOfBirth && <p className="text-xs text-destructive">{f.formState.errors.dateOfBirth.message as string}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="st-gender">Gender *</Label>
          <Select id="st-gender" {...f.register('gender')}>
            {(['male', 'female', 'other'] as Gender[]).map((g) => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-nat">Nationality</Label>
          <Input id="st-nat" placeholder="e.g. Ghanaian" {...f.register('nationality')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="st-ghana">Ghana Card ID</Label>
          <Input id="st-ghana" placeholder="Optional" {...f.register('ghanaCardId')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="st-admit">Admission Date</Label>
          <Input id="st-admit" type="date" {...f.register('admissionDate')} />
        </div>
      </div>
    </>
  );
}

function CreateStudentForm({
  id, onSubmit,
}: { id: string; onSubmit: (v: CreateForm) => void }) {
  const form = useForm<CreateForm>({ resolver: zodResolver(studentSchema), defaultValues: { gender: 'male' } });
  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="st-num">Student Number</Label>
        <Input id="st-num" placeholder="Leave blank to auto-generate" {...form.register('studentNumber')} />
        {form.formState.errors.studentNumber && <p className="text-xs text-destructive">{form.formState.errors.studentNumber.message}</p>}
      </div>
      <StudentCoreFields form={form} />
    </form>
  );
}

function EditStudentForm({
  id, defaultValues, onSubmit,
}: { id: string; defaultValues: UpdateForm; onSubmit: (v: UpdateForm) => void }) {
  const form = useForm<UpdateForm>({ resolver: zodResolver(updateSchema), defaultValues });
  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <StudentCoreFields form={form} />
    </form>
  );
}

function StudentGuardiansPanel({ studentId }: { studentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.students.guardians(studentId),
    queryFn: () => studentsApi.getGuardians(studentId).then((r) => r.data.data),
  });

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (!data?.length) return <p className="text-xs text-muted-foreground italic">No guardians linked.</p>;

  return (
    <div className="space-y-1">
      {(data as StudentGuardian[]).map((link) => (
        <div key={link.id} className="flex items-center gap-2 text-xs">
          <span className="font-medium">{link.guardian?.firstName} {link.guardian?.lastName}</span>
          <span className="text-muted-foreground">{link.relationship ?? '—'}</span>
          {link.isPrimary && <span className="font-medium" style={{ color: 'var(--success)' }}>★ Primary</span>}
        </div>
      ))}
    </div>
  );
}

export function StudentsView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);

  const queryParams = { page, limit: 50, ...(search ? { search } : {}) };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.students.list(queryParams),
    queryFn: () => studentsApi.list(queryParams).then((r) => r.data.data),
  });

  const INVALIDATE = [queryKeys.students.all];

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateStudentPayload>({
    mutationFn: (p) => studentsApi.create(p).then((r) => r.data.data),
    successMessage: 'Student created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateStudentPayload>({
    mutationFn: ({ id, ...p }) => studentsApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Student updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => studentsApi.archive(id).then((r) => r.data.data),
    successMessage: 'Student archived.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: restore } = useApiMutation<unknown, string>({
    mutationFn: (id) => studentsApi.restore(id).then((r) => r.data.data),
    successMessage: 'Student restored.',
    invalidateKeys: INVALIDATE,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const COLS = 7;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Student records including personal details and enrolment history. Archived students can be restored — restore returns them to Active."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Student
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name or number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!isPermissionDenied(error) && (
        <Card className="p-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Student #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : !items.length ? (
              <EmptyTable columns={COLS} message="No students found." />
            ) : (
              <TableBody>
                {items.map((s) => (
                  <Fragment key={s.id}>
                    <TableRow className={s.status !== 'active' ? 'opacity-60' : ''}>
                      <TableCell>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        >
                          {expandedId === s.id
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted rounded px-1.5 py-0.5">{s.studentNumber}</code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.preferredName ? `${s.preferredName} (${s.firstName})` : s.firstName} {s.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{s.gender}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(s.dateOfBirth)}</TableCell>
                      <TableCell>
                        <StatusBadge variant={STATUS_VARIANT[s.status]} label={STATUS_LABEL[s.status]} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {s.status === 'active' && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Archive"
                              onClick={() => archive(s.id)}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {s.archivedAt && (
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              title="Restore"
                              onClick={() => restore(s.id)}
                            >
                              <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === s.id && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={COLS} className="py-3 pl-10">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Guardians</p>
                          <StudentGuardiansPanel studentId={s.id} />
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
      )}

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Student"
        maxWidth="max-w-xl"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="student-create-form" submitLabel="Create" />}
      >
        <CreateStudentForm
          id="student-create-form"
          onSubmit={(v) =>
            create({
              studentNumber: v.studentNumber || undefined,
              firstName: v.firstName, middleName: v.middleName || undefined,
              lastName: v.lastName, preferredName: v.preferredName || undefined,
              dateOfBirth: v.dateOfBirth, gender: v.gender,
              nationality: v.nationality || undefined,
              ghanaCardId: v.ghanaCardId || undefined,
              admissionDate: v.admissionDate || undefined,
            })
          }
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Student"
        maxWidth="max-w-xl"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="student-edit-form" />}
      >
        {editTarget && (
          <EditStudentForm
            id="student-edit-form"
            defaultValues={{
              firstName: editTarget.firstName, middleName: editTarget.middleName ?? '',
              lastName: editTarget.lastName, preferredName: editTarget.preferredName ?? '',
              dateOfBirth: editTarget.dateOfBirth.slice(0, 10), gender: editTarget.gender,
              nationality: editTarget.nationality ?? '',
              ghanaCardId: editTarget.ghanaCardId ?? '',
              admissionDate: editTarget.admissionDate?.slice(0, 10) ?? '',
            }}
            onSubmit={(v) =>
              update({
                id: editTarget.id,
                firstName: v.firstName, middleName: v.middleName || undefined,
                lastName: v.lastName, preferredName: v.preferredName || undefined,
                dateOfBirth: v.dateOfBirth, gender: v.gender,
                nationality: v.nationality || undefined,
                ghanaCardId: v.ghanaCardId || undefined,
                admissionDate: v.admissionDate || undefined,
              })
            }
          />
        )}
      </FormDialog>
    </div>
  );
}
