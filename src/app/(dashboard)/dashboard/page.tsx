import type { Metadata } from 'next';
import { DashboardView } from './_view';

export const metadata: Metadata = {
  title: 'Dashboard — Brite SMS',
};

export default function DashboardPage() {
  return <DashboardView />;
}
