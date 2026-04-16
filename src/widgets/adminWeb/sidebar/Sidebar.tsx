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
        label: '샘플업무',
        path: '/adminWeb/support/list',
      },
    ],
  },
  // 대분류 카테고리: 통계자료 (주석)
  {
    id: 'statistics',
    label: '통계자료',
    icon: 'BarChart3',
    submenu: [
      {
        id: 'statistics-sample',
        label: '샘플통계',
        path: '/adminWeb/statistics/sample',
      },
    ],
  },
  {
    id: 'member',
    label: '관리자',
    icon: 'Users',
    submenu: [
      {
        id: 'member-list',
        label: '관리자회원',
        path: '/adminWeb/member/list',
      },
      // 관리자 카테고리: 선정업무 (사이드바 비노출 — URL 직접 입력 시 접근 가능)
      // {
      //   id: 'member-selection',
      //   label: '선정업무',
      //   path: '/adminWeb/member/selection',
      // },
      // 관리자 카테고리: 테스트 (주석)
      // {
      //   id: 'member-test',
      //   label: '테스트',
      //   path: '/adminWeb/member/test',
      // },
      // 관리자 카테고리: 권한관리 (주석)
      // { id: "member-role", label: "권한관리", path: "/adminWeb/member/role" },
    ],
  },
  // 대분류 카테고리: 코드관리 (주석)
  // {
  //   id: 'code',
  //   label: '코드관리',
  //   icon: 'Settings',
  //   submenu: [
  //     { id: 'code-list', label: '코드목록', path: '/adminWeb/code/list' },
  //     {
  //       id: 'code-register',
  //       label: '코드등록',
  //       path: '/adminWeb/code/register',
  //     },
  //     { id: 'code-group', label: '코드그룹', path: '/adminWeb/code/group' },
  //   ],
  // },
  // 대분류 카테고리: 메뉴관리 (주석)
  // {
  //   id: 'menu',
  //   label: '메뉴관리',
  //   icon: 'ClipboardList',
  //   submenu: [
  //     { id: 'menu-list', label: '메뉴목록', path: '/adminWeb/menu/list' },
  //     {
  //       id: 'menu-register',
  //       label: '메뉴등록',
  //       path: '/adminWeb/menu/register',
  //     },
  //     { id: 'menu-order', label: '메뉴순서', path: '/adminWeb/menu/order' },
  //   ],
  // },
  {
    id: 'common',
    label: '공통',
    icon: 'FileText',
    submenu: [
      {
        id: 'board-list',
        label: '게시판관리',
        path: '/adminWeb/board/list',
      },
      {
        id: 'banner-list',
        label: '배너관리',
        path: '/adminWeb/banner/list',
      },
    ],
  },
  {
    id: 'system',
    label: '시스템',
    icon: 'Settings',
    submenu: [
      {
        id: 'program-list',
        label: '프로그램관리',
        path: '/adminWeb/program/list',
      },
      {
        id: 'menu-tree',
        label: '메뉴관리',
        path: '/adminWeb/menu/tree',
      },
      {
        id: 'menu-make',
        label: '메뉴생성관리',
        path: '/adminWeb/menu/make',
      },
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
    'statistics',
    'member',
    'common',
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
          <div className="sidebar-logo">
            <img src="/images/logo.png" alt="관리자 로고" />
            <span className="font-bold sidebar-logo-text"></span>
          </div>
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
