'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Gift, UserCheck } from 'lucide-react';
import { NoticeBar } from '@/components/shared/notice-bar';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { admissionsApi } from '@/lib/api/endpoints/admissions';
import { studentsApi } from '@/lib/api/endpoints/students';
import { levelsApi } from '@/lib/api/endpoints/levels';
import { classroomsApi } from '@/lib/api/endpoints/classrooms';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type {
  Admission, AdmissionStatus, CurriculumScope,
  CreateAdmissionPayload, UpdateAdmissionPayload, EnrollAdmissionPayload,
} from '@/types/api';
import type { StatusVariant } from '@/components/shared/status-badge';

const STATUS_VARIANT: Record<AdmissionStatus, StatusVariant> = {
  enquiry:     'pending',
  application: 'info',
  offered:     'info',
  enrolled:    'active',
  withdrawn:   'inactive',
  rejected:    'error',
};
const STATUS_LABEL: Record<AdmissionStatus, string> = {
  enquiry:     'Enquiry',
  application: 'Application',
  offered:     'Offered',
  enrolled:    'Enrolled',
  withdrawn:   'Withdrawn',
  rejected:    'Rejected',
};

const ENQUIRY_SOURCES = ['walk_in', 'referral', 'website', 'social_media', 'advertisement', 'other'];
const CURRICULUM_OPTIONS: CurriculumScope[] = ['GES_NACCA', 'ABEKA', 'BOTH'];

const admissionFormSchema = z.object({
  studentId:          z.string().optional(),
  intendedLevelId:    z.string().optional(),
  curriculumInterest: z.string().optional(),
  enquirySource:      z.string().optional(),
  notes:              z.string().optional(),
});
type AdmissionForm = z.infer<typeof admissionFormSchema>;

const enrollSchema = z.object({
  studentId:      z.string().optional(),
  classroomId:    z.string().min(1, 'Classroom is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  curriculumTrack: z.enum(['GES_NACCA', 'ABEKA', 'BOTH'] as const),
});
type EnrollForm = z.infer<typeof enrollSchema>;

const INVALIDATE = [queryKeys.admissions.all];

function AdmissionFormBody({
  id, defaultValues, onSubmit,
}: {
  id: string;
  defaultValues?: Partial<AdmissionForm>;
  onSubmit: (v: AdmissionForm) => void;
}) {
  const form = useForm<AdmissionForm>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: defaultValues ?? {},
  });

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students.list({ limit: 100 }),
    queryFn: () => studentsApi.list({ limit: 100 }).then((r) => r.data.data.items),
  });
  const { data: levels = [] } = useQuery({
    queryKey: queryKeys.levels.list(),
    queryFn: () => levelsApi.list().then((r) => r.data.data),
  });

  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="adm-student">Student (optional)</Label>
          <Select id="adm-student" {...form.register('studentId')}>
            <option value="">— Not linked —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentNumber})</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adm-level">Intended Level (optional)</Label>
          <Select id="adm-level" {...form.register('intendedLevelId')}>
            <option value="">— Not specified —</option>
            {levels.sort((a, b) => a.orderIndex - b.orderIndex).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="adm-source">Enquiry Source</Label>
          <Select id="adm-source" {...form.register('enquirySource')}>
            <option value="">— Select —</option>
            {ENQUIRY_SOURCES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adm-curriculum">Curriculum Interest</Label>
          <Select id="adm-curriculum" {...form.register('curriculumInterest')}>
            <option value="">— Not specified —</option>
            {CURRICULUM_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="adm-notes">Notes</Label>
        <Textarea id="adm-notes" rows={3} {...form.register('notes')} />
      </div>
    </form>
  );
}

function EnrollDialog({
  admission, open, onOpenChange,
}: { admission: Admission; open: boolean; onOpenChange: (v: boolean) => void }) {
  const form = useForm<EnrollForm>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { curriculumTrack: 'GES_NACCA' },
  });

  const { data: students = [] } = useQuery({
    queryKey: queryKeys.students.list({ limit: 100 }),
    queryFn: () => studentsApi.list({ limit: 100 }).then((r) => r.data.data.items),
  });
  const { data: classrooms = [] } = useQuery({
    queryKey: queryKeys.classrooms.list(),
    queryFn: () => classroomsApi.list().then((r) => r.data.data),
  });
  const { data: years = [] } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
  });

  const { mutate, isPending } = useApiMutation<unknown, { id: string } & EnrollAdmissionPayload>({
    mutationFn: ({ id, ...p }) => admissionsApi.enroll(id, p).then((r) => r.data.data),
    successMessage: 'Student enrolled successfully.',
    invalidateKeys: [INVALIDATE[0], queryKeys.enrollments.all],
    onSuccess: () => onOpenChange(false),
  });

  const desc = admission.studentId
    ? 'A student is already linked to this admission.'
    : 'No student is linked — select one to enroll.';

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Enroll Student"
      description={desc}
      footer={<FormFooter onCancel={() => onOpenChange(false)} isPending={isPending} formId="adm-enroll-form" submitLabel="Enroll" />}
    >
      <form
        id="adm-enroll-form"
        onSubmit={form.handleSubmit((v) =>
          mutate({ id: admission.id, ...v, studentId: v.studentId || undefined })
        )}
        className="space-y-3"
      >
        {!admission.studentId && (
          <div className="space-y-1.5">
            <Label htmlFor="enr-student">Student</Label>
            <Select id="enr-student" {...form.register('studentId')}>
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentNumber})</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">Required if no student is linked to this admission.</p>
          </div>
        )}
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
        <div className="space-y-1.5">
          <Label htmlFor="enr-track">Curriculum Track *</Label>
          <Select id="enr-track" {...form.register('curriculumTrack')}>
            {CURRICULUM_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
      </form>
    </FormDialog>
  );
}

