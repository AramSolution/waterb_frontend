import type { Metadata } from 'next';
import { AuthGuard } from '@/entities/auth/ui/AuthGuard';
import '@/shared/styles/admin/globals.css';

export const metadata: Metadata = {
  title: '관리자 시스템',
  description: '관리자 페이지',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
