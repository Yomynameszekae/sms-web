import { Construction } from 'lucide-react';

interface ComingSoonProps {
  module: string;
  description?: string;
}

export function ComingSoon({ module, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
      <Construction className="mb-4 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">
        {module} — full interface coming soon
      </p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>
      )}
    </div>
  );
}
