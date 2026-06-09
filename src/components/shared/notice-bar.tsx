import { Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type NoticeVariant = 'info' | 'lock';

interface NoticeBarProps {
  variant?: NoticeVariant;
  children: React.ReactNode;
  className?: string;
}

const ICONS: Record<NoticeVariant, React.ElementType> = {
  info: Info,
  lock: Lock,
};

export function NoticeBar({ variant = 'info', children, className }: NoticeBarProps) {
  const Icon = ICONS[variant];
  return (
    <div
      className={cn('flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm', className)}
      style={{
        backgroundColor: 'var(--info-bg)',
        borderColor: 'var(--info-bg)',
      }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-foreground/80 text-sm">{children}</span>
    </div>
  );
}
