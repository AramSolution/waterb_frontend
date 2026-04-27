'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/entities/auth/api';
import { SessionManager } from '@/shared/lib/sessionManager';
import '@/shared/styles/admin/layout.css';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<string>(() =>
    SessionManager.getFormattedRemainingTime()
  );
  const [showExtendInput, setShowExtendInput] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState<string>('');

  // 사용자명 초기화
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // 세션 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = SessionManager.getFormattedRemainingTime();
      setRemainingTime(remaining);

      // 세션 만료 확인
      if (SessionManager.isSessionExpired()) {
        clearInterval(timer);
        handleSessionExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSessionExpired = async () => {
    alert('세션이 만료되었습니다. 다시 로그인해주세요.');
    await AuthService.logout();
    router.push('/adminWeb/login');
  };

  const handleLogout = async () => {
    try {
      // AuthService를 통해 로그아웃
      await AuthService.logout();

      // 로그인 페이지로 이동
      router.push('/adminWeb/login');
    } catch (error) {
      console.error('Logout error:', error);
      // 에러가 발생해도 로그인 페이지로 이동
      router.push('/adminWeb/login');
    }
  };

  const handleExtendSessionClick = () => {
    setShowExtendInput((prev) => !prev);
    if (showExtendInput) setExtendMinutes('');
  };

  const handleExtendSessionConfirm = () => {
    const minutes = parseInt(extendMinutes, 10);
    if (!Number.isInteger(minutes) || minutes < 1) {
      alert('1 이상의 분을 입력해 주세요.');
      return;
    }
    SessionManager.extendSessionByMinutes(minutes);
    setRemainingTime(SessionManager.getFormattedRemainingTime());
    setExtendMinutes('');
    setShowExtendInput(false);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="메뉴 토글"
        >
          <span className="menu-toggle-icon">☰</span>
        </button>
        <Link
          href="/adminWeb"
          className="header-logo-mobile flex items-center shrink-0"
          aria-label="관리자 홈(대시보드)으로 이동"
        >
          <img src="/images/logo.png" alt="관리자 로고" />
          <span className="font-bold"></span>
        </Link>
      </div>

      <div className="header-actions flex items-center gap-1.5 sm:gap-2 md:gap-4">
        {/* 세션 남은 시간 + 연장 버튼 */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <span className="text-base sm:text-[15px] md:text-lg font-bold text-red-600 whitespace-nowrap tabular-nums">
            {remainingTime}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="px-2 md:px-3 py-1 sm:py-1.5 text-[11px] md:text-[13px] font-semibold bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={handleExtendSessionClick}
              title="세션 연장 (분 입력)"
            >
              연장
            </button>
            {showExtendInput && (
              <>
                <input
                  type="number"
                  min={1}
                  placeholder="분"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExtendSessionConfirm();
                  }}
                  className="w-14 px-2 py-1 text-[12px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  className="px-2 py-1 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={handleExtendSessionConfirm}
                >
                  적용
                </button>
              </>
            )}
          </div>
        </div>

        {/* 사용자 정보 */}
        <div className="hidden sm:flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 sm:py-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[11px] md:text-[13px] font-semibold text-gray-700 whitespace-nowrap">
            {username || '사용자'}
          </span>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          className="px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] md:text-[13px] border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors whitespace-nowrap"
          onClick={handleLogout}
          title="로그아웃"
        >
          <span className="hidden sm:inline">로그아웃</span>
          <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};
