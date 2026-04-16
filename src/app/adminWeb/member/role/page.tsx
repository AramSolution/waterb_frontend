'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';
import { SkeletonTable } from '@/shared/ui/adminWeb';

export default function MemberRolePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">권한관리</h1>
        <nav className="text-sm text-gray-600">
          <span>홈</span> / <span>관리자</span> / <span>권한관리</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold m-0">권한 목록</h5>
          <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
            권한 추가
          </button>
        </div>
        <div className="p-0">
          {loading ? (
            <SkeletonTable rows={5} columns={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full mb-0">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">번호</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">권한명</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">권한 코드</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">설명</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">사용자 수</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">관리</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm border-b border-gray-200">1</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">슈퍼 관리자</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">SUPER_ADMIN</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">시스템 전체 관리 권한</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">5명</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">
                      <button className="px-2.5 py-1 text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1">
                        수정
                      </button>
                      <button className="px-2.5 py-1 text-xs text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
                        삭제
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm border-b border-gray-200">2</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">관리자</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">ADMIN</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">콘텐츠 관리 권한</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">15명</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">
                      <button className="px-2.5 py-1 text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1">
                        수정
                      </button>
                      <button className="px-2.5 py-1 text-xs text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
                        삭제
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm border-b border-gray-200">3</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">일반 사용자</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">USER</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">기본 사용자 권한</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">1,214명</td>
                    <td className="px-4 py-3 text-sm border-b border-gray-200">
                      <button className="px-2.5 py-1 text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1">
                        수정
                      </button>
                      <button className="px-2.5 py-1 text-xs text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
                        삭제
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
