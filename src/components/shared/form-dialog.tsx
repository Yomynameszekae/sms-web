'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class, e.g. 'max-w-lg' (default), 'max-w-xl', 'max-w-2xl' */
  maxWidth?: string;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className={cn(
          'flex flex-col p-0 overflow-hidden max-h-[90vh]',
          maxWidth,
        )}
      >
        {/* Header — fixed, not scrolling */}
        <div className="shrink-0 border-b px-6 pt-5 pb-4 pr-12">
          <DialogTitle className="text-base font-semibold leading-snug">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">{children}</div>
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 border-t bg-card px-6 py-4 flex justify-end gap-2">
            {footer}
          </div>
        )}

        <DialogClose />
      </DialogPopup>
    </Dialog>
  );
}

interface FormFooterProps {
  onCancel: () => void;
  submitLabel?: string;
  isPending?: boolean;
  /** HTML form id — required when the footer lives outside the <form> element */
  formId?: string;
}

export function FormFooter({ onCancel, submitLabel = 'Save', isPending, formId }: FormFooterProps) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" form={formId} disabled={isPending}>
        {isPending ? 'Saving…' : submitLabel}
      </Button>
    </>
  );
}
