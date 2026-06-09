'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings2,
  Hash,
  CalendarDays,
  Calendar,
  Layers3,
  BookOpen,
  Users,
  GraduationCap,
  Heart,
  Link2,
  ClipboardList,
  UserCheck,
  FolderOpen,
  ScrollText,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'School Setup',
    items: [
      { label: 'School Profile', href: '/school', icon: Building2 },
      { label: 'School Settings', href: '/school/settings', icon: Settings2 },
      { label: 'Document Sequences', href: '/document-sequences', icon: Hash },
    ],
  },
  {
    label: 'Academic Structure',
    items: [
      { label: 'Academic Years', href: '/academic-years', icon: CalendarDays },
      { label: 'Terms', href: '/terms', icon: Calendar },
      { label: 'Levels', href: '/levels', icon: Layers3 },
      { label: 'Classrooms', href: '/classrooms', icon: BookOpen },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Staff', href: '/staff', icon: Users },
      { label: 'Students', href: '/students', icon: GraduationCap },
      { label: 'Guardians', href: '/guardians', icon: Heart },
      { label: 'Student-Guardian Links', href: '/student-guardians', icon: Link2 },
    ],
  },
  {
    label: 'Admissions & Enrollment',
    items: [
      { label: 'Admissions', href: '/admissions', icon: ClipboardList },
      { label: 'Enrollments', href: '/enrollments', icon: UserCheck },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'Files', href: '/files', icon: FolderOpen },
      { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
    ],
  },
];

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  // All Phase-1 routes are flat or at most one level deep (/school vs /school/settings).
  // Exact match prevents /school highlighting when on /school/settings.
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-2.5 py-[7px] pl-4 pr-3 text-sm rounded-r-md transition-colors',
        isActive
          ? 'font-medium'
          : 'hover:bg-[var(--sidebar-hover)]',
      )}
      style={
        isActive
          ? {
              backgroundColor: 'var(--sidebar-active-bg)',
              color: 'var(--sidebar-active-text)',
            }
          : { color: 'var(--sidebar-text)' }
      }
    >
      {isActive && (
        <span
          className="absolute left-0 inset-y-0 w-[3px] rounded-r-sm"
          style={{ background: 'var(--sidebar-bar)' }}
        />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();

  const displayName = user?.email ?? user?.phone ?? '';
  const roleName = user?.roles?.[0]?.name ?? '';

  return (
    <aside
      className="flex h-full w-[266px] shrink-0 flex-col border-r border-sidebar-border overflow-hidden"
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
    >
      {/* Brand tile */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
          style={{
            backgroundColor: 'var(--brand-tile-bg)',
            color: 'var(--brand-tile-fg)',
          }}
        >
          B
        </div>
        <span
          className="font-semibold text-sm tracking-tight"
          style={{ color: 'var(--sidebar-active-text, var(--sidebar-text))' }}
        >
          Brite SMS
        </span>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto py-2 pr-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <p
              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest select-none"
              style={{ color: 'var(--sidebar-group)' }}
            >
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              backgroundColor: 'var(--sidebar-active-bg)',
              color: 'var(--sidebar-active-text)',
            }}
          >
            {displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium truncate leading-none mb-0.5"
              style={{ color: 'var(--sidebar-text)' }}
            >
              {displayName}
            </p>
            {roleName && (
              <p
                className="text-[10px] truncate leading-none"
                style={{ color: 'var(--sidebar-group)' }}
              >
                {roleName}
              </p>
            )}
          </div>
          <button
            onClick={logout}
            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md transition-colors hover:bg-[var(--sidebar-hover)]"
            style={{ color: 'var(--sidebar-group)' }}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
