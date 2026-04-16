'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';
import { SkeletonTable } from '@/shared/ui/adminWeb';
import '@/shared/styles/admin/mobile-table.css';

export default function CodeListPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const getBadgeColor = (groupColor: string) => {
    const colorMap: { [key: string]: string } = {
      'bg-info': 'bg-cyan-500',
      'bg-secondary': 'bg-gray-600',
      'bg-primary': 'bg-primary',
      'bg-success': 'bg-success',
    };
    return colorMap[groupColor] || 'bg-gray-500';
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">코드목록</h1>
        <nav className="breadcrumb">
          <span>홈</span> / <span>코드관리</span> / <span>코드목록</span>
        </nav>
      </div>

      {/* Search Card */}
      <div className="bg-white rounded shadow-sm mb-4">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <input
                type="text"
                className="w-full px-3 py-2 border border-border-light rounded-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="코드명 검색"
              />
            </div>
            <div className="md:col-span-3">
              <select className="w-full px-3 py-2 border border-border-light rounded-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
                <option value="">전체 그룹</option>
                <option value="common">공통코드</option>
                <option value="system">시스템코드</option>
                <option value="user">사용자코드</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button className="w-full px-4 py-2 bg-primary text-white rounded-none hover:bg-blue-700 transition-colors duration-200">
                검색
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h5 className="text-lg font-semibold text-gray-800 m-0">코드 목록 (총 89개)</h5>
          <button className="px-3 py-1.5 bg-primary text-white text-sm rounded-none hover:bg-blue-700 transition-colors duration-200">
            코드 등록
          </button>
        </div>
        <div className="p-0">
          {loading ? (
            <SkeletonTable rows={8} columns={6} />
          ) : (
            <>
              {/* 데스크톱 테이블 뷰 */}
              <div className="table-responsive overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">번호</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">코드</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">코드명</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">그룹</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">사용여부</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { num: 1, code: 'USER_STATUS_ACTIVE', name: '활성 상태', group: '사용자코드', groupColor: 'bg-info' },
                      { num: 2, code: 'USER_STATUS_INACTIVE', name: '비활성 상태', group: '사용자코드', groupColor: 'bg-info' },
                      { num: 3, code: 'MENU_TYPE_ADMIN', name: '관리자 메뉴', group: '시스템코드', groupColor: 'bg-secondary' },
                      { num: 4, code: 'MENU_TYPE_USER', name: '사용자 메뉴', group: '시스템코드', groupColor: 'bg-secondary' },
                      { num: 5, code: 'COMMON_YES', name: '예', group: '공통코드', groupColor: 'bg-primary' },
                    ].map((item) => (
                      <tr key={item.num} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-3 text-center text-sm border-b border-gray-200">{item.num}</td>
                        <td className="px-4 py-3 text-center text-sm border-b border-gray-200">{item.code}</td>
                        <td className="px-4 py-3 text-center text-sm border-b border-gray-200">{item.name}</td>
                        <td className="px-4 py-3 text-center text-sm border-b border-gray-200">
                          <span className={`inline-block px-2 py-1 text-xs font-medium text-white rounded ${getBadgeColor(item.groupColor)}`}>
                            {item.group}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm border-b border-gray-200">
                          <span className="inline-block px-2 py-1 text-xs font-medium text-white rounded bg-success">
                            사용
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm border-b border-gray-200">
                          <button className="px-3 py-1 text-xs border border-primary text-primary rounded-none hover:bg-primary hover:text-white transition-colors duration-200 mr-1">
                            수정
                          </button>
                          <button className="px-3 py-1 text-xs border border-danger text-danger rounded-none hover:bg-danger hover:text-white transition-colors duration-200">
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="mobile-card-view">
                {[
                  { num: 1, code: 'USER_STATUS_ACTIVE', name: '활성 상태', group: '사용자코드', groupColor: 'bg-info' },
                  { num: 2, code: 'USER_STATUS_INACTIVE', name: '비활성 상태', group: '사용자코드', groupColor: 'bg-info' },
                  { num: 3, code: 'MENU_TYPE_ADMIN', name: '관리자 메뉴', group: '시스템코드', groupColor: 'bg-secondary' },
                  { num: 4, code: 'MENU_TYPE_USER', name: '사용자 메뉴', group: '시스템코드', groupColor: 'bg-secondary' },
                  { num: 5, code: 'COMMON_YES', name: '예', group: '공통코드', groupColor: 'bg-primary' },
                ].map((item) => (
                  <div key={item.num} className="mobile-card">
                    <div className="mobile-card-header">
                      <span className="mobile-card-id">#{item.num} - {item.name}</span>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">코드</span>
                        <span className="mobile-card-value">{item.code}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">그룹</span>
                        <span className="mobile-card-value">
                          <span className={`inline-block px-2 py-1 text-xs font-medium text-white rounded ${getBadgeColor(item.groupColor)}`}>
                            {item.group}
                          </span>
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">사용여부</span>
                        <span className="mobile-card-value">
                          <span className="inline-block px-2 py-1 text-xs font-medium text-white rounded bg-success">사용</span>
                        </span>
                      </div>
                    </div>
                    <div className="mobile-card-footer">
                      <button className="px-3 py-1 text-xs border border-primary text-primary rounded-none hover:bg-primary hover:text-white transition-colors duration-200">
                        수정
                      </button>
                      <button className="px-3 py-1 text-xs border border-danger text-danger rounded-none hover:bg-danger hover:text-white transition-colors duration-200">
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
