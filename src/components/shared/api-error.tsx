import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiErrorMessage } from '@/lib/api/errors';

interface ApiErrorProps {
  error: unknown;
  onRetry?: () => void;
}

export function ApiError({ error, onRetry }: ApiErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border p-10 text-center gap-3"
      style={{
        borderColor: 'var(--error-bg)',
        backgroundColor: 'var(--error-bg)',
      }}
    >
      <AlertTriangle
        className="h-7 w-7"
        style={{ color: 'var(--error)', opacity: 0.7 }}
      />
      <p className="text-sm font-medium" style={{ color: 'var(--error)' }}>
        {apiErrorMessage(error)}
      </p>
      {onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
