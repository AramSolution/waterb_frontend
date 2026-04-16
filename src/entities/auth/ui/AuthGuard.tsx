'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthService } from '@/entities/auth/api';
import { DuplicateLoginManager } from '@/shared/lib';
import { ForceLogoutDialog } from '@/shared/ui/adminWeb';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);

  useEffect(() => {
    // 로그인 페이지는 인증 체크 제외
    if (pathname === '/adminWeb/login') {
      setIsLoading(false);
      return;
    }

    // 인증 확인
    const checkAuth = () => {
      const isAuth = AuthService.isAuthenticated();

      if (isAuth) {
        setIsAuthenticated(true);
        setIsLoading(false);

        // 중복 로그인 감지 시작
        const handleForceLogout = () => {
          setShowForceLogoutDialog(true);
        };

        DuplicateLoginManager.startDuplicateLoginCheck(handleForceLogout);

        // BroadcastChannel 리스너 시작
        const channel = DuplicateLoginManager.startBroadcastListener(handleForceLogout);

        // 클린업
        return () => {
          DuplicateLoginManager.stopDuplicateLoginCheck();
          if (channel) {
            channel.close();
          }
        };
      } else {
        // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
        router.push('/adminWeb/login');
      }
    };

    const cleanup = checkAuth();

    return cleanup;
  }, [pathname, router]);

  const handleForceLogoutConfirm = async () => {
    setShowForceLogoutDialog(false);
    await AuthService.logout();
    router.push('/adminWeb/login');
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f7fa'
      }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">로딩 중...</span>
        </div>
      </div>
    );
  }

  // 로그인 페이지는 그대로 렌더링
  if (pathname === '/adminWeb/login') {
    return <>{children}</>;
  }

  // 인증된 사용자만 접근 가능
  if (isAuthenticated) {
    return (
      <>
        {children}
        <ForceLogoutDialog
          isOpen={showForceLogoutDialog}
          onConfirm={handleForceLogoutConfirm}
        />
      </>
    );
  }

  return null;
};
