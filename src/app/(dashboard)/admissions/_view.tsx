'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Gift, UserCheck, FileText, Undo2, XCircle, LogOut } from 'lucide-react';
import { NoticeBar } from '@/components/shared/notice-bar';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';
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
import { apiErrorMessage, applyFieldErrors } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query-keys';
import { formatDateOnly } from '@/lib/date';
import type {
  Admission, AdmissionStatus, CurriculumScope, CurriculumCode,
  CreateAdmissionPayload, UpdateAdmissionPayload, EnrollAdmissionPayload,
} from '@/types/api';
import type { StatusVariant } from '@/components/shared/status-badge';

const STATUS_VARIANT: Record<AdmissionStatus, StatusVariant> = {
  enquiry:     'pending',
  application: 'info',
  offered:     'info',
  enrolled:    'active',
  rejected:    'error',
  withdrawn:   'inactive',
};
const STATUS_LABEL: Record<AdmissionStatus, string> = {
  enquiry:     'Enquiry',
  application: 'Application',
  offered:     'Offered',
  enrolled:    'Enrolled',
  rejected:    'Rejected',
  withdrawn:   'Withdrawn',
};

const ENQUIRY_SOURCES = ['walk_in', 'referral', 'website', 'social_media', 'advertisement', 'other'];
/** Curriculum *interest* on an admission may be either or both. */
const CURRICULUM_OPTIONS: CurriculumScope[] = ['GES_NACCA', 'ABEKA', 'BOTH'];
/** An enrollment sits on ONE curriculum — the backend rejects 'BOTH' here. */
const TRACK_OPTIONS: CurriculumCode[] = ['GES_NACCA', 'ABEKA'];

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
  curriculumTrack: z.enum(['GES_NACCA', 'ABEKA'] as const),
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

  const [studentSearch, setStudentSearch] = useState('');
  const { data: students = [], isPending: studentsLoading } = useQuery({
    queryKey: queryKeys.students.list({ limit: 100, search: studentSearch }),
    queryFn: () =>
      studentsApi
        .list({ limit: 100, ...(studentSearch ? { search: studentSearch } : {}) })
        .then((r) => r.data.data.items),
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
          <Controller
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <SearchableSelect
                id="adm-student"
                value={field.value ?? ''}
                onChange={field.onChange}
                loading={studentsLoading}
                onSearch={setStudentSearch}
                placeholder="— Not linked —"
                options={[
                  { value: '', label: '— Not linked —' },
                  ...students.map((st) => ({
                    value: st.id,
                    label: `${st.firstName} ${st.lastName} (${st.studentNumber})`,
                  })),
                ]}
                emptyMessage={(q) => (q ? `No students match '${q}'` : 'No students')}
              />
            )}
          />
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

  const [studentSearch, setStudentSearch] = useState('');
  const {
    data: students = [],
    isPending: studentsLoading,
    error: studentsError,
  } = useQuery({
    queryKey: queryKeys.students.list({ limit: 100, search: studentSearch }),
    queryFn: () =>
      studentsApi
        .list({ limit: 100, ...(studentSearch ? { search: studentSearch } : {}) })
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

  const { mutate, isPending } = useApiMutation<unknown, { id: string } & EnrollAdmissionPayload>({
    mutationFn: ({ id, ...p }) => admissionsApi.enroll(id, p).then((r) => r.data.data),
    successMessage: 'Student enrolled successfully.',
    invalidateKeys: [INVALIDATE[0], queryKeys.enrollments.all],
    onSuccess: () => onOpenChange(false),
    onError: (error) => { applyFieldErrors(form, error); },
  });

  const noStudents = !studentsLoading && !studentsError && !students.length && !studentSearch;

  const selectedYearId = useWatch({ control: form.control, name: 'academicYearId' });
  const classroomOptions = classrooms
    .filter((c) => c.isActive && (!selectedYearId || c.academicYearId === selectedYearId))
    .map((c) => ({ value: c.id, label: c.displayName }));

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
            {studentsError ? (
              <p className="text-xs text-destructive">
                Could not load students — {apiErrorMessage(studentsError)}
              </p>
            ) : noStudents ? (
              <p className="text-xs text-muted-foreground">
                No student records exist yet — create one under Students first.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Required if no student is linked to this admission.</p>
            )}
            {form.formState.errors.studentId && (
              <p className="text-xs text-destructive">{form.formState.errors.studentId.message}</p>
            )}
          </div>
        )}
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
        <div className="space-y-1.5">
          <Label htmlFor="enr-track">Curriculum Track *</Label>
          <Select id="enr-track" {...form.register('curriculumTrack')}>
            {TRACK_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          {form.formState.errors.curriculumTrack && (
            <p className="text-xs text-destructive">{form.formState.errors.curriculumTrack.message}</p>
          )}
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

  const { mutate: apply } = useApiMutation<unknown, string>({
    mutationFn: (id) => admissionsApi.apply(id).then((r) => r.data.data),
    successMessage: 'Admission moved to Application.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: revertOffer } = useApiMutation<unknown, string>({
    mutationFn: (id) => admissionsApi.revertOffer(id).then((r) => r.data.data),
    successMessage: 'Offer reverted — back to Application.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: reject } = useApiMutation<unknown, string>({
    mutationFn: (id) => admissionsApi.reject(id).then((r) => r.data.data),
    successMessage: 'Admission rejected.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: withdraw } = useApiMutation<unknown, string>({
    mutationFn: (id) => admissionsApi.withdraw(id).then((r) => r.data.data),
    successMessage: 'Admission withdrawn.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: revertEnrollment } = useApiMutation<unknown, string>({
    mutationFn: (id) => admissionsApi.revertEnrollment(id).then((r) => r.data.data),
    successMessage: 'Enrollment reverted — admission back to Offered.',
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
          <strong>How admissions work:</strong> An admission moves enquiry → application → offered → enrolled,
          or ends as Rejected (school declines) or Withdrawn (family declines).
          A linked student is optional — enquiries can be recorded before a full student profile exists.{' '}
          <strong>Admission numbers</strong> are assigned automatically at creation and can be edited later.{' '}
          <strong>Reversals:</strong> an offer can be reverted to Application, and an enrollment can be
          reverted to Offered once the enrollment itself has been withdrawn. Rejected and Withdrawn are final.
        </span>
      </NoticeBar>

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as AdmissionStatus | ''); setPage(1); }}
          className="max-w-[180px]"
        >
          <option value="">All statuses</option>
          {(['enquiry', 'application', 'offered', 'enrolled', 'rejected', 'withdrawn'] as AdmissionStatus[]).map((s) => (
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
                <TableRow key={a.id} className={a.status === 'rejected' || a.status === 'withdrawn' ? 'opacity-60' : ''}>
                  <TableCell>
                    <code className="text-xs bg-muted rounded px-1.5 py-0.5">{a.admissionNumber}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {a.enquirySource?.replace('_', ' ') ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.curriculumInterest ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateOnly(a.applicationDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[a.status]} label={STATUS_LABEL[a.status]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.enrolledAt ? new Date(a.enrolledAt).toLocaleDateString('en-GB') : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* State-driven actions — mirrors the backend transition matrix. */}
                      {a.status === 'enquiry' && (
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          title="Move to application"
                          onClick={() => apply(a.id)}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Apply
                        </Button>
                      )}
                      {['enquiry', 'application'].includes(a.status) && (
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary"
                          title="Make offer"
                          onClick={() => offer(a.id)}
                        >
                          <Gift className="mr-1 h-3.5 w-3.5" />
                          Offer
                        </Button>
                      )}
                      {a.status === 'offered' && (
                        <>
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-xs" style={{ color: 'var(--success)' }}
                            title="Enroll student"
                            onClick={() => setEnrollTarget(a)}
                          >
                            <UserCheck className="mr-1 h-3.5 w-3.5" />
                            Enroll
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            title="Revert offer"
                            onClick={() => revertOffer(a.id)}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {['enquiry', 'application', 'offered'].includes(a.status) && (
                        <>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Reject (school declines)"
                            onClick={() => reject(a.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            title="Withdraw (family declines)"
                            onClick={() => withdraw(a.id)}
                          >
                            <LogOut className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            title="Edit"
                            onClick={() => setEditTarget(a)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {a.status === 'enrolled' && (
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
                          title="Revert enrollment (requires the enrollment to be withdrawn first)"
                          onClick={() => revertEnrollment(a.id)}
                        >
                          <Undo2 className="mr-1 h-3.5 w-3.5" />
                          Revert
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
