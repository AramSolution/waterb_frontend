"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pagination, ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormDatePicker } from "@/shared/ui/adminWeb/form";
import { useSupportList } from "../model";
import type { Support } from "@/entities/adminWeb/support/api";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/search-form.css";
import { decodeDisplayText } from "@/shared/lib";

/** 백엔드 연동 전: paySta 등으로 미납/납부 표시 (02·Y·납부 → 납부) */
function isPaidFeeRow(row: Support): boolean {
  const rowAny = row as Record<string, unknown>;
  const v = String(
    rowAny.paySta ?? rowAny.paymentSta ?? rowAny.feePayYn ?? "",
  ).trim();
  if (v === "02" || v === "2" || v === "Y" || v === "납부") return true;
  return false;
}

function formatFeeCurrency(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(String(v).replace(/,/g, ""));
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("ko-KR");
}

function feeListRowFields(row: Support, index: number, page: number, ps: number) {
  const rowAny = row as Record<string, unknown>;
  const seq = row.rnum ?? String((page - 1) * ps + index + 1);
  const paid = isPaidFeeRow(row);
  const name = decodeDisplayText(
    String(rowAny.applicantNm ?? row.businessNm ?? ""),
  );
  const addr = decodeDisplayText(
    String(rowAny.addr ?? rowAny.address ?? ""),
  );
  const notify = String(rowAny.notifyDd ?? row.recruitStartDate ?? "").trim();
  const levyRaw = rowAny.levyAmt ?? rowAny.impAmt;
  const payDd = String(rowAny.payDd ?? rowAny.paymentDd ?? "").trim();
  const payAmtRaw = rowAny.payAmt ?? rowAny.paymentAmt;
  const rowKey = String(row.businessId ?? row.proId ?? `row-${index}`);
  return { seq, paid, name, addr, notify, levyRaw, payDd, payAmtRaw, rowKey };
}

/**
 * 미납·납부 배지 색 (list-pagination / UI 톤)
 * - 미납: 배경 #FFE5E5, 글자 #D32F2F — 경고는 주되 부드러움
 * - 납부: 배경 #E8F5E9, 글자 #2E7D32 — 안정적이고 깔끔함
 * (min-w·rounded·font-medium 등 표시 규격은 리스트 가이드와 호출부 span에 맞춤)
 */
function feePayBadgeClassName(paid: boolean): string {
  return paid
    ? "bg-[#E8F5E9] text-[#2E7D32] font-medium border border-[#C8E6C9]"
    : "bg-[#FFE5E5] text-[#D32F2F] font-medium border border-[#FFCDD2]";
}

