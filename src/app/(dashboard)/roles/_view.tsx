'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { NoticeBar } from '@/components/shared/notice-bar';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { rolesApi } from '@/lib/api/endpoints/roles';
import { isPermissionDenied } from '@/lib/api/errors';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { Permission, Role } from '@/types/api';

/** `fee_types` → `Fee Types`, for the module group headings. */
function moduleLabel(module: string): string {
  return module
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** `fee_types.read` → `read`. The module is already the group heading. */
function actionLabel(key: string): string {
  return key.split('.').slice(1).join('.') || key;
}

export function RolesView() {
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState('');
  const [filter, setFilter] = useState('');

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: () => rolesApi.list().then((r) => r.data.data),
  });

  const permsQuery = useQuery({
    queryKey: queryKeys.roles.permissions(),
    queryFn: () => rolesApi.permissions().then((r) => r.data.data),
  });

  const roles = rolesQuery.data ?? [];
  // Falls back to the first role so the page is never rendered with nothing
  // selected — same pattern as the attendance classroom picker.
  const selected: Role | undefined =
    roles.find((r) => r.id === roleId) ?? roles[0];

  /** permissionId → the join-row id, which DELETE needs. Absent means not granted. */
  const grantedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of selected?.permissions ?? []) map.set(link.permission.id, link.id);
    return map;
  }, [selected]);

  const grouped = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const groups = new Map<string, Permission[]>();
    for (const p of permsQuery.data ?? []) {
      if (term && !p.key.toLowerCase().includes(term) && !p.module.toLowerCase().includes(term)) {
        continue;
      }
      const list = groups.get(p.module) ?? [];
      list.push(p);
      groups.set(p.module, list);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permsQuery.data, filter]);

  const { mutate: grant } = useApiMutation<unknown, { roleId: string; permissionId: string }>({
    mutationFn: (v) => rolesApi.grant(v.roleId, v.permissionId).then((r) => r.data),
    successMessage: () => 'Permission granted',
    invalidateKeys: [queryKeys.roles.all],
  });

  const { mutate: revoke } = useApiMutation<unknown, { roleId: string; permissionId: string }>({
    mutationFn: (v) => rolesApi.revoke(v.roleId, v.permissionId).then((r) => r.data),
    successMessage: () => 'Permission revoked',
    invalidateKeys: [queryKeys.roles.all],
  });

  function toggle(permission: Permission, on: boolean) {
    if (!selected) return;
    if (on) grant({ roleId: selected.id, permissionId: permission.id });
    else revoke({ roleId: selected.id, permissionId: permission.id });
    void queryClient;
  }

  const error = rolesQuery.error ?? permsQuery.error;
  const loading = rolesQuery.isLoading || permsQuery.isLoading;
  const denied = isPermissionDenied(error);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Roles & Permissions"
        description="Grant or revoke what each role can do. Changes take effect the next time the user signs in."
      />

      {error && <ApiError error={error} onRetry={() => { rolesQuery.refetch(); permsQuery.refetch(); }} />}

      {!denied && (
        <>
          <NoticeBar>
            A permission must exist before it can be granted. If something you expect is
            missing from this list entirely, the permission catalogue on this server is
            out of date — run the permission sync on the backend rather than editing the
            database by hand.
          </NoticeBar>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label htmlFor="role-picker" className="text-sm text-muted-foreground">Role</label>
              <Select
                id="role-picker"
                className="w-64"
                value={selected?.id ?? ''}
                onChange={(e) => setRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="perm-filter" className="text-sm text-muted-foreground">Filter</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="perm-filter"
                  className="w-64 pl-8"
                  placeholder="fees, attendance, read…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>

            {selected && (
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span id="perm-count" className="tabular-nums">
                  {selected.permissions.length} of {permsQuery.data?.length ?? 0} granted
                </span>
              </div>
            )}
          </div>

          <Card className="p-0 gap-0">
            {loading ? (
              <TableSkeleton columns={2} />
            ) : !grouped.length ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                No permissions match that filter.
              </p>
            ) : (
              <div className="divide-y">
                {grouped.map(([module, perms]) => (
                  <section key={module} data-module={module} className="p-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {moduleLabel(module)}
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {perms.map((p) => {
                        const on = grantedBy.has(p.id);
                        return (
                          <div
                            key={p.id}
                            data-permission={p.key}
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm">{actionLabel(p.key)}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {p.key}
                              </span>
                            </span>
                            <Checkbox
                              id={`perm-${p.key}`}
                              checked={on}
                              disabled={!selected}
                              onChange={(e) => toggle(p, e.target.checked)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
