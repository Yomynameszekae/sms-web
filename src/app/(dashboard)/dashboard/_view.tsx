'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  ClipboardList,
  CalendarDays,
  BookOpen,
  Users,
  ScrollText,
  Lock,
  ArrowRight,
  ClipboardCheck,
  Banknote,
  Bell,
  BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';
import { schoolApi } from '@/lib/api/endpoints/school';
import { academicYearsApi } from '@/lib/api/endpoints/academic-years';
import { termsApi } from '@/lib/api/endpoints/terms';
import { queryKeys } from '@/lib/query-keys';

// ─── Quick action cards ───────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  primaryAction?: { label: string; href: string };
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Students',
    description: 'Search, create, and manage student records.',
    href: '/students',
    icon: GraduationCap,
    primaryAction: { label: 'New Student', href: '/students' },
  },
  {
    label: 'Admissions',
    description: 'Track enquiries through to enrollment.',
    href: '/admissions',
    icon: ClipboardList,
    primaryAction: { label: 'New Admission', href: '/admissions' },
  },
  {
    label: 'Academic Years',
    description: 'Configure school years and terms.',
    href: '/academic-years',
    icon: CalendarDays,
  },
  {
    label: 'Classrooms',
    description: 'Class groups, levels, and teacher assignments.',
    href: '/classrooms',
    icon: BookOpen,
  },
  {
    label: 'Staff',
    description: 'Teaching and support staff records.',
    href: '/staff',
    icon: Users,
    primaryAction: { label: 'New Staff Member', href: '/staff' },
  },
  {
    label: 'Audit Logs',
    description: 'Tamper-proof history of all system activity.',
    href: '/audit-logs',
    icon: ScrollText,
  },
];

// ─── Phase 2 preview cards ────────────────────────────────────────────────────

interface Phase2Preview {
  label: string;
  description: string;
  icon: React.ElementType;
}

const PHASE2_PREVIEW: Phase2Preview[] = [
  {
    label: 'Attendance',
    description: 'Daily registers and absence tracking by classroom.',
    icon: ClipboardCheck,
  },
  {
    label: 'Fees & Payments',
    description: 'Invoice generation, payment plans, and receipts.',
    icon: Banknote,
  },
  {
    label: 'Report Cards',
    description: 'Assessment records, grades, and printed reports.',
    icon: BarChart3,
  },
  {
    label: 'SMS & Notifications',
    description: 'Broadcast messages and parent communications.',
    icon: Bell,
  },
];

// ─── Context strip ────────────────────────────────────────────────────────────

function ContextChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs"
      style={{ backgroundColor: 'var(--surface-alt)', color: 'var(--body-text-2)' }}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

// ─── Dashboard view ───────────────────────────────────────────────────────────

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const enabled = !!user;

  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: queryKeys.school.detail(),
    queryFn: () => schoolApi.get().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  const { data: academicYears } = useQuery({
    queryKey: queryKeys.academicYears.list(),
    queryFn: () => academicYearsApi.list().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled,
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
    <div className="space-y-8">
      {/* ── Welcome header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {activeYear && <ContextChip label="Academic Year" value={activeYear.label} />}
          {activeTerm && (
            <span
              className="inline-flex items-center rounded px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}
            >
              {activeTerm.label} · Active
            </span>
          )}
          {!activeYear && !academicYears && (
            <Skeleton className="h-6 w-32" />
          )}
        </div>

        {schoolLoading ? (
          <Skeleton className="h-8 w-72 mb-1" />
        ) : (
          <h1
            className="text-2xl font-semibold text-foreground leading-snug"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {school?.name ?? 'Brite SMS'}
          </h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Phase 1 administration — school management system.
        </p>

        {!activeYear && academicYears?.length === 0 && (
          <div
            className="mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
            style={{
              backgroundColor: 'var(--warning-bg)',
              borderColor: 'var(--warning-bg)',
              color: 'var(--warning)',
            }}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>
              No academic year is set up yet.{' '}
              <Link href="/academic-years" className="underline font-medium">
                Create one to get started.
              </Link>
            </span>
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map(({ label, description, href, icon: Icon, primaryAction }) => (
            <Card key={href} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--primary)' }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <Link
                  href={href}
                  className="shrink-0 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
              </div>
              {primaryAction && (
                <div className="mt-auto">
                  <Link
                    href={primaryAction.href}
                    className={cn(buttonVariants({ size: 'sm' }), 'w-full justify-center')}
                  >
                    {primaryAction.label}
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* ── Phase 2 preview ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Coming in Phase 2
          </h2>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: 'var(--inactive-bg)', color: 'var(--inactive)' }}
          >
            Not yet active
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASE2_PREVIEW.map(({ label, description, icon: Icon }) => (
            <div
              key={label}
              className="relative flex flex-col gap-2.5 rounded-lg border border-border p-4 opacity-60 select-none"
              style={{ backgroundColor: 'var(--surface-alt)' }}
              aria-disabled="true"
            >
              <div className="absolute top-3 right-3">
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ backgroundColor: 'var(--inactive-bg)', color: 'var(--inactive)' }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
