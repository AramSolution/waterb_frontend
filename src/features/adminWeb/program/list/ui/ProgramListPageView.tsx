"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AdminExcelDownloadButton,
  ConfirmDialog,
  Pagination,
} from "@/shared/ui/adminWeb";
import { useProgramList } from "../model";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/table-filter.css";
import "@/shared/styles/admin/search-form.css";

export const ProgramListPageView: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showFilters,
    showSearchForm,
    programs,
    totalElements,
    totalPages,
    error,
    filters,
    sortConfig,
    tableRef,
    pageSize,
    searchCondition,
    searchKeyword,
    setShowFilters,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleFilterChange,
    handleClearFilters,
    handleSort,
    handleSearch,
    handleExcelDownload,
    setSearchCondition,
    setSearchKeyword,
  } = useProgramList();

  // 상세 페이지로 이동 (쿼리 파라미터 방식, 상태를 URL 파라미터로 전달)
  const handleDetailClick = (progrmFileNm: string) => {
    const params = new URLSearchParams({
      progrmFileNm: progrmFileNm,
      searchCondition: searchCondition || "3",
      searchKeyword: searchKeyword || "",
      page: currentPage.toString(),
    });
    router.push(`/adminWeb/program/list/detail?${params.toString()}`);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">프로그램관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>시스템</span> &gt;{" "}
          <span>프로그램관리</span>
        </nav>
      </div>

      {/* 모바일 조회조건 토글 버튼 */}
      <div className="md:hidden mb-2">
        <button
          className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-[13px]"
          onClick={() => setShowSearchForm(!showSearchForm)}
        >
          {showSearchForm ? "▲ 조회조건 닫기" : "▼ 조회조건 열기"}
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
                <div className="w-full md:w-3/4 flex p-2">
                  <select
                    className="input w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="searchCondition"
                    name="searchCondition"
                    value={searchCondition}
                    onChange={(e) => setSearchCondition(e.target.value)}
                  >
                    <option value="3">프로그램(한글명)</option>
                    <option value="1">프로그램(영문명)</option>
                    <option value="5">프로그램설명</option>
                    <option value="2">저장경로</option>
                    <option value="4">URL</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={(e) => {
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
          style={{ minWidth: "100px" }}
          onClick={handleSearch}
        >
          🔍 조회
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
          style={{ minWidth: "100px" }}
          onClick={() => router.push("/adminWeb/program/list/register")}
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            프로그램 목록 (총 {totalElements.toLocaleString()}개)
          </h5>
          <div className="flex gap-2">
            {showFilters && (
              <button
                className="px-3 py-1 text-[13px] bg-white text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                onClick={handleClearFilters}
              >
                ✕ 초기화
              </button>
            )}
            <button
              className={`px-3 py-1 text-[13px] rounded transition-colors ${
                showFilters
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "🔽" : "🔼"} 필터
            </button>
            <AdminExcelDownloadButton
              onClick={handleExcelDownload}
              loading={loading}
            />
          </div>
        </div>
        <div className="p-0">
          {loading && isInitialLoad ? (
            <>
              {/* 데스크톱 스켈레톤 테이블 */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full mb-0" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr className="border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        번호
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        프로그램명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        저장경로
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        한글명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        URL
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "30px",
                              height: "16px",
                              margin: "0 auto",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "100px",
                              height: "16px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "150px",
                              height: "16px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "100px",
                              height: "16px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "150px",
                              height: "16px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <div
                              className="skeleton"
                              style={{
                                width: "45px",
                                height: "28px",
                                borderRadius: "4px",
                              }}
                            ></div>
                            <div
                              className="skeleton"
                              style={{
                                width: "45px",
                                height: "28px",
                                borderRadius: "4px",
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* 데스크톱 테이블 뷰 */}
              <div className="overflow-x-auto hidden md:block">
                <table
                  ref={tableRef}
                  className="w-full mb-0"
                  style={{ tableLayout: "fixed" }}
                >
                  <colgroup>
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr className="border-t border-b-2">
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("number")}
                      >
                        번호
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("progrmFileNm")}
                      >
                        프로그램명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("progrmStrePath")}
                      >
                        저장경로
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("progrmKoreanNm")}
                      >
                        한글명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("url")}
                      >
                        URL
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                    {showFilters && (
                      <tr className="table-filter-row bg-gray-50">
                        <th className="px-4 py-2 border-r"></th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="text"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="프로그램명 검색"
                            value={filters.progrmFileNm}
                            onChange={(e) =>
                              handleFilterChange("progrmFileNm", e.target.value)
                            }
                          />
                        </th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="text"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="저장경로 검색"
                            value={filters.progrmStrePath}
                            onChange={(e) =>
                              handleFilterChange(
                                "progrmStrePath",
                                e.target.value
                              )
                            }
                          />
                        </th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="text"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="한글명 검색"
                            value={filters.progrmKoreanNm}
                            onChange={(e) =>
                              handleFilterChange(
                                "progrmKoreanNm",
                                e.target.value
                              )
                            }
                          />
                        </th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="text"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="URL 검색"
                            value={filters.url}
                            onChange={(e) =>
                              handleFilterChange("url", e.target.value)
                            }
                          />
                        </th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {programs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? "데이터를 불러오는 중..."
                            : "조회된 데이터가 없습니다."}
                        </td>
                      </tr>
                    ) : (
                      programs.map((program, index) => {
                        const actualNum = program.rnum ? String(program.rnum) : String((currentPage - 1) * pageSize + index + 1);
                        const progrmFileNm = program.progrmFileNm || "";
                        const progrmStrePath = program.progrmStrePath || "";
                        const progrmKoreanNm = program.progrmKoreanNm || "";
                        const url = program.url || "";

                        return (
                          <tr
                            key={program.progrmFileNm || index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {actualNum}
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={progrmFileNm || undefined}
                              >
                                {progrmFileNm}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={progrmStrePath || undefined}
                              >
                                {progrmStrePath}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={progrmKoreanNm || undefined}
                              >
                                {progrmKoreanNm}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={url || undefined}
                              >
                                {url}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1"
                                onClick={() => handleDetailClick(progrmFileNm)}
                              >
                                상세
                              </button>
                              <button
                                className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleDeleteClick(progrmFileNm)}
                                disabled={deleteLoading}
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

              {/* 모바일 카드 뷰 */}
              <div className="mobile-card-view md:hidden">
                {programs.length === 0 ? (
                  <div className="mobile-card">
                    <div className="mobile-card-body">
                      <div className="text-center text-gray-500 py-8">
                        {loading
                          ? "데이터를 불러오는 중..."
                          : "조회된 데이터가 없습니다."}
                      </div>
                    </div>
                  </div>
                ) : (
                  programs.map((program, index) => {
                    const actualNum = program.rnum ? String(program.rnum) : String((currentPage - 1) * pageSize + index + 1);
                    const progrmFileNm = program.progrmFileNm || "";
                    const progrmStrePath = program.progrmStrePath || "";
                    const progrmKoreanNm = program.progrmKoreanNm || "";
                    const url = program.url || "";

                    return (
                      <div
                        key={program.progrmFileNm || index}
                        className="mobile-card"
                      >
                        <div className="mobile-card-header">
                          <span
                            className="mobile-card-id block truncate min-w-0"
                            title={progrmFileNm || undefined}
                          >
                            #{actualNum} - {progrmFileNm}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">저장경로</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={progrmStrePath || undefined}
                            >
                              {progrmStrePath}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">한글명</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={progrmKoreanNm || undefined}
                            >
                              {progrmKoreanNm}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">URL</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={url || undefined}
                            >
                              {url}
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-footer">
                          <button
                            className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() => handleDetailClick(progrmFileNm)}
                          >
                            상세
                          </button>
                          <button
                            className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteClick(progrmFileNm)}
                            disabled={deleteLoading}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="프로그램 삭제"
        message={`해당 프로그램을 삭제하시겠습니까?`}
        confirmText={deleteLoading ? "처리 중..." : "삭제"}
        type="danger"
        useDeleteHeader
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};
