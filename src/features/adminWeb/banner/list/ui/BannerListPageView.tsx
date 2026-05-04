"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Pagination, ConfirmDialog } from "@/shared/ui/adminWeb";
import { formatBannerPostingPeriod } from "@/entities/adminWeb/banner/lib/formatBannerPeriod";
import { useBannerList } from "../model";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/search-form.css";

export const BannerListPageView: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    banners,
    totalElements,
    totalPages,
    error,
    tableRef,
    searchCondition,
    searchKeyword,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSearch,
    setSearchCondition,
    setSearchKeyword,
    handleDetailClick,
  } = useBannerList();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">배너관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt; <span>배너관리</span>
        </nav>
      </div>

      {error && (
        <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-lg">
          {error}
        </div>
      )}

      <div className="md:hidden mb-2">
        <button
          type="button"
          className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-[13px]"
          onClick={() => setShowSearchForm(!showSearchForm)}
        >
          {showSearchForm ? "▲ 검색구분 닫기" : "▼ 검색구분 열기"}
        </button>
      </div>

      <div
        className={`bg-white mb-3 rounded-lg shadow search-form-container ${
          showSearchForm ? "show" : ""
        }`}
      >
        <div className="border border-gray-300">
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                  검색구분
                </label>
                <div className="w-full md:w-3/4 flex p-2 md:border-r border-gray-300">
                  <select
                    className="w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchCondition}
                    onChange={(e) => setSearchCondition(e.target.value)}
                  >
                    <option value="title">제목</option>
                    <option value="body">내용</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-3 gap-2">
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
          style={{ minWidth: "100px" }}
          onClick={handleSearch}
        >
          🔍 조회
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
          style={{ minWidth: "100px" }}
          onClick={() => router.push("/adminWeb/banner/list/register")}
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            배너 목록 (총 {totalElements.toLocaleString()}개)
          </h5>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto hidden md:block">
            <table
              ref={tableRef}
              className="w-full mb-0"
              style={{ tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead className="bg-gray-100">
                <tr className="border-t border-b-2">
                  <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                    번호
                  </th>
                  <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                    제목
                  </th>
                  <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                    게시기간
                  </th>
                  <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                    이미지
                  </th>
                  <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                    정렬순서
                  </th>
                  <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && isInitialLoad ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      데이터를 불러오는 중...
                    </td>
                  </tr>
                ) : banners.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      조회된 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  banners.map((row, index) => {
                    const period = formatBannerPostingPeriod(row);
                    return (
                      <tr
                        key={row.bannerId || index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                          {row.rnum}
                        </td>
                        <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                          <span
                            className="block truncate min-w-0"
                            title={row.title}
                          >
                            {row.title}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                          <span className="block truncate" title={period}>
                            {period}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-r text-center align-middle">
                          {row.imageUrl?.trim() ? (
                            <a
                              href={row.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="새 창에서 이미지 보기"
                              aria-label="새 창에서 이미지 보기"
                              className="inline-block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={row.imageUrl}
                                alt=""
                                className="max-h-10 mx-auto object-contain cursor-pointer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-[12px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                          {row.sortOrder}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1"
                            onClick={() => handleDetailClick(row.bannerId)}
                          >
                            상세
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteClick(row.bannerId)}
                            disabled={loading}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-card-view md:hidden">
            {loading && isInitialLoad ? (
              <div className="mobile-card">
                <div className="mobile-card-body">
                  <div className="text-center text-gray-500 py-8">
                    데이터를 불러오는 중...
                  </div>
                </div>
              </div>
            ) : banners.length === 0 ? (
              <div className="mobile-card">
                <div className="mobile-card-body">
                  <div className="text-center text-gray-500 py-8">
                    조회된 데이터가 없습니다.
                  </div>
                </div>
              </div>
            ) : (
              banners.map((row, index) => {
                const period = formatBannerPostingPeriod(row);
                return (
                  <div key={row.bannerId || index} className="mobile-card">
                    <div className="mobile-card-header">
                      <span
                        className="mobile-card-id block truncate min-w-0"
                        title={row.title}
                      >
                        #{row.rnum} - {row.title}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">게시기간</span>
                        <span className="mobile-card-value">{period}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">정렬순서</span>
                        <span className="mobile-card-value">
                          {row.sortOrder}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">이미지</span>
                        <span className="mobile-card-value">
                          {row.imageUrl?.trim() ? (
                            <a
                              href={row.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="새 창에서 이미지 보기"
                              aria-label="새 창에서 이미지 보기"
                              className="inline-block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={row.imageUrl}
                                alt=""
                                className="max-h-12 object-contain cursor-pointer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="mobile-card-footer">
                      <button
                        type="button"
                        className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                        onClick={() => handleDetailClick(row.bannerId)}
                      >
                        상세
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                        onClick={() => handleDeleteClick(row.bannerId)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        {totalElements > 0 ? (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="배너 삭제"
        message="해당 배너를 삭제하시겠습니까?"
        confirmText={deleteLoading ? "처리 중..." : "삭제"}
        type="danger"
        disabled={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};
