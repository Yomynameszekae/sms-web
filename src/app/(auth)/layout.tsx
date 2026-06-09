import { CheckCircle2 } from 'lucide-react';

const FEATURES = [
  'School profile and system configuration',
  'Academic years, terms, and curriculum levels',
  'Classroom management and teacher assignments',
  'Staff and student records',
  'Admissions pipeline — enquiry to enrollment',
  'Document metadata and immutable audit logs',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Branded left panel — sidebar tokens make it dark on navy themes, warm on light themes */}
      <div
        className="hidden lg:flex lg:w-[440px] shrink-0 flex-col justify-between p-12 border-r border-sidebar-border"
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
      >
        {/* Top: brand */}
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold"
              style={{
                backgroundColor: 'var(--brand-tile-bg)',
                color: 'var(--brand-tile-fg)',
              }}
            >
              B
            </div>
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--sidebar-active-text, var(--sidebar-text))' }}
            >
              Brite SMS
            </span>
          </div>

          <h2
            className="text-2xl font-semibold leading-snug mb-3"
            style={{
              color: 'var(--sidebar-active-text, var(--sidebar-text))',
              fontFamily: 'var(--font-display)',
            }}
          >
            School management built for Ghana
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--sidebar-group)' }}>
            A complete administration system for private basic schools — from Crèche through JHS 3.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <CheckCircle2
                  className="h-4 w-4 mt-0.5 shrink-0"
                  style={{ color: 'var(--sidebar-bar)' }}
                />
                <span className="text-sm leading-snug" style={{ color: 'var(--sidebar-text)' }}>
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: footer note */}
        <p className="text-xs" style={{ color: 'var(--sidebar-group)' }}>
          Phase 1 · Functional release
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        {children}
      </div>
    </div>
  );
}
