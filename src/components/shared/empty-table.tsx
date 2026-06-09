import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { InboxIcon } from 'lucide-react';

interface EmptyTableProps {
  columns: number;
  message?: string;
  cta?: React.ReactNode;
}

export function EmptyTable({ columns, message = 'No records found.', cta }: EmptyTableProps) {
  return (
    <TableBody>
      <TableRow className="hover:bg-transparent border-0">
        <TableCell colSpan={columns} className="py-16 text-center">
          <div className="flex flex-col items-center gap-2">
            <InboxIcon
              className="h-7 w-7"
              style={{ color: 'var(--muted-text)', opacity: 0.4 }}
            />
            <p className="text-sm text-muted-foreground">{message}</p>
            {cta && <div className="mt-1">{cta}</div>}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  );
}
