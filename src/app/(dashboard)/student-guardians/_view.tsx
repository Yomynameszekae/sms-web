'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link2, Pencil, Trash2, Star } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { studentsApi } from '@/lib/api/endpoints/students';
import { guardiansApi } from '@/lib/api/endpoints/guardians';
import { studentGuardiansApi } from '@/lib/api/endpoints/student-guardians';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { StudentGuardian, CreateStudentGuardianPayload, UpdateStudentGuardianPayload } from '@/types/api';

const linkSchema = z.object({
  guardianId:         z.string().min(1, 'Guardian is required'),
  relationship:       z.string().optional(),
  isPrimary:          z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  canReceiveSms:      z.boolean().optional(),
  canAccessPortal:    z.boolean().optional(),
});
type LinkForm = z.infer<typeof linkSchema>;

const updateLinkSchema = z.object({
  relationship:       z.string().optional(),
  isPrimary:          z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  canReceiveSms:      z.boolean().optional(),
  canAccessPortal:    z.boolean().optional(),
});
type UpdateLinkForm = z.infer<typeof updateLinkSchema>;

/**
 * `canReceiveSms` defaults to FALSE, matching the backend.
 *
 * It can only be true once the guardian's SMS consent is recorded on their own
 * record, so defaulting it on offered a setting the server correctly refuses —
 * every link creation failed with a 409 until this matched.
 */
const FLAG_DEFAULTS = { isPrimary: false, isEmergencyContact: false, canReceiveSms: false, canAccessPortal: false };

const FLAG_FIELDS = [
  { id: 'lf-primary',   name: 'isPrimary' as const,          label: 'Primary guardian' },
  { id: 'lf-emergency', name: 'isEmergencyContact' as const,  label: 'Emergency contact' },
  {
    id: 'lf-sms', name: 'canReceiveSms' as const,
    label: 'Can receive SMS about this child',
    hint: 'Only available once SMS consent is recorded on the guardian’s own record.',
  },
  { id: 'lf-portal',    name: 'canAccessPortal' as const,     label: 'Can access parent portal' },
];

