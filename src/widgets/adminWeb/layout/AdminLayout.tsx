'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/widgets/adminWeb/header';
import { Sidebar } from '@/widgets/adminWeb/sidebar';
import { RoleGuard } from '@/entities/auth/ui';
import '@/shared/styles/admin/layout.css';
import '@/shared/styles/admin/register-form.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // PC/태블릿에서는 사이드바 항상 열림 상태로 초기화
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth >= 768) {
      // PC/태블릿: 축소/확장
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      // 모바일: 열기/닫기
      setSidebarOpen(!sidebarOpen);
    }
  };

  const closeSidebar = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <RoleGuard>
      <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={closeSidebar}
        />
        <div className="main-content">
          <Header onToggleSidebar={toggleSidebar} />
          <main className="content-area">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
};

