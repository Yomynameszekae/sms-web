'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { documentSequencesApi } from '@/lib/api/endpoints/document-sequences';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { DocumentSequence, DocumentSequenceType } from '@/types/api';

const TYPE_LABELS: Record<DocumentSequenceType, string> = {
  student_number:   'Student Number',
  admission_number: 'Admission Number',
  invoice_number:   'Invoice Number',
  receipt_number:   'Receipt Number',
  staff_number:     'Staff Number',
};

const schema = z.object({
  prefix:        z.string().optional(),
  paddingLength: z.number().int().min(1, 'Min 1').max(10, 'Max 10'),
  resetPolicy:   z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function EditDialog({
  seq,
  open,
  onOpenChange,
}: {
  seq: DocumentSequence;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      prefix:        seq.prefix ?? '',
      paddingLength: seq.paddingLength,
      resetPolicy:   seq.resetPolicy ?? '',
    },
  });

  const { mutate, isPending } = useApiMutation({
    mutationFn: (values: FormValues) =>
      documentSequencesApi
        .update(seq.type, {
          prefix:        values.prefix || undefined,
          paddingLength: values.paddingLength,
          resetPolicy:   values.resetPolicy || undefined,
        })
        .then((r) => r.data.data),
    successMessage: `${TYPE_LABELS[seq.type]} sequence updated.`,
    invalidateKeys: [queryKeys.documentSequences.list()],
    onSuccess: () => onOpenChange(false),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${TYPE_LABELS[seq.type]}`}
      footer={<FormFooter onCancel={() => onOpenChange(false)} isPending={isPending} formId="docseq-form" />}
    >
      <form id="docseq-form" onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="prefix">Prefix</Label>
          <Input id="prefix" placeholder="e.g. STU" {...form.register('prefix')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paddingLength">Padding Length</Label>
          <Input id="paddingLength" type="number" min={1} max={10} {...form.register('paddingLength', { valueAsNumber: true })} />
          {form.formState.errors.paddingLength && (
            <p className="text-xs text-destructive">{form.formState.errors.paddingLength.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resetPolicy">Reset Policy</Label>
          <Input id="resetPolicy" placeholder="e.g. yearly" {...form.register('resetPolicy')} />
        </div>
        <p className="text-xs text-muted-foreground">
          Current number: <strong>{seq.currentNumber}</strong> — cannot be changed here.
        </p>
      </form>
    </FormDialog>
  );
}

export function DocumentSequencesView() {
  const [editing, setEditing] = useState<DocumentSequence | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.documentSequences.list(),
    queryFn: () => documentSequencesApi.list().then((r) => r.data.data),
  });

  const COLS = 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Sequences"
        description="Configure auto-numbering for admissions, students, staff, and financial documents."
      />

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Current #</TableHead>
              <TableHead>Padding</TableHead>
              <TableHead>Reset Policy</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          {isLoading ? (
            <TableSkeleton columns={COLS + 1} rows={5} />
          ) : (
            <TableBody>
              {data?.map((seq) => (
                <TableRow key={seq.id}>
                  <TableCell className="font-medium">{TYPE_LABELS[seq.type]}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted rounded px-1.5 py-0.5">{seq.prefix ?? '—'}</code>
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-sm text-muted-foreground font-mono"
                      title="Read-only — current number cannot be changed here"
                    >
                      {seq.currentNumber}
                    </span>
                  </TableCell>
                  <TableCell>{seq.paddingLength}</TableCell>
                  <TableCell>{seq.resetPolicy ?? '—'}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditing(seq)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </Card>

      {editing && (
        <EditDialog
          seq={editing}
          open={!!editing}
          onOpenChange={(v) => { if (!v) setEditing(null); }}
        />
      )}
    </div>
  );
}
