'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { isPermissionDenied } from '@/lib/api/errors';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import type { StatusVariant } from '@/components/shared/status-badge';
import { enrollmentsApi } from '@/lib/api/endpoints/enrollments';
import { studentsApi } from '@/lib/api/endpoints/students';
import { classroomsApi } from '@/lib/api/endpoints/classrooms';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query-keys';
import { formatDateOnly, todayIso } from '@/lib/date';
import type {
  Enrollment, EnrollmentStatus, CurriculumCode,
  CreateEnrollmentPayload, WithdrawEnrollmentPayload,
} from '@/types/api';

const STATUS_VARIANT: Record<EnrollmentStatus, StatusVariant> = {
  active:      'active',
  withdrawn:   'inactive',
  transferred: 'pending',
  completed:   'closed',
  graduated:   'closed',
};
const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active:      'Active',
  withdrawn:   'Withdrawn',
  transferred: 'Transferred',
  completed:   'Completed',
  graduated:   'Graduated',
};

// An enrollment sits on ONE curriculum — 'BOTH' is an admission-interest value
// and is rejected by the backend's enrollment enum.
const CURRICULUM_OPTIONS: CurriculumCode[] = ['GES_NACCA', 'ABEKA'];

// The backend caps page size at 100; asking for more is a validation error.
const STUDENT_LOOKUP_QUERY = { status: 'active', limit: 100 } as const;

