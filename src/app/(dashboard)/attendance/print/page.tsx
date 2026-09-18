import { Suspense } from 'react';
import { RegisterPrintView } from './_print';

export const metadata = { title: 'Printable register — Brite SMS' };

/**
 * The printable register, behind `format=register` on the backend.
 *
 * NO SERVER-SIDE PDF: Brite has no PDF library, and a PDF pipeline is a bigger
 * change than this feature. This is print-styled HTML the browser prints to
 * PDF, which is how every other printable in Brite works.
 */
export default function AttendancePrintPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPrintView />
    </Suspense>
  );
}
