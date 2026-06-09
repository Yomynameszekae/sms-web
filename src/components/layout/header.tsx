'use client';

import { useQuery } from '@tanstack/react-query';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { schoolApi } from '@/lib/api/endpoints/school';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { termsApi } from '@/lib/api/endpoints/terms';
import { queryKeys } from '@/lib/query-keys';

function avatarInitial(user: { email: string | null; phone: string | null }): string {
  return (user.email?.[0] ?? user.phone?.[0] ?? '?').toUpperCase();
}

export function Header() {
  const { user, logout } = useAuth();

  const displayName = user?.email ?? user?.phone ?? '';
  const avatarText = user ? avatarInitial(user) : '?';

  const { data: school } = useQuery({
    queryKey: queryKeys.school.detail(),
    queryFn: () => schoolApi.get().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const { data: academicYears } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const activeYear = academicYears?.find((y) => y.isActive);

  const { data: terms } = useQuery({
    queryKey: queryKeys.terms.list(activeYear?.id),
    queryFn: () => termsApi.list(activeYear?.id).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!activeYear?.id,
  });

  const activeTerm = terms?.find((t) => t.status === 'active');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-5">
      {/* Left: school + year/term context */}
      <div className="flex items-center gap-3 min-w-0">
        {school && (
          <span className="text-sm font-medium text-foreground truncate max-w-[240px]">
            {school.name}
          </span>
        )}
        {(activeYear || activeTerm) && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            {activeYear && (
              <span
                className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--surface-alt)',
                  color: 'var(--body-text-2)',
                }}
              >
                {activeYear.label}
              </span>
            )}
            {activeTerm && (
              <span
                className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                }}
              >
                {activeTerm.label}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Right: user menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors outline-none">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{avatarText}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:block">{displayName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {user?.email ?? user?.phone ?? ''}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