function CreateLinkForm({
  id, onSubmit,
}: { id: string; onSubmit: (v: LinkForm) => void }) {
  const form = useForm<LinkForm>({ resolver: zodResolver(linkSchema), defaultValues: { guardianId: '', ...FLAG_DEFAULTS } });
  // Server-side search — the guardians list is capped at 100 rows, so a
  // client-side filter would miss guardians beyond the first page.
  const [guardianSearch, setGuardianSearch] = useState('');
  const { data: guardiansData, isPending: guardiansLoading } = useQuery({
    queryKey: queryKeys.guardians.list({ limit: 100, search: guardianSearch }),
    queryFn: () =>
      guardiansApi
        .list({ limit: 100, ...(guardianSearch ? { search: guardianSearch } : {}) })
        .then((r) => r.data.data.items),
  });
  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="lf-guardian">Guardian *</Label>
        <Controller
          control={form.control}
          name="guardianId"
          render={({ field }) => (
            <SearchableSelect
              id="lf-guardian"
              value={field.value ?? ''}
              onChange={field.onChange}
              loading={guardiansLoading}
              onSearch={setGuardianSearch}
              placeholder="Select guardian…"
              options={(guardiansData ?? []).map((g) => ({
                value: g.id,
                label: `${g.firstName} ${g.lastName} — ${g.phonePrimary}`,
              }))}
              emptyMessage={(q) => (q ? `No guardians match '${q}'` : 'No guardians yet')}
              aria-invalid={!!form.formState.errors.guardianId}
            />
          )}
        />
        {form.formState.errors.guardianId && (
          <p className="text-xs text-destructive">{form.formState.errors.guardianId.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lf-rel">Relationship</Label>
        <Input id="lf-rel" placeholder="e.g. mother, father, uncle" {...form.register('relationship')} />
        <p className="text-xs text-muted-foreground">Relationship lives on the link, not the guardian record.</p>
      </div>
      <div className="space-y-2 pt-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permissions</p>
        {FLAG_FIELDS.map((f) => (
          <div key={f.id} className="space-y-0.5">
            <Checkbox id={f.id} label={f.label} {...form.register(f.name)} />
            {'hint' in f && f.hint && (
              <p className="pl-6 text-xs text-muted-foreground">{f.hint}</p>
            )}
          </div>
        ))}
      </div>
    </form>
  );
}

function EditLinkForm({
  id, defaultValues, onSubmit,
}: { id: string; defaultValues: UpdateLinkForm; onSubmit: (v: UpdateLinkForm) => void }) {
  const form = useForm<UpdateLinkForm>({ resolver: zodResolver(updateLinkSchema), defaultValues });
  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="lf-rel">Relationship</Label>
        <Input id="lf-rel" placeholder="e.g. mother, father, uncle" {...form.register('relationship')} />
        <p className="text-xs text-muted-foreground">Relationship lives on the link, not the guardian record.</p>
      </div>
      <div className="space-y-2 pt-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permissions</p>
        {FLAG_FIELDS.map((f) => (
          <div key={f.id} className="space-y-0.5">
            <Checkbox id={f.id} label={f.label} {...form.register(f.name)} />
            {'hint' in f && f.hint && (
              <p className="pl-6 text-xs text-muted-foreground">{f.hint}</p>
            )}
          </div>
        ))}
      </div>
    </form>
  );
}

function StudentGuardiansPanel({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [editLink, setEditLink] = useState<StudentGuardian | null>(null);


  const qKey = queryKeys.students.guardians(studentId);
  const { data = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => studentsApi.getGuardians(studentId).then((r) => r.data.data),
  });

  const invalidate: ReadonlyArray<ReadonlyArray<unknown>> = [qKey];

  const { mutate: link, isPending: linking } = useApiMutation<unknown, CreateStudentGuardianPayload>({
    mutationFn: (p) => studentGuardiansApi.link(p).then((r) => r.data.data),
    successMessage: 'Guardian linked.',
    invalidateKeys: invalidate,
    onSuccess: () => setLinkOpen(false),
  });

  const { mutate: updateLink, isPending: updatingLink } = useApiMutation<unknown, { id: string } & UpdateStudentGuardianPayload>({
    mutationFn: ({ id, ...p }) => studentGuardiansApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Relationship updated.',
    invalidateKeys: invalidate,
    onSuccess: () => setEditLink(null),
  });

  const { mutate: unlink } = useApiMutation<unknown, string>({
    mutationFn: (id) => studentGuardiansApi.unlink(id).then((r) => r.data.data),
    successMessage: 'Guardian unlinked.',
    invalidateKeys: invalidate,
  });

  const { mutate: setPrimary } = useApiMutation<unknown, string>({
    mutationFn: (id) => studentGuardiansApi.setPrimary(id).then((r) => r.data.data),
    successMessage: 'Primary guardian set.',
    invalidateKeys: invalidate,
  });

  const links = data as StudentGuardian[];

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{studentName}</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLinkOpen(true)}>
          <Link2 className="mr-1.5 h-3 w-3" />
          Link Guardian
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : !links.length ? (
        <p className="text-xs text-muted-foreground italic">No guardians linked to this student.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
              <div>
                <span className="text-sm font-medium">
                  {link.guardian?.firstName} {link.guardian?.lastName}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {link.relationship && (
                    <span className="text-xs text-muted-foreground capitalize">{link.relationship}</span>
                  )}
                  {link.isPrimary && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      <Star className="h-3 w-3 fill-current" /> Primary
                    </span>
                  )}
                  {link.isEmergencyContact && (
                    <span className="text-xs font-medium" style={{ color: 'var(--error)' }}>Emergency</span>
                  )}
                  {link.canReceiveSms && (
                    <span className="text-xs text-muted-foreground">SMS</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!link.isPrimary && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPrimary(link.id)}>
                    Set Primary
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditLink(link)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => unlink(link.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title={`Link Guardian — ${studentName}`}
        footer={<FormFooter onCancel={() => setLinkOpen(false)} isPending={linking} formId={`link-form-${studentId}`} submitLabel="Link Guardian" />}
      >
        <CreateLinkForm
          id={`link-form-${studentId}`}
          onSubmit={(v) =>
            link({
              studentId,
              guardianId: v.guardianId,
              relationship: v.relationship || undefined,
              isPrimary: v.isPrimary,
              isEmergencyContact: v.isEmergencyContact,
              canReceiveSms: v.canReceiveSms,
              canAccessPortal: v.canAccessPortal,
            })
          }
        />
      </FormDialog>

      <FormDialog
        open={!!editLink}
        onOpenChange={(v) => { if (!v) setEditLink(null); }}
        title="Edit Relationship"
        footer={editLink ? <FormFooter onCancel={() => setEditLink(null)} isPending={updatingLink} formId={`edit-link-form-${editLink.id}`} /> : undefined}
      >
        {editLink && (
          <EditLinkForm
            id={`edit-link-form-${editLink.id}`}
            defaultValues={{
              relationship:       editLink.relationship ?? '',
              isPrimary:          editLink.isPrimary,
              isEmergencyContact: editLink.isEmergencyContact,
              canReceiveSms:      editLink.canReceiveSms,
              canAccessPortal:   editLink.canAccessPortal,
            }}
            onSubmit={(uv) => {
              updateLink({
                id: editLink.id,
                relationship: uv.relationship || undefined,
                isPrimary: uv.isPrimary,
                isEmergencyContact: uv.isEmergencyContact,
                canReceiveSms: uv.canReceiveSms,
                canAccessPortal: uv.canAccessPortal,
              });
            }}
          />
        )}
      </FormDialog>
    </div>
  );
}

export function StudentGuardiansView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const queryParams = { page, limit: 20, ...(search ? { search } : {}) };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.students.list(queryParams),
    queryFn: () => studentsApi.list(queryParams).then((r) => r.data.data),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student-Guardian Links"
        description="Manage which guardians are linked to each student and their relationship details."
      />

      <p className="text-sm text-muted-foreground -mt-3">
        Relationships live on the link itself, not on the guardian record. A guardian can be linked
        to multiple students with different relationship labels.
      </p>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search students by name or number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && !items.length && (
        <Card className="p-12 text-center text-sm text-muted-foreground">No students found.</Card>
      )}

      <div className="space-y-3">
        {items.map((s) => (
          <StudentGuardiansPanel
            key={s.id}
            studentId={s.id}
            studentName={`${s.firstName} ${s.lastName} (${s.studentNumber})`}
          />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-muted-foreground">{page} / {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
