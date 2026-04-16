'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';
import { SkeletonTable } from '@/shared/ui/adminWeb';
import '@/shared/styles/admin/mobile-table.css';

export default function MenuListPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">메뉴목록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>메뉴관리</span> &gt; <span>메뉴목록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow mb-3">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="메뉴명 검색"
              />
            </div>
            <div className="md:col-span-2">
              <select className="w-full px-3 py-2 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">전체 레벨</option>
                <option value="1">1단계</option>
                <option value="2">2단계</option>
                <option value="3">3단계</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                검색
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h5 className="text-lg font-semibold mb-0">메뉴 목록 (총 23개)</h5>
          <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-none hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            메뉴 등록
          </button>
        </div>
        <div className="p-0">
          {loading ? (
            <SkeletonTable rows={8} columns={7} />
          ) : (
            <>
              {/* 데스크톱 테이블 뷰 */}
              <div className="table-responsive">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">번호</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">메뉴명</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">경로</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">레벨</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">순서</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">사용여부</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { num: 1, name: '회원관리', path: '/member', level: '1단계', levelColor: 'bg-blue-600', order: 1, sub: false },
                      { num: 2, name: 'ㄴ 회원목록', path: '/member/list', level: '2단계', levelColor: 'bg-gray-600', order: 1, sub: true },
                      { num: 3, name: 'ㄴ 회원등록', path: '/member/register', level: '2단계', levelColor: 'bg-gray-600', order: 2, sub: true },
                      { num: 4, name: 'ㄴ 권한관리', path: '/member/role', level: '2단계', levelColor: 'bg-gray-600', order: 3, sub: true },
                      { num: 5, name: '코드관리', path: '/code', level: '1단계', levelColor: 'bg-blue-600', order: 2, sub: false },
                      { num: 6, name: 'ㄴ 코드목록', path: '/code/list', level: '2단계', levelColor: 'bg-gray-600', order: 1, sub: true },
                    ].map((item) => (
                      <tr key={item.num} className={`border-b border-gray-200 hover:bg-gray-50 ${item.sub ? 'bg-gray-50' : ''}`}>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.num}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.path}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold text-white rounded ${item.levelColor}`}>
                            {item.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.order}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded">
                            사용
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button className="px-3 py-1 text-xs text-blue-600 border border-blue-600 rounded-none hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-1">
                            수정
                          </button>
                          <button className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded-none hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">
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
                  { num: 1, name: '회원관리', path: '/member', level: '1단계', levelColor: 'bg-blue-600', order: 1 },
                  { num: 2, name: 'ㄴ 회원목록', path: '/member/list', level: '2단계', levelColor: 'bg-gray-600', order: 1 },
                  { num: 3, name: 'ㄴ 회원등록', path: '/member/register', level: '2단계', levelColor: 'bg-gray-600', order: 2 },
                  { num: 4, name: 'ㄴ 권한관리', path: '/member/role', level: '2단계', levelColor: 'bg-gray-600', order: 3 },
                  { num: 5, name: '코드관리', path: '/code', level: '1단계', levelColor: 'bg-blue-600', order: 2 },
                  { num: 6, name: 'ㄴ 코드목록', path: '/code/list', level: '2단계', levelColor: 'bg-gray-600', order: 1 },
                ].map((item) => (
                  <div key={item.num} className="mobile-card">
                    <div className="mobile-card-header">
                      <span className="mobile-card-id">#{item.num} - {item.name}</span>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">경로</span>
                        <span className="mobile-card-value">{item.path}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">레벨</span>
                        <span className="mobile-card-value">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold text-white rounded ${item.levelColor}`}>
                            {item.level}
                          </span>
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">순서</span>
                        <span className="mobile-card-value">{item.order}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">사용여부</span>
                        <span className="mobile-card-value">
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded">
                            사용
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="mobile-card-footer">
                      <button className="px-3 py-1 text-xs text-blue-600 border border-blue-600 rounded-none hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        수정
                      </button>
                      <button className="px-3 py-1 text-xs text-red-600 border border-red-600 rounded-none hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500">
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
