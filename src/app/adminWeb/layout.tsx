import type { Metadata } from 'next';
import { AuthGuard } from '@/entities/auth/ui/AuthGuard';
import '@/shared/styles/admin/globals.css';

export const metadata: Metadata = {
  title: {
    default: '김제시 상하수도 관리',
    template: '%s | 김제시 상하수도 관리',
  },
  description: '김제시 상하수도 관리 관리자',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
