'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { EmptyTable } from '@/components/shared/empty-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { usersApi } from '@/lib/api/endpoints/users';
import { rolesApi } from '@/lib/api/endpoints/roles';
import { isPermissionDenied } from '@/lib/api/errors';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import { formatDateOnly } from '@/lib/date';
import type { Role, User } from '@/types/api';

/**
 * WHICH ROLE A PERSON HAS — distinct from two neighbouring screens.
 *
 *   Roles & Permissions  what a ROLE can do
 *   this screen          which ROLE(S) a USER holds
 *   Staff → Role         an HR category (Teacher/Admin/Support). It drives
 *                        nothing about access; see the note in the UI below.
 *
 * user_roles is a true many-to-many (@@unique([userId, roleId])), so a user
 * may hold several roles at once and their effective permissions are the
 * union. The UI therefore offers checkboxes, not a single-select.
 */
export function UsersView() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const params = useMemo(
    () => ({
      limit: 100,
      ...(activeFilter === 'all' ? {} : { isActive: activeFilter === 'active' }),
    }),
    [activeFilter],
  );

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersApi.list(params).then((r) => r.data.data),
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: () => rolesApi.list().then((r) => r.data.data),
  });

  const { mutate: assign } = useApiMutation<unknown, { userId: string; roleId: string }>({
    mutationFn: (v) => usersApi.assignRole(v.userId, v.roleId).then((r) => r.data),
    successMessage: () => 'Role assigned. The user must sign out and back in.',
    invalidateKeys: [queryKeys.users.all],
  });

  const { mutate: remove } = useApiMutation<unknown, { userId: string; roleId: string }>({
    mutationFn: (v) => usersApi.removeRole(v.userId, v.roleId).then((r) => r.data),
    successMessage: () => 'Role removed. The user must sign out and back in.',
    invalidateKeys: [queryKeys.users.all],
  });

  const error = usersQuery.error ?? rolesQuery.error;
  const denied = isPermissionDenied(error);
  const users: User[] = usersQuery.data?.items ?? [];
  const roles: Role[] = rolesQuery.data ?? [];
  const loading = usersQuery.isLoading || rolesQuery.isLoading;

  function toggle(user: User, role: Role, on: boolean) {
    if (on) assign({ userId: user.id, roleId: role.id });
    else remove({ userId: user.id, roleId: role.id });
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="User Accounts"
        description="Which security role each login holds. Roles decide what a person can do."
      />

      {error && <ApiError error={error} onRetry={() => { usersQuery.refetch(); rolesQuery.refetch(); }} />}

      {!denied && (
        <>
          <NoticeBar>
            This is not the same as the <strong>Role</strong> field on a staff record. That one
            is an HR category (Teacher, Admin, Support) used for filtering staff lists and
            grants no access at all. Permissions come only from the roles assigned here.
            A change takes effect when the user next signs in, because permissions are
            carried in their session.
          </NoticeBar>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label htmlFor="user-status" className="text-sm text-muted-foreground">Show</label>
              <Select
                id="user-status"
                className="w-48"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
              >
                <option value="active">Active accounts</option>
                <option value="inactive">Deactivated accounts</option>
                <option value="all">All accounts</option>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="h-4 w-4" />
              <span id="user-count" className="tabular-nums">
                {users.length} account{users.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <Card className="p-0 gap-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Account</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  {roles.map((r) => (
                    <TableHead key={r.id} className="text-center whitespace-nowrap text-[11px]">
                      {r.name}
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap">Last sign-in</TableHead>
                </TableRow>
              </TableHeader>
              {loading ? (
                <TableSkeleton columns={3 + roles.length} />
              ) : !users.length ? (
                <EmptyTable
                  columns={3 + roles.length}
                  message="No user accounts match this filter."
                />
              ) : (
                <TableBody>
                  {users.map((u) => {
                    const held = new Set(u.roles.map((l) => l.role.id));
                    return (
                      <TableRow key={u.id} data-user={u.email}>
                        <TableCell>
                          <span className="flex flex-col">
                            <span className="text-sm font-medium">{u.email}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {held.size
                                ? [...u.roles].map((l) => l.role.code).sort().join(', ')
                                : 'no role — this account can sign in but do nothing'}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge variant={u.isActive ? 'active' : 'inactive'} label={u.isActive ? 'Active' : 'Inactive'} />
                        </TableCell>
                        {roles.map((r) => (
                          <TableCell key={r.id} className="text-center">
                            <span
                              className="inline-flex justify-center"
                              data-user-role={`${u.email}:${r.code}`}
                            >
                              <Checkbox
                                id={`ur-${u.id}-${r.code}`}
                                checked={held.has(r.id)}
                                onChange={(e) => toggle(u, r, e.target.checked)}
                              />
                            </span>
                          </TableCell>
                        ))}
                        <TableCell data-last-login={u.email}>
                          {u.lastLoginAt === null ? (
                            // Neutral on purpose. A login provisioned five
                            // minutes ago has never been used, and that is the
                            // expected state — styling it as a warning would
                            // cry wolf on every new account. The genuine
                            // problem, an account with no role, is flagged
                            // separately below the table.
                            <StatusBadge variant="inactive" label="Never signed in" />
                          ) : (
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateOnly(u.lastLoginAt)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </Card>

          {!loading && users.some((u) => !u.roles.length) && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              Accounts with no role can sign in but will be refused everywhere. Give them a
              role, or deactivate the account.
            </p>
          )}
        </>
      )}
    </div>
  );
}
