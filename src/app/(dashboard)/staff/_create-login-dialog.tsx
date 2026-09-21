'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RefreshCw } from 'lucide-react';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { NoticeBar } from '@/components/shared/notice-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersApi } from '@/lib/api/endpoints/users';
import { rolesApi } from '@/lib/api/endpoints/roles';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { Role, Staff, User } from '@/types/api';

/**
 * TWO STEPS, ON PURPOSE.
 *
 * Creating the account is not the whole job. A login with no role can sign in
 * and is then refused on every screen, which reads as a broken product rather
 * than an unfinished setup. Sending the admin off to User Accounts to discover
 * that separately is how it gets forgotten, so the role picker appears here
 * the moment the account exists.
 *
 * The temporary password is deliberate for this version: the backend sets
 * mustChangePassword, so it survives exactly one sign-in. Replacing it with an
 * emailed invite link is planned — see the admin guide.
 */
const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters'),
});
type Values = z.infer<typeof schema>;

/** Readable, and long enough that nobody is tempted to keep it. */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const pick = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)))
      .map((v) => chars[v % chars.length])
      .join('');
  return `${pick(4)}-${pick(4)}-${pick(4)}`;
}

export function CreateLoginDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: Staff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [created, setCreated] = useState<User | null>(null);

  // Seeded once, at mount. The caller keys this component on the staff id, so
  // opening it for a different person mounts a fresh one rather than copying
  // props into state through an effect.
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: staff?.email ?? '',
      phone: staff?.phone ?? '',
      password: generatePassword(),
    },
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: () => rolesApi.list().then((r) => r.data.data),
    enabled: open,
  });

  const { mutate: create, isPending } = useApiMutation<User, Values>({
    mutationFn: (v) =>
      usersApi
        .create({
          email: v.email,
          phone: v.phone?.trim() || undefined,
          password: v.password,
          linkedEntityType: 'staff',
          linkedEntityId: staff!.id,
        })
        .then((r) => r.data.data),
    successMessage: 'Login created. Now give it a role.',
    invalidateKeys: [queryKeys.users.all],
    onSuccess: (user) => setCreated(user),
  });

  const { mutate: assignRole } = useApiMutation<unknown, { roleId: string; on: boolean }>({
    mutationFn: ({ roleId, on }) =>
      (on
        ? usersApi.assignRole(created!.id, roleId)
        : usersApi.removeRole(created!.id, roleId)
      ).then((r) => r.data),
    successMessage: 'Role updated.',
    invalidateKeys: [queryKeys.users.all],
  });

  const [granted, setGranted] = useState<Set<string>>(new Set());
  const roles: Role[] = rolesQuery.data ?? [];
  const name = staff ? `${staff.firstName} ${staff.lastName}` : '';

  function toggleRole(role: Role, on: boolean) {
    setGranted((prev) => {
      const next = new Set(prev);
      if (on) next.add(role.id);
      else next.delete(role.id);
      return next;
    });
    assignRole({ roleId: role.id, on });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={created ? 'Give this login a role' : 'Create login'}
      description={name}
      footer={
        created ? (
          <FormFooter
            onCancel={() => onOpenChange(false)}
            isPending={false}
            formId="create-login-done"
            submitLabel="Done"
          />
        ) : (
          <FormFooter
            onCancel={() => onOpenChange(false)}
            isPending={isPending}
            formId="create-login-form"
            submitLabel="Create login"
          />
        )
      }
    >
      {!staff ? null : created ? (
        <form
          id="create-login-done"
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); onOpenChange(false); }}
        >
          <NoticeBar>
            The account exists but can do <strong>nothing</strong> until it holds a role.
            Tick at least one below. {name} must sign out and back in for a change to
            reach them — and will be asked to set a new password on first sign-in.
          </NoticeBar>

          <div className="space-y-1.5">
            <Label>Roles</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {roles.map((r) => (
                <div
                  key={r.id}
                  data-new-user-role={r.code}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{r.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{r.code}</span>
                  </span>
                  <Checkbox
                    id={`newrole-${r.code}`}
                    checked={granted.has(r.id)}
                    onChange={(e) => toggleRole(r, e.target.checked)}
                  />
                </div>
              ))}
            </div>
            {!granted.size && (
              <p className="text-xs text-destructive">
                No role assigned yet — this login cannot do anything.
              </p>
            )}
          </div>
        </form>
      ) : (
        <form
          id="create-login-form"
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => create(v))}
        >
          <NoticeBar>
            Creates a sign-in for {name} and links it to their staff record. The password
            below is <strong>temporary</strong> — they will be required to choose a new one
            the first time they sign in. Give it to them directly; nothing is emailed.
          </NoticeBar>

          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email *</Label>
            <Input id="login-email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-phone">Phone</Label>
            <Input id="login-phone" placeholder="Optional" {...form.register('phone')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Temporary password *</Label>
            <div className="flex gap-2">
              <Input id="login-password" {...form.register('password')} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                id="login-generate"
                title="Generate a new one"
                onClick={() => form.setValue('password', generatePassword(), { shouldValidate: true })}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
        </form>
      )}
    </FormDialog>
  );
}
