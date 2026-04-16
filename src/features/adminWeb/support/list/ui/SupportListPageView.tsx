"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pagination, ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormDatePicker } from "@/shared/ui/adminWeb/form";
import { useSupportList } from "../model";
import {
  getRunStaBadgeClass,
  getRunStaLabel,
  RUN_STA_SEARCH_OPTIONS,
} from "@/entities/adminWeb/support/lib/runStaAdmin";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/search-form.css";
import { decodeDisplayText } from "@/shared/lib";

export const SupportListPageView: React.FC = () => {
  const router = useRouter();
  const [showRegisterComingSoon, setShowRegisterComingSoon] = useState(false);
  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    showApplicantDialog,
    applicants,
    applicantLoading,
    supports,
    totalElements,
    totalPages,
    error,
    startDate,
    endDate,
    sortConfig,
    tableRef,
    pageSize,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSort,
    handleSearch,
    handleApplicantClick,
    handleApplicantDialogClose,
    handleExcelDownload,
    setStartDate,
    setEndDate,
    searchStatus,
    setSearchStatus,
  } = useSupportList();

  // 수정 페이지로 이동 (상세 조회 후 수정)
  const handleDetailClick = (businessId: string) => {
    router.push(`/adminWeb/support/list/update?proId=${businessId}`);
  };

  // 신청목록 상세 리스트 페이지로 이동
  const handleApplicantListClick = (businessId: string) => {
    router.push(`/adminWeb/support/list/detail?businessId=${businessId}`);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">샘플업무</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>샘플업무</span>
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

      {/* 검색기간 날짜 필터 (메뉴생성관리 검색구분 스타일 참고) */}
      <div
        className={`bg-white mb-3 rounded-lg shadow search-form-container ${
          showSearchForm ? "show" : ""
        }`}
      >
        <div className="border border-gray-300">
          <div className="flex flex-wrap">
            {/* 검색기간 */}
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch md:border-b-0 md:border-r border-gray-300"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  검색기간
                </label>
                <div
                  className="w-full md:w-3/4 flex items-center gap-2 p-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <FormDatePicker
                      name="recruitStartDate"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                      }}
                      placeholder="시작일"
                      maxDate={endDate ? new Date(endDate) : undefined}
                    />
                  </div>
                  <span className="text-gray-600 flex-shrink-0">~</span>
                  <div className="flex-1 min-w-0">
                    <FormDatePicker
                      name="recruitEndDate"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                      }}
                      placeholder="종료일"
                      minDate={startDate ? new Date(startDate) : undefined}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* 상태 */}
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col md:flex-row items-stretch"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  상태
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2">
                  <select
                    className="w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                    value={searchStatus}
                    onChange={(e) => setSearchStatus(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                  >
                    <option value="">전체</option>
                    {RUN_STA_SEARCH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
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
          onClick={() => {
            // router.push("/adminWeb/support/list/register");
            setShowRegisterComingSoon(true);
          }}
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            샘플업무 목록 (총 {totalElements.toLocaleString()}개)
          </h5>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-[13px] bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExcelDownload}
              disabled={loading}
            >
              {loading ? "⏳ 다운로드 중..." : "📊 엑셀"}
            </button>
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
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr className="border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        번호
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        상태
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        사업ID
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        사업명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        모집대상
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        모집기간
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        모집인원수
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        신청목록
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
                              width: "50px",
                              height: "22px",
                              margin: "0 auto",
                              borderRadius: "4px",
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
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "50px",
                              height: "16px",
                              margin: "0 auto",
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div className="flex justify-center gap-1">
                            <div
                              className="skeleton"
                              style={{
                                width: "60px",
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
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "10%" }} />
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
                        onClick={() => handleSort("status")}
                      >
                        상태
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("businessId")}
                      >
                        사업ID
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("businessNm")}
                      >
                        사업명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("recruitTarget")}
                      >
                        모집대상
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("recruitPeriod")}
                      >
                        모집기간
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("recruitYear")}
                      >
                        모집인원수
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        신청목록
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? "데이터를 불러오는 중..."
                            : "조회된 데이터가 없습니다."}
                        </td>
                      </tr>
                    ) : (
                      supports.map((support, index) => {
                        const actualNum =
                          support.rnum ||
                          String((currentPage - 1) * pageSize + index + 1);
                        const businessId = support.businessId || "";
                        const businessNm = support.businessNm || "";
                        const businessNmDisp = decodeDisplayText(businessNm);
                        const status = support.status || "";
                        const recruitTarget = support.recruitTarget || "";
                        const recruitTargetDisp = decodeDisplayText(recruitTarget);
                        const recruitYear = support.recruitYear || "";
                        const recruitPeriod =
                          support.recruitStartDate && support.recruitEndDate
                            ? `${support.recruitStartDate} ~ ${support.recruitEndDate}`
                            : "";

                        return (
                          <tr
                            key={businessId || index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {actualNum}
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <span
                                className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getRunStaBadgeClass(
                                  status,
                                )}`}
                              >
                                {getRunStaLabel(status)}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {businessId}
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={businessNmDisp || undefined}
                              >
                                {businessNmDisp}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={recruitTargetDisp || undefined}
                              >
                                {recruitTargetDisp}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={recruitPeriod || undefined}
                              >
                                {recruitPeriod}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {recruitYear}
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <button
                                className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                                onClick={() =>
                                  handleApplicantListClick(businessId)
                                }
                              >
                                보기
                              </button>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                                  onClick={() => handleDetailClick(businessId)}
                                >
                                  상세
                                </button>
                                <button
                                  className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                  onClick={() => handleDeleteClick(businessId)}
                                  disabled={deleteLoading}
                                >
                                  삭제
                                </button>
                              </div>
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
                {supports.length === 0 ? (
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
                  supports.map((support, index) => {
                    const actualNum =
                      support.rnum ||
                      String((currentPage - 1) * pageSize + index + 1);
                    const businessId = support.businessId || "";
                    const businessNm = support.businessNm || "";
                    const businessNmDisp = decodeDisplayText(businessNm);
                    const status = support.status || "";
                    const recruitTarget = support.recruitTarget || "";
                    const recruitTargetDisp = decodeDisplayText(recruitTarget);
                    const recruitYear = support.recruitYear || "";
                    const recruitPeriod =
                      support.recruitStartDate && support.recruitEndDate
                        ? `${support.recruitStartDate} ~ ${support.recruitEndDate}`
                        : "";

                    return (
                      <div key={businessId || index} className="mobile-card">
                        <div className="mobile-card-header">
                          <span
                            className="mobile-card-id block truncate min-w-0"
                            title={businessNmDisp || undefined}
                          >
                            #{actualNum} - {businessNmDisp}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">상태</span>
                            <span className="mobile-card-value">
                              <span
                                className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getRunStaBadgeClass(
                                  status,
                                )}`}
                              >
                                {getRunStaLabel(status)}
                              </span>
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">사업ID</span>
                            <span className="mobile-card-value">
                              {businessId}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">모집대상</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={recruitTargetDisp || undefined}
                            >
                              {recruitTargetDisp}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">모집기간</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={recruitPeriod || undefined}
                            >
                              {recruitPeriod}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">모집연수</span>
                            <span className="mobile-card-value">
                              {recruitYear}
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-footer">
                          <button
                            className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() => handleApplicantListClick(businessId)}
                          >
                            보기
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                              onClick={() => handleDetailClick(businessId)}
                            >
                              상세
                            </button>
                            <button
                              className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              onClick={() => handleDeleteClick(businessId)}
                              disabled={deleteLoading}
                            >
                              삭제
                            </button>
                          </div>
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

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="지원사업 삭제"
        message={`해당 지원사업을 삭제하시겠습니까?`}
        confirmText={deleteLoading ? "처리 중..." : "삭제"}
        cancelText="닫기"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* 등록: 목록 → 등록 페이지 이동 대신 안내 (이동 복구 시 router.push 주석 해제) */}
      <ConfirmDialog
        isOpen={showRegisterComingSoon}
        title="알림"
        message="준비중입니다."
        type="primary"
        confirmText="확인"
        cancelText="닫기"
        onConfirm={() => setShowRegisterComingSoon(false)}
        onCancel={() => setShowRegisterComingSoon(false)}
      />

      {/* 신청인 목록 다이얼로그 */}
      {showApplicantDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">신청인 목록</h3>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={handleApplicantDialogClose}
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {applicantLoading ? (
                <div className="text-center py-8 text-gray-500">
                  데이터를 불러오는 중...
                </div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  신청인이 없습니다.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border text-center text-[13px] font-bold">
                        번호
                      </th>
                      <th className="px-4 py-2 border text-center text-[13px] font-bold">
                        신청인명
                      </th>
                      <th className="px-4 py-2 border text-center text-[13px] font-bold">
                        이메일
                      </th>
                      <th className="px-4 py-2 border text-center text-[13px] font-bold">
                        전화번호
                      </th>
                      <th className="px-4 py-2 border text-center text-[13px] font-bold">
                        신청일
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((applicant, index) => (
                      <tr key={applicant.applicantId || index}>
                        <td className="px-4 py-2 border text-center text-[13px]">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 border text-center text-[13px]">
                          {applicant.applicantNm || ""}
                        </td>
                        <td className="px-4 py-2 border text-center text-[13px]">
                          {applicant.applicantEmail || ""}
                        </td>
                        <td className="px-4 py-2 border text-center text-[13px]">
                          {applicant.applicantPhone || ""}
                        </td>
                        <td className="px-4 py-2 border text-center text-[13px]">
                          {applicant.applyDate || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-[13px]"
                onClick={handleApplicantDialogClose}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
