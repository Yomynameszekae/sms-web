'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Archive, ArchiveRestore } from 'lucide-react';
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
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { staffApi } from '@/lib/api/endpoints/staff';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type {
  Staff, StaffRoleCategory, EmploymentType, NtcStatus,
  CreateStaffPayload, UpdateStaffPayload,
} from '@/types/api';

type StaffStatus = Staff['status'];

const ROLE_LABELS: Record<StaffRoleCategory, string> = {
  teacher: 'Teacher', admin: 'Admin', support: 'Support',
};
const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract',
};
const NTC_LABELS: Record<NtcStatus, string> = {
  licensed: 'Licensed', induction: 'Induction', unlicensed: 'Unlicensed', not_applicable: 'N/A',
};
const STATUS_VARIANT: Record<StaffStatus, 'active' | 'inactive' | 'archived'> = {
  active: 'active', on_leave: 'inactive', resigned: 'archived', terminated: 'archived',
};
const STATUS_LABEL: Record<StaffStatus, string> = {
  active: 'Active', on_leave: 'On Leave', resigned: 'Resigned', terminated: 'Terminated',
};

const sharedFields = {
  firstName:   z.string().min(1, 'First name is required'),
  lastName:    z.string().min(1, 'Last name is required'),
  phone:       z.string().optional(),
  email:       z.string().email('Invalid email').optional().or(z.literal('')),
  roleCategory:    z.enum(['teacher', 'admin', 'support'] as const),
  employmentType:  z.string().optional(),
  ntcStatus:       z.enum(['licensed', 'induction', 'unlicensed', 'not_applicable'] as const),
  ntcRegistrationNumber: z.string().optional(),
  joinedAt:    z.string().optional(),
};
const createSchema = z.object({ staffNumber: z.string().optional(), ...sharedFields });
const updateSchema = z.object(sharedFields);
type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

