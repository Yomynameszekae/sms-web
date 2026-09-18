'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Unlock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { attendanceApi } from '@/lib/api/endpoints/attendance';
import { termsApi } from '@/lib/api/endpoints/terms';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import type { ReopenTermResult, Term } from '@/types/api';
import { RegisterPanel } from './_register';
import { SummaryPanel } from './_summary';

type Tab = 'register' | 'summary';

const reopenSchema = z.object({
  reason: z
    .string()
    .min(10, 'Give a reason of at least 10 characters — it goes into the audit trail'),
});
type ReopenValues = z.infer<typeof reopenSchema>;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('register');
  // Held as an explicit override, not synced from data through an effect: the
  // effective value falls back to the first available option, so there is no
  // render in which nothing is selected.
  const [classroomOverride, setClassroomOverride] = useState('');
  const [date, setDate] = useState(todayIso());
  const [termOverride, setTermOverride] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenTermId, setReopenTermId] = useState('');

  // Reopening a closed term is a Super Admin action. The backend enforces this
  // by role; hiding the control for everyone else keeps the UI honest rather
  // than offering a button that always 403s.
  const isSuperAdmin = !!user?.roles?.some((r) => r.code === 'SUPER_ADMIN');

  const {
    data: classrooms, isLoading: loadingClassrooms, error: classroomsError, refetch,
  } = useQuery({
    queryKey: queryKeys.attendance.classrooms(),
    queryFn: () => attendanceApi.classrooms().then((r) => r.data.data),
  });

  const { data: terms } = useQuery({
    queryKey: queryKeys.terms.list(),
    queryFn: () => termsApi.list().then((r) => r.data.data),
  });

  const selected = useMemo(
    () =>
      classrooms?.find((c) => c.id === classroomOverride) ?? classrooms?.[0],
    [classrooms, classroomOverride],
  );
  const classroomId = selected?.id ?? '';

  // Terms of the selected classroom's academic year — a summary for a term
  // from another year is a 409 from the backend, so do not offer it.
  const termsForClassroom = useMemo<Term[]>(() => {
    if (!terms || !selected) return [];
    return terms
      .filter((t) => t.academicYearId === selected.academicYearId)
      .sort((a, b) => a.termNumber - b.termNumber);
  }, [terms, selected]);

  // Default to the active term of that year, else the last one. Derived, so
  // changing classroom cannot leave a term from another year selected.
  const termId = useMemo(() => {
    if (!termsForClassroom.length) return '';
    const chosen = termsForClassroom.find((t) => t.id === termOverride);
    if (chosen) return chosen.id;
    const active = termsForClassroom.find((t) => t.status === 'active');
    return (active ?? termsForClassroom[termsForClassroom.length - 1]).id;
  }, [termsForClassroom, termOverride]);

  const reopenForm = useForm<ReopenValues>({
    resolver: zodResolver(reopenSchema),
    defaultValues: { reason: '' },
  });

  const { mutate: reopen, isPending: reopening } = useApiMutation<
    ReopenTermResult, { termId: string; reason: string }
  >({
    mutationFn: ({ termId: id, reason }) =>
      attendanceApi.reopenTerm(id, reason).then((r) => r.data.data),
    successMessage: (result) =>
      `${result.termLabel} reopened — its register can now be amended.`,
    invalidateKeys: [queryKeys.attendance.all],
    onSuccess: () => {
      setReopenOpen(false);
      reopenForm.reset();
    },
  });

  const closedTerms = termsForClassroom.filter((t) => t.status === 'closed');

  if (classroomsError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Daily register per classroom." />
        <ApiError error={classroomsError} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Daily register per classroom, and per-term summaries. Class teachers mark their own classroom; administrators can mark any."
        action={
          isSuperAdmin && closedTerms.length ? (
            <Button size="sm" variant="outline" id="att-reopen-open" onClick={() => setReopenOpen(true)}>
              <Unlock className="mr-1.5 h-3.5 w-3.5" />
              Reopen a closed term
            </Button>
          ) : undefined
        }
      />

      {!loadingClassrooms && !classrooms?.length && (
        <NoticeBar variant="lock">
          You are not the class teacher of any classroom, so there is no register to show.
          Marking another classroom&rsquo;s register needs the wider attendance permission.
        </NoticeBar>
      )}

      {!!classrooms?.length && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="att-classroom" className="text-sm text-muted-foreground">
                Classroom
              </Label>
              <Select
                id="att-classroom"
                className="w-64"
                value={classroomId}
                onChange={(e) => setClassroomOverride(e.target.value)}
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} — {c.academicYearLabel}
                  </option>
                ))}
              </Select>
            </div>

            <div className="ml-auto inline-flex rounded-lg border overflow-hidden">
              {(['register', 'summary'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  id={`att-tab-${t}`}
                  onClick={() => setTab(t)}
                  className={
                    tab === t
                      ? 'bg-primary text-primary-foreground px-4 py-2 text-sm font-medium'
                      : 'px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors'
                  }
                >
                  {t === 'register' ? 'Daily register' : 'Term summary'}
                </button>
              ))}
            </div>
          </div>

          <Card className="p-5">
            {tab === 'register' ? (
              <RegisterPanel
                // Remount on a different register: the edit overlay belongs to
                // one classroom and one date and must not outlive either.
                key={`${classroomId}:${date}`}
                classroomId={classroomId}
                date={date}
                onDateChange={setDate}
              />
            ) : (
              <SummaryPanel
                classroomId={classroomId}
                terms={termsForClassroom}
                termId={termId}
                onTermChange={setTermOverride}
              />
            )}
          </Card>
        </>
      )}

      <FormDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen a closed term"
        description="A closed term's register is read-only. Reopening it is recorded in the audit trail with your name and this reason. Closing the term again locks it once more."
        footer={
          <FormFooter
            onCancel={() => setReopenOpen(false)}
            isPending={reopening}
            formId="reopen-form"
            submitLabel="Reopen"
          />
        }
      >
        <form
          id="reopen-form"
          onSubmit={reopenForm.handleSubmit((v) => {
            const target = reopenTermId || closedTerms[0]?.id;
            if (target) reopen({ termId: target, reason: v.reason });
          })}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reopen-term">Term *</Label>
            <Select
              id="reopen-term"
              value={reopenTermId || closedTerms[0]?.id || ''}
              onChange={(e) => setReopenTermId(e.target.value)}
            >
              {closedTerms.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reopen-reason">Reason *</Label>
            <Textarea
              id="reopen-reason"
              rows={3}
              placeholder="e.g. Term 1 register had a transcription error on 3 October"
              {...reopenForm.register('reason')}
            />
            {reopenForm.formState.errors.reason && (
              <p className="text-xs text-destructive">
                {reopenForm.formState.errors.reason.message}
              </p>
            )}
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
