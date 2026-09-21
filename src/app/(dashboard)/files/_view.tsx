'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Archive } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ApiError } from '@/components/shared/api-error';
import { isPermissionDenied } from '@/lib/api/errors';
import { NoticeBar } from '@/components/shared/notice-bar';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyTable } from '@/components/shared/empty-table';
import { FormDialog, FormFooter } from '@/components/shared/form-dialog';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { filesApi } from '@/lib/api/endpoints/files';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { queryKeys } from '@/lib/query-keys';
import type { FileRecord, FileOwnerType, CreateFilePayload } from '@/types/api';

const OWNER_TYPES: FileOwnerType[] = ['student', 'staff', 'guardian', 'admission', 'school', 'user', 'other'];

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const fileSchema = z.object({
  ownerType:        z.enum(['student', 'staff', 'guardian', 'admission', 'school', 'user', 'other'] as const),
  ownerId:          z.string().optional(),
  originalFileName: z.string().min(1, 'File name is required'),
  mimeType:         z.string().min(1, 'MIME type is required'),
  sizeBytes:        z.string().min(1, 'Size is required'),
  storageBucket:    z.string().min(1, 'Storage bucket is required'),
  storageKey:       z.string().min(1, 'Storage key is required'),
  category:         z.string().optional(),
});
type FileForm = z.infer<typeof fileSchema>;

const INVALIDATE = [queryKeys.files.all];

function CreateFileForm({
  id, onSubmit,
}: { id: string; onSubmit: (v: FileForm) => void }) {
  const form = useForm<FileForm>({
    resolver: zodResolver(fileSchema),
    defaultValues: { ownerType: 'student' },
  });

  return (
    <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ff-type">Owner Type *</Label>
          <Select id="ff-type" {...form.register('ownerType')}>
            {OWNER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ff-owner">Owner ID</Label>
          <Input id="ff-owner" placeholder="UUID of the owner record" {...form.register('ownerId')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ff-name">File Name *</Label>
          <Input id="ff-name" placeholder="e.g. report.pdf" {...form.register('originalFileName')} />
          {form.formState.errors.originalFileName && (
            <p className="text-xs text-destructive">{form.formState.errors.originalFileName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ff-mime">MIME Type *</Label>
          <Input id="ff-mime" placeholder="e.g. application/pdf" {...form.register('mimeType')} />
          {form.formState.errors.mimeType && (
            <p className="text-xs text-destructive">{form.formState.errors.mimeType.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ff-size">Size (bytes) *</Label>
          <Input id="ff-size" type="number" min={1} placeholder="e.g. 2048" {...form.register('sizeBytes')} />
          {form.formState.errors.sizeBytes && (
            <p className="text-xs text-destructive">{form.formState.errors.sizeBytes.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ff-category">Category</Label>
          <Input id="ff-category" placeholder="e.g. report, photo" {...form.register('category')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ff-bucket">Storage Bucket *</Label>
        <Input id="ff-bucket" placeholder="e.g. ghana-sms-dev" {...form.register('storageBucket')} />
        {form.formState.errors.storageBucket && (
          <p className="text-xs text-destructive">{form.formState.errors.storageBucket.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ff-key">Storage Key *</Label>
        <Input id="ff-key" placeholder="e.g. students/uuid/filename.pdf" {...form.register('storageKey')} />
        {form.formState.errors.storageKey && (
          <p className="text-xs text-destructive">{form.formState.errors.storageKey.message}</p>
        )}
      </div>
    </form>
  );
}

export function FilesView() {
  const [page, setPage] = useState(1);
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<FileOwnerType | ''>('');
  const [createOpen, setCreateOpen] = useState(false);

  const queryParams = { page, limit: 20, ...(ownerTypeFilter ? { ownerType: ownerTypeFilter } : {}) };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.files.list(queryParams),
    queryFn: () => filesApi.list(queryParams).then((r) => r.data.data),
  });

  const { mutate: create, isPending: creating } = useApiMutation<unknown, CreateFilePayload>({
    mutationFn: (p) => filesApi.create(p).then((r) => r.data.data),
    successMessage: 'File record created.',
    invalidateKeys: INVALIDATE,
    onSuccess: () => setCreateOpen(false),
  });

  const { mutate: archive } = useApiMutation<unknown, string>({
    mutationFn: (id) => filesApi.archive(id).then((r) => r.data.data),
    successMessage: 'File archived.',
    invalidateKeys: INVALIDATE,
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const COLS = 7;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Files"
        description="Metadata-only file records. Binary upload is a Phase 2 feature."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New File Record
          </Button>
        }
      />

      <NoticeBar>
        <span>
          <strong>Phase 1 — metadata only.</strong> This module records information about a file (name, MIME type,
          owner, size in bytes, storage bucket, and storage key) but does not upload, preview, or download the actual
          file content. Actual file upload and download will be completed in a later phase.
          Archiving a file record is permanent in Phase 1 — archived records cannot be restored.
        </span>
      </NoticeBar>

      <div className="flex items-center gap-3">
        <Select
          value={ownerTypeFilter}
          onChange={(e) => { setOwnerTypeFilter(e.target.value as FileOwnerType | ''); setPage(1); }}
          className="max-w-[160px]"
        >
          <option value="">All owners</option>
          {OWNER_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </div>

      {error && <ApiError error={error} onRetry={() => refetch()} />}

      {!isPermissionDenied(error) && (
        <Card className="p-0 gap-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Owner Type</TableHead>
                <TableHead>MIME Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Public</TableHead>
                <TableHead>Archived</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : !items.length ? (
              <EmptyTable columns={COLS} message="No file records found." />
            ) : (
              <TableBody>
                {items.map((f: FileRecord) => (
                  <TableRow key={f.id} className={f.archivedAt ? 'opacity-60' : ''}>
                    <TableCell className="font-medium text-sm">
                      {f.originalFileName}
                      {f.category && (
                        <div className="text-xs text-muted-foreground">{f.category}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{f.ownerType}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.mimeType}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtBytes(f.sizeBytes)}</TableCell>
                    <TableCell className="text-sm">{f.isPublic ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {f.archivedAt ? new Date(f.archivedAt).toLocaleDateString('en-GB') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!f.archivedAt && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => archive(f.id)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
          {pagination && <Pagination {...pagination} onPageChange={setPage} />}
        </Card>
      )}

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New File Record"
        maxWidth="max-w-lg"
        footer={<FormFooter onCancel={() => setCreateOpen(false)} isPending={creating} formId="file-create-form" submitLabel="Create Record" />}
      >
        <CreateFileForm
          id="file-create-form"
          onSubmit={(v) =>
            create({
              ownerType: v.ownerType,
              ownerId: v.ownerId || undefined,
              originalFileName: v.originalFileName,
              mimeType: v.mimeType,
              sizeBytes: parseInt(v.sizeBytes, 10),
              storageBucket: v.storageBucket,
              storageKey: v.storageKey,
              category: v.category || undefined,
              // isPublic is deliberately NOT sent: the backend hardcodes
              // isPublic = false and rejects the property outright
              // (forbidNonWhitelisted), which failed every file create.
            })
          }
        />
      </FormDialog>
    </div>
  );
}