const createSchema = z.object({
  studentId:     z.string().min(1, 'Student is required'),
  classroomId:   z.string().min(1, 'Classroom is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  curriculumTrack: z.enum(['GES_NACCA', 'ABEKA'] as const),
  enrollmentDate: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const withdrawSchema = z.object({
  exitDate:   z.string().min(1, 'Exit date is required'),
  exitReason: z.string().optional(),
});
type WithdrawForm = z.infer<typeof withdrawSchema>;

const INVALIDATE = [queryKeys.enrollments.all];

function CreateEnrollmentDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { curriculumTrack: 'GES_NACCA', enrollmentDate: todayIso() },
  });

  // Server-side student search: the list endpoint is capped at 100 rows, so a
  // client-side filter would silently miss students beyond the first page.
  const [studentSearch, setStudentSearch] = useState('');
  const {
    data: students = [],
    isPending: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: queryKeys.students.list({ ...STUDENT_LOOKUP_QUERY, search: studentSearch }),
    queryFn: () =>
      studentsApi
        .list({ ...STUDENT_LOOKUP_QUERY, ...(studentSearch ? { search: studentSearch } : {}) })
        .then((r) => r.data.data.items),
  });
  const { data: classrooms = [] } = useQuery({
    queryKey: queryKeys.classrooms.list(),
    queryFn: () => classroomsApi.list().then((r) => r.data.data),
  });
  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });

  const { mutate, isPending } = useApiMutation<unknown, CreateEnrollmentPayload>({
    mutationFn: (p) => enrollmentsApi.create(p).then((r) => r.data.data),
    successMessage: 'Enrollment created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => onOpenChange(false),
    onError: (error) => { applyFieldErrors(form, error); },
  });

  const noStudents = !studentsLoading && !studentsError && !students.length && !studentSearch;

  const selectedYearId = useWatch({ control: form.control, name: 'academicYearId' });
  // Item 1: only classrooms of the selected academic year are offered. The
  // backend guards this regardless — the filter is convenience.
  const classroomOptions = classrooms
    .filter((c) => c.isActive && (!selectedYearId || c.academicYearId === selectedYearId))
    .map((c) => ({ value: c.id, label: c.displayName }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Enrollment"
      maxWidth="max-w-lg"
      footer={<FormFooter onCancel={() => onOpenChange(false)} isPending={isPending} formId="enr-create-form" submitLabel="Enroll" />}
    >
      <form
        id="enr-create-form"
        onSubmit={form.handleSubmit((v) =>
          mutate({
            studentId: v.studentId,
            classroomId: v.classroomId,
            academicYearId: v.academicYearId,
            curriculumTrack: v.curriculumTrack,
            enrollmentDate: v.enrollmentDate || undefined,
          })
        )}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="enr-student">Student *</Label>
          <Controller
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <SearchableSelect
                id="enr-student"
                value={field.value ?? ''}
                onChange={field.onChange}
                disabled={!!studentsError || noStudents}
                loading={studentsLoading}
                onSearch={setStudentSearch}
                placeholder={
                  studentsError ? 'Students unavailable'
                  : noStudents ? 'No eligible students'
                  : 'Select student…'
                }
                options={students.map((st) => ({
                  value: st.id,
                  label: `${st.firstName} ${st.lastName} (${st.studentNumber})`,
                }))}
                emptyMessage={(q) => (q ? `No students match '${q}'` : 'No eligible students')}
                aria-invalid={!!form.formState.errors.studentId}
              />
            )}
          />
          {studentsError && (
            <p className="text-xs text-destructive">
              Could not load students — {apiErrorMessage(studentsError)}
            </p>
          )}
          {noStudents && (
            <p className="text-xs text-muted-foreground">
              Only students with an Active status can be enrolled.
            </p>
          )}
          {form.formState.errors.studentId && (
            <p className="text-xs text-destructive">{form.formState.errors.studentId.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="enr-classroom">Classroom *</Label>
            <Controller
              control={form.control}
              name="classroomId"
              render={({ field }) => (
                <SearchableSelect
                  id="enr-classroom"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Select classroom…"
                  options={classroomOptions}
                  emptyMessage={(q) =>
                    q ? `No classrooms match '${q}'` : 'No classrooms in the selected year'}
                  aria-invalid={!!form.formState.errors.classroomId}
                />
              )}
            />
            {form.formState.errors.classroomId && (
              <p className="text-xs text-destructive">{form.formState.errors.classroomId.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enr-year">Academic Year *</Label>
            <Select id="enr-year" {...form.register('academicYearId')}>
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
            <Label htmlFor="enr-track">Curriculum Track *</Label>
            <Select id="enr-track" {...form.register('curriculumTrack')}>
              {CURRICULUM_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            {form.formState.errors.curriculumTrack && (
              <p className="text-xs text-destructive">{form.formState.errors.curriculumTrack.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enr-date">Enrollment Date</Label>
            <Input id="enr-date" type="date" {...form.register('enrollmentDate')} />
            {form.formState.errors.enrollmentDate && (
              <p className="text-xs text-destructive">{form.formState.errors.enrollmentDate.message}</p>
            )}
          </div>
        </div>
      </form>
    </FormDialog>
  );
}

function WithdrawDialog({
  enrollment, open, onOpenChange,
}: { enrollment: Enrollment; open: boolean; onOpenChange: (v: boolean) => void }) {
  const form = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { exitDate: todayIso() },
  });

  const { mutate, isPending } = useApiMutation<unknown, { id: string } & WithdrawEnrollmentPayload>({
    mutationFn: ({ id, ...p }) => enrollmentsApi.withdraw(id, p).then((r) => r.data.data),
    successMessage: 'Enrollment withdrawn.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => onOpenChange(false),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Withdraw Enrollment"
      description="This will mark the enrollment as withdrawn. This action cannot be undone."
      footer={<FormFooter onCancel={() => onOpenChange(false)} isPending={isPending} formId="enr-withdraw-form" submitLabel="Withdraw" />}
    >
      <form
        id="enr-withdraw-form"
        onSubmit={form.handleSubmit((v) => mutate({ id: enrollment.id, ...v, exitReason: v.exitReason || undefined }))}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="wd-date">Exit Date *</Label>
          <Input id="wd-date" type="date" {...form.register('exitDate')} />
          {form.formState.errors.exitDate && (
            <p className="text-xs text-destructive">{form.formState.errors.exitDate.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wd-reason">Exit Reason</Label>
          <Input id="wd-reason" placeholder="e.g. transfer, family relocation…" {...form.register('exitReason')} />
        </div>
      </form>
    </FormDialog>
  );
}

export function EnrollmentsView() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<Enrollment | null>(null);

  const queryParams = { page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.enrollments.list(queryParams),
    queryFn: () => enrollmentsApi.list(queryParams).then((r) => r.data.data),
  });

  // Load lookup data for display
  const { data: classrooms = [] } = useQuery({
    queryKey: queryKeys.classrooms.list(),
    queryFn: () => classroomsApi.list().then((r) => r.data.data),
  });
  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });

  const classroomMap = Object.fromEntries(classrooms.map((c) => [c.id, c.displayName]));
  const yearMap = Object.fromEntries(years.map((y) => [y.id, y.label]));

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const COLS = 7;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        description="Formal class placements. One active enrollment per student per academic year."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Enrollment
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as EnrollmentStatus | ''); setPage(1); }}
          className="max-w-[160px]"
        >
          <option value="">All statuses</option>
          {(['active', 'withdrawn', 'transferred', 'completed', 'graduated'] as EnrollmentStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!isPermissionDenied(error) && (
        <Card className="p-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Classroom</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : !items.length ? (
              <EmptyTable columns={COLS} message="No enrollments found." />
            ) : (
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id} className={e.status !== 'active' ? 'opacity-60' : ''}>
                    <TableCell>
                      <code className="text-xs bg-muted rounded px-1.5 py-0.5">
                        {e.studentId.slice(0, 8)}…
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">{classroomMap[e.classroomId] ?? e.classroomId.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm">{yearMap[e.academicYearId] ?? e.academicYearId.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.curriculumTrack}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateOnly(e.enrollmentDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={STATUS_VARIANT[e.status]} label={STATUS_LABEL[e.status]} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {e.status === 'active' && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => setWithdrawTarget(e)}
                          >
                            <LogOut className="mr-1 h-3.5 w-3.5" />
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
          {pagination && <Pagination {...pagination} onPageChange={setPage} />}
        </Card>
      )}

      {createOpen && (
        <CreateEnrollmentDialog open onOpenChange={setCreateOpen} />
      )}

      {withdrawTarget && (
        <WithdrawDialog
          enrollment={withdrawTarget}
          open={!!withdrawTarget}
          onOpenChange={(v) => { if (!v) setWithdrawTarget(null); }}
        />
      )}
    </div>
  );
}