export const SupportListPageView: React.FC = () => {
  const router = useRouter();
  const [showPaymentHistoryComingSoon, setShowPaymentHistoryComingSoon] =
    useState(false);
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
    tableRef,
    pageSize,
    setShowSearchForm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSearch,
    handleApplicantClick,
    handleApplicantDialogClose,
    handleExcelDownload,
    setStartDate,
    setEndDate,
    applicantNm,
    setApplicantNm,
    addr,
    setAddr,
  } = useSupportList();

  // 수정 페이지로 이동 (상세 조회 후 수정)
  const handleDetailClick = (businessId: string) => {
    router.push(`/adminWeb/support/list/update?proId=${businessId}`);
  };

  const handlePaymentHistoryClick = (_rowKey: string) => {
    setShowPaymentHistoryComingSoon(true);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">오수 원인자부담금 관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>오수 원인자부담금 관리</span>
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

      {/* 통지일·성명·주소 조회 (백엔드 연동 전 화면 전용) */}
      <div
        className={`bg-white mb-3 rounded-lg shadow search-form-container ${
          showSearchForm ? "show" : ""
        }`}
      >
        <div className="border border-gray-300">
          <div
            className="flex flex-wrap"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          >
            {/* 1행: 통지일 | 성명 */}
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch md:border-r border-gray-300"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  통지일
                </label>
                <div className="w-full md:w-3/4 flex items-center gap-2 p-2 flex-wrap">
                  <div className="flex-1 min-w-[120px]">
                    <FormDatePicker
                      name="notifyStartDate"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                      }}
                      placeholder="시작일"
                      maxDate={endDate ? new Date(endDate) : undefined}
                    />
                  </div>
                  <span className="text-gray-600 flex-shrink-0">~</span>
                  <div className="flex-1 min-w-[120px]">
                    <FormDatePicker
                      name="notifyEndDate"
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
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch border-gray-300"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  성명
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2">
                  <input
                    type="text"
                    name="applicantNm"
                    value={applicantNm}
                    onChange={(e) => setApplicantNm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="성명 입력"
                    className="w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            {/* 2행: 주소 (라벨 너비 = 1행 통지일·성명과 동일: 전체의 12.5% = 절반×1/4) */}
            <div className="w-full">
              <div
                className="flex flex-col md:flex-row items-stretch border-gray-300"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-[12.5%] shrink-0 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  주소
                </label>
                <div className="w-full md:flex-1 min-w-0 flex items-center p-2">
                  <input
                    type="text"
                    name="addr"
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="주소 입력"
                    className="w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                    autoComplete="off"
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
          type="button"
          onClick={() => router.push("/adminWeb/support/list/register")}
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            오수 원인자부담금 관리 목록 (총 {totalElements.toLocaleString()}개)
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
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full mb-0" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "18%" }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr className="border-b-2">
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        순번
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        상태
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        성명
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        주소
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        통지일
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        부과액
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        납부일
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        납부액
                      </th>
                      <th className="px-3 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton mx-auto"
                            style={{ width: "28px", height: "14px" }}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton mx-auto rounded-[5px]"
                            style={{ width: "56px", height: "22px" }}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{ width: "72px", height: "14px" }}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{ width: "90%", height: "14px" }}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton mx-auto"
                            style={{ width: "88px", height: "14px" }}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton mx-auto"
                            style={{ width: "64px", height: "14px" }}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton mx-auto"
                            style={{ width: "88px", height: "14px" }}
                          />
                        </td>
                        <td className="px-3 py-3 border-r">
                          <div
                            className="skeleton mx-auto"
                            style={{ width: "64px", height: "14px" }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center flex-wrap gap-1">
                            <div
                              className="skeleton rounded"
                              style={{ width: "64px", height: "26px" }}
                            />
                            <div
                              className="skeleton rounded"
                              style={{ width: "44px", height: "26px" }}
                            />
                            <div
                              className="skeleton rounded"
                              style={{ width: "44px", height: "26px" }}
                            />
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
              <div className="overflow-x-auto hidden md:block">
                <table
                  ref={tableRef}
                  className="w-full mb-0"
                  style={{ tableLayout: "fixed" }}
                >
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "18%" }} />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr className="border-t border-b-2">
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        순번
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        상태
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        성명
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        주소
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        통지일
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        부과액
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        납부일
                      </th>
                      <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        납부액
                      </th>
                      <th className="px-3 py-3 text-center text-[13px] font-bold text-gray-700">
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
                        const f = feeListRowFields(
                          support,
                          index,
                          currentPage,
                          pageSize,
                        );
                        const businessId = support.businessId || "";
                        const payLabel = f.paid ? "납부" : "미납";
                        const payBadgeClass = feePayBadgeClassName(f.paid);
                        const levyDisp = formatFeeCurrency(f.levyRaw);
                        const payAmtDisp = formatFeeCurrency(f.payAmtRaw);
                        const notifyDisp = f.notify || "-";
                        const payDdDisp = f.payDd || "-";

                        return (
                          <tr
                            key={f.rowKey}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {f.seq}
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <span
                                className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] ${payBadgeClass}`}
                              >
                                {payLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 min-w-0 overflow-hidden align-middle">
                              <span
                                className="block min-w-0 truncate"
                                title={
                                  f.name && f.name !== "-"
                                    ? f.name
                                    : undefined
                                }
                              >
                                {f.name || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 min-w-0 overflow-hidden align-middle">
                              <span
                                className="block min-w-0 truncate"
                                title={
                                  f.addr && f.addr !== "-"
                                    ? f.addr
                                    : undefined
                                }
                              >
                                {f.addr || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 min-w-0 overflow-hidden align-middle">
                              <span
                                className="block min-w-0 truncate"
                                title={
                                  notifyDisp !== "-"
                                    ? notifyDisp
                                    : undefined
                                }
                              >
                                {notifyDisp}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-right text-[13px] text-gray-900 tabular-nums min-w-0 overflow-hidden align-middle">
                              <span
                                className="block min-w-0 truncate"
                                title={
                                  levyDisp !== "-"
                                    ? `${levyDisp}원`
                                    : undefined
                                }
                              >
                                {levyDisp === "-" ? "-" : `${levyDisp}원`}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 min-w-0 overflow-hidden align-middle">
                              <span
                                className="block min-w-0 truncate"
                                title={
                                  payDdDisp !== "-"
                                    ? payDdDisp
                                    : undefined
                                }
                              >
                                {payDdDisp}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-right text-[13px] text-gray-900 tabular-nums min-w-0 overflow-hidden align-middle">
                              <span
                                className="block min-w-0 truncate"
                                title={
                                  payAmtDisp !== "-"
                                    ? `${payAmtDisp}원`
                                    : undefined
                                }
                              >
                                {payAmtDisp === "-" ? "-" : `${payAmtDisp}원`}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center flex-wrap gap-1">
                                <button
                                  type="button"
                                  className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                                  style={{ minWidth: "64px" }}
                                  onClick={() =>
                                    handlePaymentHistoryClick(f.rowKey)
                                  }
                                >
                                  납부내역
                                </button>
                                <button
                                  type="button"
                                  className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                                  style={{ minWidth: "44px" }}
                                  onClick={() =>
                                    handleDetailClick(businessId || f.rowKey)
                                  }
                                >
                                  상세
                                </button>
                                <button
                                  type="button"
                                  className="px-2 py-1 text-[12px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                  style={{ minWidth: "44px" }}
                                  onClick={() =>
                                    handleDeleteClick(
                                      businessId || f.rowKey,
                                    )
                                  }
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
                    const f = feeListRowFields(
                      support,
                      index,
                      currentPage,
                      pageSize,
                    );
                    const businessId = support.businessId || "";
                    const payLabel = f.paid ? "납부" : "미납";
                    const payBadgeClass = feePayBadgeClassName(f.paid);
                    const levyDisp = formatFeeCurrency(f.levyRaw);
                    const payAmtDisp = formatFeeCurrency(f.payAmtRaw);

                    return (
                      <div key={f.rowKey} className="mobile-card">
                        <div className="mobile-card-header">
                          <span
                            className="mobile-card-id block truncate min-w-0"
                            title={
                              `순번 ${f.seq}${f.name ? ` · ${f.name}` : ""}` ||
                              undefined
                            }
                          >
                            순번 {f.seq}
                            {f.name ? ` · ${f.name}` : ""}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">상태</span>
                            <span className="mobile-card-value">
                              <span
                                className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] ${payBadgeClass}`}
                              >
                                {payLabel}
                              </span>
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">주소</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={f.addr || undefined}
                            >
                              {f.addr || "-"}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">통지일</span>
                            <span className="mobile-card-value">
                              {f.notify || "-"}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">부과액</span>
                            <span className="mobile-card-value">
                              {levyDisp === "-" ? "-" : `${levyDisp}원`}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">납부일</span>
                            <span className="mobile-card-value">
                              {f.payDd || "-"}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">납부액</span>
                            <span className="mobile-card-value">
                              {payAmtDisp === "-" ? "-" : `${payAmtDisp}원`}
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-footer flex flex-wrap gap-1 justify-end">
                          <button
                            type="button"
                            className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() =>
                              handlePaymentHistoryClick(f.rowKey)
                            }
                          >
                            납부내역
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() =>
                              handleDetailClick(businessId || f.rowKey)
                            }
                          >
                            상세
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 text-[12px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                            onClick={() =>
                              handleDeleteClick(businessId || f.rowKey)
                            }
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

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="오수 원인자부담금 삭제"
        message="해당 건을 삭제하시겠습니까?"
        confirmText={deleteLoading ? "처리 중..." : "삭제"}
        cancelText="닫기"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <ConfirmDialog
        isOpen={showPaymentHistoryComingSoon}
        title="알림"
        message="납부내역 화면은 준비 중입니다."
        type="primary"
        confirmText="확인"
        cancelText="닫기"
        onConfirm={() => setShowPaymentHistoryComingSoon(false)}
        onCancel={() => setShowPaymentHistoryComingSoon(false)}
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
