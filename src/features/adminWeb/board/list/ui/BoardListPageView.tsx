"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AdminExcelDownloadButton,
  ConfirmDialog,
  Pagination,
} from "@/shared/ui/adminWeb";
import { useBoardList } from "../model";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/table-filter.css";
import "@/shared/styles/admin/search-form.css";

export const BoardListPageView: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    boards,
    totalElements,
    totalPages,
    error,
    sortConfig,
    tableRef,
    pageSize,
    targetList,
    targetGbn,
    searchCondition,
    searchKeyword,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSort,
    handleSearch,
    handleExcelDownload,
    setTargetGbn,
    setSearchCondition,
    setSearchKeyword,
  } = useBoardList();

  // 상세 페이지로 이동 (쿼리 파라미터 방식, 상태를 URL 파라미터로 전달)
  const handleDetailClick = (bbsId: string) => {
    const params = new URLSearchParams({
      bbsid: bbsId,
      searchCondition: searchCondition || "1",
      searchKeyword: searchKeyword || "",
      targetGbn: targetGbn || "",
      page: currentPage.toString(),
    });
    router.push(`/adminWeb/board/list/detail?${params.toString()}`);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">게시판관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt; <span>게시판관리</span>
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
                <div className="w-full md:w-3/4 flex p-2 md:border-r border-gray-300">
                  <select
                    className="w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchCondition}
                    onChange={(e) => setSearchCondition(e.target.value)}
                  >
                    <option value="1">게시판명</option>
                    <option value="2">게시판설명</option>
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
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  대상구분
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2 md:border-b-0 border-gray-300">
                  <select
                    className="flex-1 border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={targetGbn}
                    onChange={(e) => setTargetGbn(e.target.value)}
                  >
                    {targetList.map((target) => (
                      <option key={target.code} value={target.code}>
                        {target.codeNm}
                      </option>
                    ))}
                  </select>
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
          onClick={() => router.push("/adminWeb/board/list/register")}
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            게시판 목록 (총 {totalElements.toLocaleString()}개)
          </h5>
          <div className="flex gap-2">
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
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "23%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr className="border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        번호
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        게시판명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        게시판설명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        게시판유형
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        상태
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        보기
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
                              width: "80px",
                              height: "16px",
                              margin: "0 auto",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "50px",
                              height: "22px",
                              margin: "0 auto",
                              borderRadius: "4px",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div className="flex justify-center gap-1">
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
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "23%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
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
                        onClick={() => handleSort("bbsNm")}
                      >
                        게시판명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("bbsDe")}
                      >
                        게시판설명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("bbsSeNm")}
                      >
                        게시판유형
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("sttusCode")}
                      >
                        상태
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        보기
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {boards.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? "데이터를 불러오는 중..."
                            : "조회된 데이터가 없습니다."}
                        </td>
                      </tr>
                    ) : (
                      boards.map((board, index) => {
                        const actualNum = board.rnum || String((currentPage - 1) * pageSize + index + 1);
                        const bbsId = board.bbsId || "";
                        const bbsNm = board.bbsNm || "";
                        const bbsDe = board.bbsDe || "";
                        const bbsSeNm = board.bbsSeNm || "";
                        const sttusCode = board.sttusCode || "";

                        const getStatusLabel = (statusCode: string) => {
                          switch (statusCode) {
                            case "A":
                              return "사용";
                            case "D":
                              return "삭제";
                            default:
                              return "-";
                          }
                        };

                        const getStatusClass = (statusCode: string) => {
                          switch (statusCode) {
                            case "A":
                              return "bg-green-100 text-green-800";
                            case "D":
                              return "bg-red-100 text-red-800";
                            default:
                              return "bg-gray-100 text-gray-800";
                          }
                        };

                        return (
                          <tr
                            key={board.bbsId || index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {actualNum}
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={bbsNm || undefined}
                              >
                                {bbsNm}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={bbsDe || undefined}
                              >
                                {bbsDe}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {bbsSeNm}
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                  sttusCode
                                )}`}
                              >
                                {getStatusLabel(sttusCode)}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <button
                                className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    bbsId: bbsId,
                                    bbsNm: bbsNm,
                                  });
                                  router.push(
                                    `/adminWeb/board/list/article/list?${params.toString()}`
                                  );
                                }}
                              >
                                보기
                              </button>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1"
                                onClick={() => handleDetailClick(bbsId)}
                              >
                                상세
                              </button>
                              <button
                                className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleDeleteClick(bbsId)}
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
                {boards.length === 0 ? (
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
                  boards.map((board, index) => {
                    const actualNum = board.rnum || String((currentPage - 1) * pageSize + index + 1);
                    const bbsId = board.bbsId || "";
                    const bbsNm = board.bbsNm || "";
                    const bbsDe = board.bbsDe || "";
                    const bbsSeNm = board.bbsSeNm || "";
                    const sttusCode = board.sttusCode || "";

                    const getStatusLabel = (statusCode: string) => {
                      switch (statusCode) {
                        case "A":
                          return "정상";
                        case "D":
                          return "삭제";
                        default:
                          return "전체";
                      }
                    };

                    const getStatusClass = (statusCode: string) => {
                      switch (statusCode) {
                        case "A":
                          return "bg-green-100 text-green-800";
                        case "D":
                          return "bg-red-100 text-red-800";
                        default:
                          return "bg-gray-100 text-gray-800";
                      }
                    };

                    return (
                      <div key={board.bbsId || index} className="mobile-card">
                        <div className="mobile-card-header">
                          <span
                            className="mobile-card-id block truncate min-w-0"
                            title={bbsNm || undefined}
                          >
                            #{actualNum} - {bbsNm}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">
                              게시판설명
                            </span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={bbsDe || undefined}
                            >
                              {bbsDe}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">
                              게시판유형
                            </span>
                            <span className="mobile-card-value">{bbsSeNm}</span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">상태</span>
                            <span className="mobile-card-value">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                                  sttusCode
                                )}`}
                              >
                                {getStatusLabel(sttusCode)}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-footer">
                          <button
                            className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() => {
                              const params = new URLSearchParams({
                                bbsId: bbsId,
                                bbsNm: bbsNm,
                              });
                              router.push(
                                `/adminWeb/board/list/article/list?${params.toString()}`
                              );
                            }}
                          >
                            보기
                          </button>
                          <button
                            className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() => handleDetailClick(bbsId)}
                          >
                            상세
                          </button>
                          <button
                            className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteClick(bbsId)}
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
        title="게시판 삭제"
        message={`해당 게시판을 삭제하시겠습니까?`}
        confirmText={deleteLoading ? "처리 중..." : "삭제"}
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};
