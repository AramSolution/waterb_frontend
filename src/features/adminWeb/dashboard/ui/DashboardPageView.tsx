"use client";

import React from "react";
import { SkeletonCard, SkeletonTable } from "@/shared/ui/adminWeb";
import { useDashboard } from "../model";

export const DashboardPageView: React.FC = () => {
  const { loading } = useDashboard();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">대시보드</h1>
        <nav className="breadcrumb">
          <span>홈</span> / <span>대시보드</span>
        </nav>
      </div>

      <div className="flex flex-wrap mb-4">
        <div className="w-full md:w-1/4 mb-3 px-2">
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h6 className="text-sm mb-2 text-gray-600">전체 회원</h6>
                <h2 className="text-2xl font-semibold">1,234</h2>
                <p className="text-green-600 mb-0">
                  <small>▲ 12% 전월 대비</small>
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="w-full md:w-1/4 mb-3 px-2">
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h6 className="text-sm mb-2 text-gray-600">금일 가입</h6>
                <h2 className="text-2xl font-semibold">45</h2>
                <p className="text-green-600 mb-0">
                  <small>▲ 8% 전일 대비</small>
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="w-full md:w-1/4 mb-3 px-2">
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h6 className="text-sm mb-2 text-gray-600">코드 수</h6>
                <h2 className="text-2xl font-semibold">89</h2>
                <p className="text-gray-600 mb-0">
                  <small>변동 없음</small>
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="w-full md:w-1/4 mb-3 px-2">
          {loading ? (
            <SkeletonCard />
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h6 className="text-sm mb-2 text-gray-600">메뉴 수</h6>
                <h2 className="text-2xl font-semibold">23</h2>
                <p className="text-gray-600 mb-0">
                  <small>변동 없음</small>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h5 className="mb-0 text-lg font-semibold">최근 가입 회원</h5>
        </div>
        <div className="p-0">
          {loading ? (
            <SkeletonTable rows={5} columns={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full mb-0">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">번호</th>
                    <th className="px-4 py-3 text-left">아이디</th>
                    <th className="px-4 py-3 text-left">이름</th>
                    <th className="px-4 py-3 text-left">가입일</th>
                    <th className="px-4 py-3 text-left">상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-3">1</td>
                    <td className="px-4 py-3">user001</td>
                    <td className="px-4 py-3">홍길동</td>
                    <td className="px-4 py-3">2025-12-09</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
                        활성
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-3">2</td>
                    <td className="px-4 py-3">user002</td>
                    <td className="px-4 py-3">김철수</td>
                    <td className="px-4 py-3">2025-12-09</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
                        활성
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-3">3</td>
                    <td className="px-4 py-3">user003</td>
                    <td className="px-4 py-3">이영희</td>
                    <td className="px-4 py-3">2025-12-08</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
                        활성
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-3">4</td>
                    <td className="px-4 py-3">user004</td>
                    <td className="px-4 py-3">박민수</td>
                    <td className="px-4 py-3">2025-12-08</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-yellow-500 text-white">
                        대기
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-3">5</td>
                    <td className="px-4 py-3">user005</td>
                    <td className="px-4 py-3">최지영</td>
                    <td className="px-4 py-3">2025-12-07</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-green-600 text-white">
                        활성
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
