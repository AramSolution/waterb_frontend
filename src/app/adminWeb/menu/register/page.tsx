'use client';

import React from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';

export default function MenuRegisterPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('메뉴 등록');
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">메뉴등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> / <span>메뉴관리</span> / <span>메뉴등록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="m-0 text-lg font-semibold">메뉴 정보 입력</h5>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-wrap -mx-3 mb-3">
              <label className="w-full sm:w-2/12 px-3 py-2 flex items-center">
                메뉴명 <span className="text-red-600 ml-1">*</span>
              </label>
              <div className="w-full sm:w-10/12 px-3">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="메뉴명을 입력하세요"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-3">
              <label className="w-full sm:w-2/12 px-3 py-2 flex items-center">
                경로 <span className="text-red-600 ml-1">*</span>
              </label>
              <div className="w-full sm:w-10/12 px-3">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="/path/to/menu"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-3">
              <label className="w-full sm:w-2/12 px-3 py-2 flex items-center">상위 메뉴</label>
              <div className="w-full sm:w-10/12 px-3">
                <select className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">최상위 메뉴</option>
                  <option value="1">회원관리</option>
                  <option value="2">코드관리</option>
                  <option value="3">메뉴관리</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-3">
              <label className="w-full sm:w-2/12 px-3 py-2 flex items-center">아이콘</label>
              <div className="w-full sm:w-10/12 px-3">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="아이콘을 입력하세요 (예: 👥)"
                />
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-3">
              <label className="w-full sm:w-2/12 px-3 py-2 flex items-center">정렬순서</label>
              <div className="w-full sm:w-10/12 px-3">
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  defaultValue={0}
                />
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-3">
              <label className="w-full sm:w-2/12 px-3 py-2 flex items-center">설명</label>
              <div className="w-full sm:w-10/12 px-3">
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  rows={3}
                  placeholder="메뉴에 대한 설명을 입력하세요"
                ></textarea>
              </div>
            </div>

            <div className="flex flex-wrap -mx-3 mb-3">
              <label className="w-full sm:w-2/12 px-3 py-2 flex items-center">사용여부</label>
              <div className="w-full sm:w-10/12 px-3 py-2">
                <div className="inline-flex items-center mr-6">
                  <input
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    type="radio"
                    name="useYn"
                    id="menuUseY"
                    value="Y"
                    defaultChecked
                  />
                  <label className="ml-2 cursor-pointer" htmlFor="menuUseY">
                    사용
                  </label>
                </div>
                <div className="inline-flex items-center">
                  <input
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    type="radio"
                    name="useYn"
                    id="menuUseN"
                    value="N"
                  />
                  <label className="ml-2 cursor-pointer" htmlFor="menuUseN">
                    미사용
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap -mx-3">
              <div className="w-full sm:w-10/12 sm:ml-[16.666667%] px-3">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-2">
                  등록
                </button>
                <button type="button" className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
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