export function AdmissionsView() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Admission | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<Admission | null>(null);

  const queryParams = { page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admissions.list(queryParams),
    queryFn: () => admissionsApi.list(queryParams).then((r) => r.data.data),
  });

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateAdmissionPayload>({
    mutationFn: (p) => admissionsApi.create(p).then((r) => r.data.data),
    successMessage: 'Admission created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateAdmissionPayload>({
    mutationFn: ({ id, ...p }) => admissionsApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Admission updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: offer } = useApiMutation<unknown, string>({
    mutationFn: (id) => admissionsApi.offer(id).then((r) => r.data.data),
    successMessage: 'Admission offer made.',
    invalidateKeys: INVALIDATE,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const COLS = 7;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        description="Track prospective students from initial enquiry through offer to formal enrollment."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Admission
          </Button>
        }
      />

      <NoticeBar>
        <span>
          <strong>How admissions work:</strong> An admission record represents a prospective student moving from enquiry → application → offered → enrolled.
          A linked student is optional — enquiries can be recorded before a full student profile exists.
          Once an offer is made, enrolment places the child into a classroom and academic year.{' '}
          <strong>Admission numbers</strong> are not auto-generated in Phase 1; they can be set manually via Edit.{' '}
          <strong>Offer reversal</strong> (withdrawing an offer) is not available in Phase 1.
        </span>
      </NoticeBar>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as AdmissionStatus | ''); setPage(1); }}
          className="max-w-[180px]"
        >
          <option value="">All statuses</option>
          {(['enquiry', 'application', 'offered', 'enrolled', 'withdrawn', 'rejected'] as AdmissionStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admission #</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Curriculum Interest</TableHead>
              <TableHead>Application Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled At</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS} />
          ) : !items.length ? (
            <EmptyTable columns={COLS} message="No admissions found." />
          ) : (
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id} className={['withdrawn', 'rejected'].includes(a.status) ? 'opacity-60' : ''}>
                  <TableCell>
                    {a.admissionNumber
                      ? <code className="text-xs bg-muted rounded px-1.5 py-0.5">{a.admissionNumber}</code>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {a.enquirySource?.replace('_', ' ') ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.curriculumInterest ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.applicationDate ? new Date(a.applicationDate).toLocaleDateString('en-GB') : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[a.status]} label={STATUS_LABEL[a.status]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.enrolledAt ? new Date(a.enrolledAt).toLocaleDateString('en-GB') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {['enquiry', 'application'].includes(a.status) && (
                        <>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            title="Edit"
                            onClick={() => setEditTarget(a)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary"
                            title="Make offer"
                            onClick={() => offer(a.id)}
                          >
                            <Gift className="mr-1 h-3.5 w-3.5" />
                            Offer
                          </Button>
                        </>
                      )}
                      {a.status === 'offered' && (
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-xs" style={{ color: 'var(--success)' }}
                          title="Enroll student"
                          onClick={() => setEnrollTarget(a)}
                        >
                          <UserCheck className="mr-1 h-3.5 w-3.5" />
                          Enroll
                        </Button>
                      )}
                      {a.status === 'offered' && (
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          title="Edit"
                          onClick={() => setEditTarget(a)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
        title="New Admission"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="adm-create-form" submitLabel="Create Admission" />}
      >
        <AdmissionFormBody
          id="adm-create-form"
          onSubmit={(v) =>
            create({
              studentId: v.studentId || undefined,
              intendedLevelId: v.intendedLevelId || undefined,
              curriculumInterest: (v.curriculumInterest || undefined) as CurriculumScope | undefined,
              enquirySource: v.enquirySource || undefined,
              notes: v.notes || undefined,
            })
          }
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Admission"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="adm-edit-form" />}
      >
        {editTarget && (
          <AdmissionFormBody
            id="adm-edit-form"
            defaultValues={{
              studentId: editTarget.studentId ?? '',
              intendedLevelId: editTarget.intendedLevelId ?? '',
              curriculumInterest: editTarget.curriculumInterest ?? '',
              enquirySource: editTarget.enquirySource ?? '',
              notes: editTarget.notes ?? '',
            }}
            onSubmit={(v) =>
              update({
                id: editTarget.id,
                studentId: v.studentId || undefined,
                intendedLevelId: v.intendedLevelId || undefined,
                curriculumInterest: (v.curriculumInterest || undefined) as CurriculumScope | undefined,
                enquirySource: v.enquirySource || undefined,
                notes: v.notes || undefined,
              })
            }
          />
        )}
      </FormDialog>

      {enrollTarget && (
        <EnrollDialog
          admission={enrollTarget}
          open={!!enrollTarget}
          onOpenChange={(v) => { if (!v) setEnrollTarget(null); }}
        />
      )}
    </div>
  );
}
