'use client';

import { ArrowRight, FileCheck2, FileX2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Invoice, InvoiceChainEntry } from '@/types/api';

/**
 * The correction chain, rendered from oldest to newest with THIS invoice
 * marked in the middle.
 *
 * Opening any invoice in a chain has to show the whole history, not just its
 * own state — a parent holding a cancelled INV-00004 needs to be told which
 * number replaced it, and the bursar looking at INV-00005 needs to see what it
 * was correcting.
 */
export function CorrectionChain({ invoice }: { invoice: Invoice }) {
  const { supersedes, supersededBy } = invoice.chain;
  if (!supersedes.length && !supersededBy.length) return null;

  // supersedes comes back newest-first from the backward walk; show it oldest-first.
  const before = [...supersedes].reverse();
  const entries: Array<{ entry: InvoiceChainEntry | Invoice; current: boolean }> = [
    ...before.map((entry) => ({ entry, current: false })),
    { entry: invoice, current: true },
    ...supersededBy.map((entry) => ({ entry, current: false })),
  ];

  return (
    <div className="space-y-2 rounded-lg border p-4" style={{ backgroundColor: 'var(--info-bg)' }}>
      <p className="text-sm font-medium">Correction history</p>
      <div className="flex flex-wrap items-center gap-2">
        {entries.map(({ entry, current }, i) => (
          <span key={entry.id} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                current ? 'ring-2 ring-offset-1' : '',
              )}
              style={{
                backgroundColor: entry.status === 'cancelled' ? 'var(--error-bg)' : 'var(--success-bg)',
                color: entry.status === 'cancelled' ? 'var(--error)' : 'var(--success)',
              }}
              title={entry.status === 'cancelled' ? (entry.cancellationReason ?? undefined) : undefined}
            >
              {entry.status === 'cancelled'
                ? <FileX2 className="h-3 w-3" />
                : <FileCheck2 className="h-3 w-3" />}
              {entry.invoiceNumber}
              {current && <span className="opacity-70">(this one)</span>}
            </span>
          </span>
        ))}
      </div>
      {!!before.length && before[before.length - 1].cancellationReason && (
        <p className="text-xs text-foreground/70">
          Corrected because: {before[before.length - 1].cancellationReason}
        </p>
      )}
      {!!supersededBy.length && (
        <p className="text-xs text-foreground/70">
          This invoice has been replaced by <strong>{supersededBy[0].invoiceNumber}</strong>.
          Work on that one instead.
        </p>
      )}
    </div>
  );
}
