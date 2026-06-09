import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

// Width patterns cycle across columns to create visual variety
const WIDTH_PATTERNS = ['w-3/4', 'w-full', 'w-1/2', 'w-5/6', 'w-2/3', 'w-4/5'];

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton
                className={`h-[14px] ${WIDTH_PATTERNS[(i * columns + j) % WIDTH_PATTERNS.length]}`}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
