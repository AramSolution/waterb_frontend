'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';
import { SkeletonTable } from '@/shared/ui/adminWeb';

export default function CodeGroupPage() {
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
        <h1 className="page-title">코드그룹</h1>
        <nav className="breadcrumb">
          <span>홈</span> / <span>코드관리</span> / <span>코드그룹</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">코드 그룹 목록</h5>
          <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
            그룹 추가
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
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">번호</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">그룹코드</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">그룹명</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">코드 수</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-900">1</td>
                    <td className="px-6 py-3 text-sm text-gray-900">common</td>
                    <td className="px-6 py-3 text-sm text-gray-900">공통코드</td>
                    <td className="px-6 py-3 text-sm text-gray-900">25개</td>
                    <td className="px-6 py-3 text-sm">
                      <button className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1">
                        수정
                      </button>
                      <button className="px-3 py-1 text-sm font-medium text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
                        삭제
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-900">2</td>
                    <td className="px-6 py-3 text-sm text-gray-900">system</td>
                    <td className="px-6 py-3 text-sm text-gray-900">시스템코드</td>
                    <td className="px-6 py-3 text-sm text-gray-900">42개</td>
                    <td className="px-6 py-3 text-sm">
                      <button className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1">
                        수정
                      </button>
                      <button className="px-3 py-1 text-sm font-medium text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
                        삭제
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-900">3</td>
                    <td className="px-6 py-3 text-sm text-gray-900">user</td>
                    <td className="px-6 py-3 text-sm text-gray-900">사용자코드</td>
                    <td className="px-6 py-3 text-sm text-gray-900">22개</td>
                    <td className="px-6 py-3 text-sm">
                      <button className="px-3 py-1 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1">
                        수정
                      </button>
                      <button className="px-3 py-1 text-sm font-medium text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors">
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
