'use client';

import React from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';

export default function CodeRegisterPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('코드 등록');
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">코드등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> / <span>코드관리</span> / <span>코드등록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h5 className="text-lg font-semibold m-0">코드 정보 입력</h5>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row mb-4">
              <label className="w-full sm:w-1/6 flex items-center mb-2 sm:mb-0">
                <span className="text-red-600 mr-1">*</span>코드
              </label>
              <div className="w-full sm:w-5/6">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="코드를 입력하세요 (예: USER_STATUS_ACTIVE)"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row mb-4">
              <label className="w-full sm:w-1/6 flex items-center mb-2 sm:mb-0">
                <span className="text-red-600 mr-1">*</span>코드명
              </label>
              <div className="w-full sm:w-5/6">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="코드명을 입력하세요"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row mb-4">
              <label className="w-full sm:w-1/6 flex items-center mb-2 sm:mb-0">
                <span className="text-red-600 mr-1">*</span>그룹
              </label>
              <div className="w-full sm:w-5/6">
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">그룹을 선택하세요</option>
                  <option value="common">공통코드</option>
                  <option value="system">시스템코드</option>
                  <option value="user">사용자코드</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row mb-4">
              <label className="w-full sm:w-1/6 flex items-center mb-2 sm:mb-0">설명</label>
              <div className="w-full sm:w-5/6">
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="코드에 대한 설명을 입력하세요"
                ></textarea>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row mb-4">
              <label className="w-full sm:w-1/6 flex items-center mb-2 sm:mb-0">정렬순서</label>
              <div className="w-full sm:w-5/6">
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={0}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row mb-4">
              <label className="w-full sm:w-1/6 flex items-center mb-2 sm:mb-0">사용여부</label>
              <div className="w-full sm:w-5/6">
                <div className="inline-flex items-center mr-6">
                  <input
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    type="radio"
                    name="useYn"
                    id="useY"
                    value="Y"
                    defaultChecked
                  />
                  <label className="ml-2 cursor-pointer" htmlFor="useY">
                    사용
                  </label>
                </div>
                <div className="inline-flex items-center">
                  <input
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    type="radio"
                    name="useYn"
                    id="useN"
                    value="N"
                  />
                  <label className="ml-2 cursor-pointer" htmlFor="useN">
                    미사용
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row">
              <div className="w-full sm:w-5/6 sm:ml-[16.666667%]">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded mr-2 transition-colors"
                >
                  등록
                </button>
                <button
                  type="button"
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
