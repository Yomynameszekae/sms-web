'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
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
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import type { StatusVariant } from '@/components/shared/status-badge';
import { enrollmentsApi } from '@/lib/api/endpoints/enrollments';
import { studentsApi } from '@/lib/api/endpoints/students';
import { classroomsApi } from '@/lib/api/endpoints/classrooms';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type {
  Enrollment, EnrollmentStatus, CurriculumScope,
  CreateEnrollmentPayload, WithdrawEnrollmentPayload,
} from '@/types/api';

const STATUS_VARIANT: Record<EnrollmentStatus, StatusVariant> = {
  active:      'active',
  withdrawn:   'inactive',
  transferred: 'pending',
  completed:   'closed',
};
const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active:      'Active',
  withdrawn:   'Withdrawn',
  transferred: 'Transferred',
  completed:   'Completed',
};

const CURRICULUM_OPTIONS: CurriculumScope[] = ['GES_NACCA', 'ABEKA', 'BOTH'];

const createSchema = z.object({
  studentId:     z.string().min(1, 'Student is required'),
  classroomId:   z.string().min(1, 'Classroom is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  curriculumTrack: z.enum(['GES_NACCA', 'ABEKA', 'BOTH'] as const),
  enrollmentDate: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const withdrawSchema = z.object({
  exitDate:   z.string().min(1, 'Exit date is required'),
  exitReason: z.string().optional(),
});
type WithdrawForm = z.infer<typeof withdrawSchema>;

const INVALIDATE = [queryKeys.enrollments.all];

function CreateEnrollmentForm({
  id, onSubmit,
}: { id: string; onSubmit: (v: CreateForm) => void }) {
  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { curriculumTrack: 'GES_NACCA' },
  });

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students.list({ limit: 200 }),
    queryFn: () => studentsApi.list({ limit: 200 }).then((r) => r.data.data.items),
  });
  const { data: classrooms = [] } = useQuery({
    queryKey: queryKeys.classrooms.list(),
    queryFn: () => classroomsApi.list().then((r) => r.data.data),
  });
  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });

  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="enr-student">Student *</Label>
        <Select id="enr-student" {...form.register('studentId')}>
          <option value="">Select student…</option>
          {students.filter((s) => s.status === 'active').map((s) => (
            <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentNumber})</option>
          ))}
        </Select>
        {form.formState.errors.studentId && (
          <p className="text-xs text-destructive">{form.formState.errors.studentId.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="enr-classroom">Classroom *</Label>
          <Select id="enr-classroom" {...form.register('classroomId')}>
            <option value="">Select classroom…</option>
            {classrooms.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </Select>
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="enr-date">Enrollment Date</Label>
          <Input id="enr-date" type="date" {...form.register('enrollmentDate')} />
        </div>
      </div>
    </form>
  );
}

function WithdrawDialog({
  enrollment, open, onOpenChange,
}: { enrollment: Enrollment; open: boolean; onOpenChange: (v: boolean) => void }) {
  const form = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { exitDate: new Date().toISOString().slice(0, 10) },
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

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateEnrollmentPayload>({
    mutationFn: (p) => enrollmentsApi.create(p).then((r) => r.data.data),
    successMessage: 'Enrollment created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
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
          {(['active', 'withdrawn', 'transferred', 'completed'] as EnrollmentStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

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
                    {e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString('en-GB') : '—'}
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

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Enrollment"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="enr-create-form" submitLabel="Enroll" />}
      >
        <CreateEnrollmentForm
          id="enr-create-form"
          onSubmit={(v) =>
            create({
              studentId: v.studentId,
              classroomId: v.classroomId,
              academicYearId: v.academicYearId,
              curriculumTrack: v.curriculumTrack,
              enrollmentDate: v.enrollmentDate || undefined,
            })
          }
        />
      </FormDialog>

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