function SharedFields<T extends UpdateForm>({ form }: { form: ReturnType<typeof useForm<T>> }) {
  const f = form as unknown as ReturnType<typeof useForm<UpdateForm>>;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {(['firstName', 'lastName'] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={`sf-${field}`}>{field === 'firstName' ? 'First' : 'Last'} Name *</Label>
            <Input id={`sf-${field}`} {...f.register(field)} />
            {f.formState.errors[field] && (
              <p className="text-xs text-destructive">{f.formState.errors[field]?.message as string}</p>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sf-phone">Phone</Label>
          <Input id="sf-phone" {...f.register('phone')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-email">Email</Label>
          <Input id="sf-email" type="email" {...f.register('email')} />
          {f.formState.errors.email && (
            <p className="text-xs text-destructive">{f.formState.errors.email?.message as string}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sf-role">Role Category *</Label>
          <Select id="sf-role" {...f.register('roleCategory')}>
            {(['teacher', 'admin', 'support'] as StaffRoleCategory[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-emp">Employment Type</Label>
          <Select id="sf-emp" {...f.register('employmentType')}>
            <option value="">— Select —</option>
            {(['full_time', 'part_time', 'contract'] as EmploymentType[]).map((e) => (
              <option key={e} value={e}>{EMPLOYMENT_LABELS[e]}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sf-ntc">NTC Status</Label>
          <Select id="sf-ntc" {...f.register('ntcStatus')}>
            {(['licensed', 'induction', 'unlicensed', 'not_applicable'] as NtcStatus[]).map((n) => (
              <option key={n} value={n}>{NTC_LABELS[n]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf-joined">Joined Date</Label>
          <Input id="sf-joined" type="date" {...f.register('joinedAt')} />
        </div>
      </div>
    </>
  );
}

function CreateStaffForm({
  id, onSubmit,
}: { id: string; onSubmit: (v: CreateForm) => void }) {
  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { roleCategory: 'teacher', ntcStatus: 'not_applicable' },
  });
  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sf-num">Staff Number</Label>
        <Input id="sf-num" placeholder="Leave blank to auto-generate" {...form.register('staffNumber')} />
        {form.formState.errors.staffNumber && (
          <p className="text-xs text-destructive">{form.formState.errors.staffNumber.message}</p>
        )}
      </div>
      <SharedFields form={form} />
    </form>
  );
}

function EditStaffForm({
  id, defaultValues, onSubmit,
}: {
  id: string;
  defaultValues: UpdateForm;
  onSubmit: (v: UpdateForm) => void;
}) {
  const form = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    defaultValues,
  });
  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <SharedFields form={form} />
    </form>
  );
}

export function StaffView() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);

  const queryParams = { page, limit: 50 };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.staff.list(queryParams),
    queryFn: () => staffApi.list(queryParams).then((r) => r.data.data),
  });

  const INVALIDATE = [queryKeys.staff.all];

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateStaffPayload>({
    mutationFn: (p) => staffApi.create(p).then((r) => r.data.data),
    successMessage: 'Staff member created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: update, isPending: updating } = useApiMutation<unknown, { id: string } & UpdateStaffPayload>({
    mutationFn: ({ id, ...p }) => staffApi.update(id, p).then((r) => r.data.data),
    successMessage: 'Staff member updated.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setEditTarget(null),
  });

  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => staffApi.archive(id).then((r) => r.data.data),
    successMessage: 'Staff member archived.',
    invalidateKeys: INVALIDATE,
  });

  const { mutate: restore } = useApiMutation<unknown, string>({
    mutationFn: (id) => staffApi.restore(id).then((r) => r.data.data),
    successMessage: 'Staff member restored.',
    invalidateKeys: INVALIDATE,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const COLS = 7;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Teaching and support staff records. Archived staff can be restored — restore returns them to Active."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Staff Member
          </Button>
        }
      />

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!isPermissionDenied(error) && (
        <Card className="p-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Employment</TableHead>
                <TableHead>NTC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : !items.length ? (
              <EmptyTable columns={COLS} message="No staff members yet." />
            ) : (
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id} className={s.status !== 'active' ? 'opacity-60' : ''}>
                    <TableCell>
                      <code className="text-xs bg-muted rounded px-1.5 py-0.5">{s.staffNumber}</code>
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.firstName} {s.lastName}
                      {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{ROLE_LABELS[s.roleCategory]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.employmentType ? EMPLOYMENT_LABELS[s.employmentType] : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{NTC_LABELS[s.ntcStatus]}</TableCell>
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
        title="New Staff Member"
        maxWidth="max-w-xl"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="staff-create-form" submitLabel="Create" />}
      >
        <CreateStaffForm
          id="staff-create-form"
          onSubmit={(v) =>
            create({
              staffNumber: v.staffNumber || undefined,
              firstName: v.firstName, lastName: v.lastName,
              phone: v.phone || undefined, email: v.email || undefined,
              roleCategory: v.roleCategory,
              employmentType: (v.employmentType || undefined) as EmploymentType | undefined,
              ntcStatus: v.ntcStatus || undefined,
              ntcRegistrationNumber: v.ntcRegistrationNumber || undefined,
              joinedAt: v.joinedAt || undefined,
            })
          }
        />
      </FormDialog>

      <FormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        title="Edit Staff Member"
        maxWidth="max-w-xl"
        footer={<FormFooter onCancel={() => setEditTarget(null)} isPending={updating} formId="staff-edit-form" />}
      >
        {editTarget && (
          <EditStaffForm
            id="staff-edit-form"
            defaultValues={{
              firstName: editTarget.firstName, lastName: editTarget.lastName,
              phone: editTarget.phone ?? '', email: editTarget.email ?? '',
              roleCategory: editTarget.roleCategory,
              employmentType: editTarget.employmentType ?? undefined,
              ntcStatus: editTarget.ntcStatus,
              ntcRegistrationNumber: editTarget.ntcRegistrationNumber ?? '',
              joinedAt: editTarget.joinedAt?.slice(0, 10) ?? '',
            }}
            onSubmit={(v) =>
              update({
                id: editTarget.id,
                firstName: v.firstName, lastName: v.lastName,
                phone: v.phone || undefined, email: v.email || undefined,
                roleCategory: v.roleCategory,
                employmentType: (v.employmentType || undefined) as EmploymentType | undefined,
                ntcStatus: v.ntcStatus || undefined,
                joinedAt: v.joinedAt || undefined,
              })
            }
          />
        )}
      </FormDialog>
    </div>
  );
}
