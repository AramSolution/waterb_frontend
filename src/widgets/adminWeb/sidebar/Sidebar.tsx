'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { canAccessPath } from '@/entities/auth/model';
import { Icon } from '@/shared/components/Icon';
import '@/shared/styles/admin/sidebar.css';

interface SubMenuItem {
  id: string;
  label: string;
  path: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  submenu?: SubMenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
}

const menuItems: MenuItem[] = [
  {
    id: 'support',
    label: '업무관리',
    icon: 'Briefcase',
    submenu: [
      {
        id: 'support-list',
        label: '오수 원인자부담금 관리',
        path: '/adminWeb/support/list',
      },
      {
        id: 'support-drainage-equip',
        label: '배수설비 관리',
        path: '/adminWeb/support/drainage-equip',
      },
      {
        id: 'support-purpose',
        label: '용도관리',
        path: '/adminWeb/support/purpose',
      },
    ],
  },
  {
    id: 'member',
    label: '회원관리',
    icon: 'Users',
    submenu: [
      {
        id: 'member-list',
        label: '관리자회원',
        path: '/adminWeb/member/list',
      },
    ],
  },
  {
    id: 'system',
    label: '시스템',
    icon: 'Settings',
    submenu: [
      {
        id: 'code-manage',
        label: '공통코드관리',
        path: '/adminWeb/code/manage',
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed = false,
  onClose,
}) => {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    'support',
    'member',
    'system',
  ]);

  // 접근 가능한 메뉴만 필터링
  const accessibleMenus = menuItems.filter((menu) => {
    if (!menu.submenu || menu.submenu.length === 0) return false;

    // 서브메뉴 중 하나라도 접근 가능하면 표시
    return menu.submenu.some((subItem) => canAccessPath(subItem.path));
  });

  const toggleMenu = (menuId: string) => {
    // 축소 상태에서는 메뉴 토글 안 함
    if (isCollapsed) return;

    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId],
    );
  };
  
  const isPathMatch = (basePath: string) => {
    if (!pathname) return false;
    return pathname === basePath || pathname.startsWith(`${basePath}/`);
  };

  const isSubmenuActive = (submenu: SubMenuItem[]) => {
    return submenu.some((item) => isPathMatch(item.path));
  };

  const handleLinkClick = () => {
    // 모바일에서 메뉴 클릭 시 사이드바 닫기
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}

      <aside
        className={`sidebar ${isOpen ? 'open' : ''} ${
          isCollapsed ? 'collapsed' : ''
        }`}
      >
        <div className="sidebar-header">
          <Link
            href="/adminWeb"
            className="sidebar-logo"
            aria-label="관리자 홈(대시보드)으로 이동"
            onClick={handleLinkClick}
          >
            <img
              src={
                isCollapsed ? '/images/logo_small.png' : '/images/logo.png'
              }
              alt="관리자 로고"
            />
            <span className="font-bold sidebar-logo-text"></span>
          </Link>
          <button className="sidebar-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <nav className="sidebar-menu">
          {accessibleMenus.map((menu) => {
            const isExpanded = expandedMenus.includes(menu.id);
            const isActive = menu.submenu
              ? isSubmenuActive(menu.submenu)
              : false;

            // 접근 가능한 서브메뉴만 필터링
            const accessibleSubmenus =
              menu.submenu?.filter((subItem) => canAccessPath(subItem.path)) ||
              [];

            // 접근 가능한 서브메뉴가 없으면 메뉴 자체를 표시하지 않음
            if (accessibleSubmenus.length === 0) return null;

            return (
              <div key={menu.id} className="menu-item">
                <button
                  className={`menu-button ${isActive ? 'active' : ''}`}
                  onClick={() => toggleMenu(menu.id)}
                  title={isCollapsed ? menu.label : ''}
                >
                  <span className="menu-icon">
                    <Icon name={menu.icon} size={18} />
                  </span>
                  <span className="menu-label">{menu.label}</span>
                  {!isCollapsed && (
                    <span
                      className={`menu-arrow ${isExpanded ? 'expanded' : ''}`}
                    >
                      ▶
                    </span>
                  )}
                </button>
                {!isCollapsed && (
                  <div className={`submenu ${isExpanded ? 'expanded' : ''}`}>
                    {accessibleSubmenus.map((subItem) => (
                      <Link
                        key={subItem.id}
                        href={subItem.path}
                        className={`submenu-item ${isPathMatch(subItem.path) ? 'active' : ''}`}
                        onClick={handleLinkClick}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
