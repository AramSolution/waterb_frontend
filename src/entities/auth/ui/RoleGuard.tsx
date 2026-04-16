'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { canAccessPath, getUserRole } from '@/entities/auth/model';
import { AuthService } from '@/entities/auth/api';

interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * 역할 기반 라우트 가드 컴포넌트
 * /adminWeb 경로 접근 시 ROLE_ADMIN 권한 체크
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 로그인 페이지는 체크하지 않음
    if (pathname === '/adminWeb/login' || pathname === '/adminWeb/forbidden') {
      setIsAuthorized(true);
      return;
    }

    // 인증 확인
    const isAuthenticated = AuthService.isAuthenticated();
    if (!isAuthenticated) {
      router.push('/adminWeb/login');
      return;
    }

    // 권한 확인
    const hasAccess = canAccessPath(pathname);

    if (!hasAccess) {
      console.warn(`Access denied to ${pathname}. User role:`, getUserRole());
      router.push('/adminWeb/forbidden');
      setIsAuthorized(false);
      return;
    }

    setIsAuthorized(true);
  }, [pathname, router]);

  // 권한 체크 중
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // 권한 없음
  if (!isAuthorized) {
    return null;
  }

  // 권한 있음
  return <>{children}</>;
};
