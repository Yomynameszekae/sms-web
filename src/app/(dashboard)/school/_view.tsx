'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { schoolApi } from '@/lib/api/endpoints/school';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { UpdateSchoolPayload } from '@/types/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  ghanaPostGps: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  motto: z.string().optional(),
  registrationNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || <span className="text-muted-foreground/60 italic">Not set</span>}</p>
    </div>
  );
}

export function SchoolProfileView() {
  const [editing, setEditing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.school.detail(),
    queryFn: () => schoolApi.get().then((r) => r.data.data),
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { mutate: update, isPending } = useApiMutation<unknown, UpdateSchoolPayload>({
    mutationFn: (payload) => schoolApi.update(payload).then((r) => r.data.data),
    successMessage: 'School profile updated.',
    invalidateKeys: [queryKeys.school.detail()],
    onSuccess: () => setEditing(false),
  });

  function openEdit() {
    if (!data) return;
    form.reset({
      name: data.name,
      address: data.address ?? '',
      ghanaPostGps: data.ghanaPostGps ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      motto: data.motto ?? '',
      registrationNumber: data.registrationNumber ?? '',
    });
    setEditing(true);
  }

  function onSubmit(values: FormValues) {
    const payload: UpdateSchoolPayload = {
      name: values.name,
      address: values.address || undefined,
      ghanaPostGps: values.ghanaPostGps || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      motto: values.motto || undefined,
      registrationNumber: values.registrationNumber || undefined,
    };
    update(payload);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Profile"
        description="View and update your school's identity and contact details."
        action={
          data && (
            <Button size="sm" onClick={openEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          )
        }
      />

      {isLoading && (
        <Card className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </Card>
      )}

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {data && (
        <Card className="p-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="School Name" value={data.name} />
          <Field label="Slug" value={data.slug} />
          <Field label="Email" value={data.email} />
          <Field label="Phone" value={data.phone} />
          <Field label="Address" value={data.address} />
          <Field label="Ghana Post GPS" value={data.ghanaPostGps} />
          <Field label="Motto" value={data.motto} />
          <Field label="Registration Number" value={data.registrationNumber} />
        </Card>
      )}

      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit School Profile"
        footer={
          <FormFooter
            onCancel={() => setEditing(false)}
            isPending={isPending}
            formId="school-form"
          />
        }
      >
        <form id="school-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {(
            [
              { id: 'name', label: 'School Name *', field: 'name' },
              { id: 'address', label: 'Address', field: 'address' },
              { id: 'ghanaPostGps', label: 'Ghana Post GPS', field: 'ghanaPostGps' },
              { id: 'phone', label: 'Phone', field: 'phone' },
              { id: 'email', label: 'Email', field: 'email' },
              { id: 'motto', label: 'Motto', field: 'motto' },
              { id: 'registrationNumber', label: 'Registration Number', field: 'registrationNumber' },
            ] as const
          ).map(({ id, label, field }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input id={id} {...form.register(field)} />
              {form.formState.errors[field] && (
                <p className="text-xs text-destructive">{form.formState.errors[field]?.message}</p>
              )}
            </div>
          ))}
        </form>
      </FormDialog>
    </div>
  );
}
