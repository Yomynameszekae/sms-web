import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'closed'
  | 'archived'
  | 'info'
  | 'warning'
  | 'error';

const VARIANT_STYLES: Record<StatusVariant, { bg: string; color: string }> = {
  active:   { bg: 'var(--success-bg)',  color: 'var(--success)' },
  pending:  { bg: 'var(--warning-bg)',  color: 'var(--warning)' },
  warning:  { bg: 'var(--warning-bg)',  color: 'var(--warning)' },
  closed:   { bg: 'var(--closed-bg)',   color: 'var(--closed)' },
  inactive: { bg: 'var(--inactive-bg)', color: 'var(--inactive)' },
  archived: { bg: 'var(--inactive-bg)', color: 'var(--inactive)' },
  info:     { bg: 'var(--info-bg)',     color: 'var(--info)' },
  error:    { bg: 'var(--error-bg)',    color: 'var(--error)' },
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const { bg, color } = VARIANT_STYLES[variant] ?? VARIANT_STYLES.inactive;
  const text = label ?? variant.charAt(0).toUpperCase() + variant.slice(1);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap',
        className,
      )}
      style={{ backgroundColor: bg, color }}
    >
      {text}
    </span>
  );
}
