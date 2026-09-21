import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  apiErrorMessage,
  deniedFeatureLabel,
  isPermissionDenied,
} from '@/lib/api/errors';

interface ApiErrorProps {
  error: unknown;
  onRetry?: () => void;
  /**
   * Overrides the feature name in the access-denied copy. Only needed when the
   * label derived from the permission key reads badly on a particular screen;
   * most callers should leave it unset.
   */
  feature?: string;
}

/**
 * THREE STATES, NOT ONE.
 *
 *   permission denied (403) — expected and static. Calm, neutral, no retry.
 *   everything else         — unexpected, often transient. Alarming, retry.
 *   no data                 — not an error at all; see <EmptyTable>.
 *
 * The third is deliberately NOT handled here. An empty table is a normal
 * outcome and must not borrow error styling.
 */
export function ApiError({ error, onRetry, feature }: ApiErrorProps) {
  if (isPermissionDenied(error)) {
    return <AccessDenied error={error} feature={feature} />;
  }

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

/**
 * Not being allowed to see something is a normal state of the product, so it
 * is styled like one: neutral surface, muted text, no warning colour, no
 * retry affordance.
 *
 * Deliberately NOT shown: the permission key. `deniedFeatureLabel` reads it
 * only to work out a human name for the feature and never returns the key
 * itself. A user cannot act on "fee_types.read"; they can act on "ask an
 * administrator for access to Fee Types".
 */
export function AccessDenied({
  error,
  feature,
}: {
  error?: unknown;
  feature?: string;
}) {
  const label = feature ?? (error ? deniedFeatureLabel(error) : null);

  return (
    <div
      data-state="access-denied"
      className="flex flex-col items-center justify-center rounded-lg border p-10 text-center gap-2"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-alt)',
      }}
    >
      <Lock className="h-6 w-6" style={{ color: 'var(--muted-text)', opacity: 0.6 }} />
      <p className="text-sm font-medium">
        {label ? `You don't have access to ${label}` : "You don't have access to this page"}
      </p>
      <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
        Contact your administrator if you believe this is a mistake.
      </p>
    </div>
  );
}
