import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAxiosError } from 'axios';

interface ApiErrorProps {
  error: unknown;
  onRetry?: () => void;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      error.message ??
      'An unexpected error occurred.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
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
        {getErrorMessage(error)}
      </p>
      {onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
