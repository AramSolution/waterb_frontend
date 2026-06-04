"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AdminExcelDownloadButton,
  ConfirmDialog,
  Pagination,
} from "@/shared/ui/adminWeb";
import { FormDatePicker } from "@/shared/ui/adminWeb/form";
import { decodeDisplayText } from "@/shared/lib";
import { feePayBadgeClassName } from "@/features/adminWeb/support/lib/feePayStatusUi";
import type { DrainageEquipListRow } from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import { useDrainageEquipList } from "../model";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/search-form.css";

function formatCurrency(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(String(v).replace(/,/g, ""));
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("ko-KR");
}

function listRowFields(
  row: DrainageEquipListRow,
  index: number,
  page: number,
  ps: number,
) {
  const seq = String((page - 1) * ps + index + 1);
  const name = decodeDisplayText(String(row.userNm ?? ""));
  const addr = decodeDisplayText(String(row.addr ?? ""));
  const reqDate = String(row.reqDate ?? "").trim();
  const payDd = String(row.payDay ?? "").trim();
  const rowKey =
    row.itemId && row.seq != null
      ? `${row.itemId}-${row.seq}`
      : row.itemId || `row-${index}`;
  return {
    seq,
    name,
    addr,
    reqDate,
    levyRaw: row.equipCost,
    payDd,
    payAmtRaw: row.payAmt ?? row.equipPay,
    rowKey,
    itemId: row.itemId,
    detailSeq: row.seq,
  };
}

export const DrainageEquipLedgerPageView: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    totalPages,
    totalElements,
    rows,
    showSearchForm,
    setShowSearchForm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    userNm,
    setUserNm,
    address,
    setAddress,
    paySta,
    setPaySta,
    pageSize,
    tableRef,
    handleSearch,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    showDeleteDialog,
    selectedDeleteTarget,
    deleteLoading,
    showDeleteSuccessDialog,
    deleteSuccessMessage,
    showDeleteFailDialog,
    deleteFailMessage,
    deleteFailDialogType,
    handleDeleteSuccessDialogClose,
    handleDeleteFailDialogClose,
    handleExcelDownload,
    excelDownloading,
    showExcelFailDialog,
    excelFailMessage,
    handleExcelFailDialogClose,
    isDrainageEquipListRowPaid,
  } = useDrainageEquipList();

  const deleteDialogTitle = "삭제하시겠습니까?";
  const deleteDialogMessage = selectedDeleteTarget
    ? `${selectedDeleteTarget.userNm} 부과액 : ${selectedDeleteTarget.equipCostLabel}`
    : "삭제 대상을 확인할 수 없습니다.";

  const handleDetailClick = (itemId: string) => {
    const id = itemId.trim();
    if (!id) return;
    router.push(
      `/adminWeb/support/drainage-equip/detail?itemId=${encodeURIComponent(id)}`,
    );
  };

  const handlePaymentHistoryClick = (itemId: string) => {
    const id = itemId.trim();
    if (!id) return;
    router.push(
      `/adminWeb/support/drainage-equip/payment-history?itemId=${encodeURIComponent(id)}`,
    );
  };

  const renderRowCells = (
    row: DrainageEquipListRow,
    index: number,
    variant: "table" | "mobile",
  ) => {
    const f = listRowFields(row, index, currentPage, pageSize);
    const paid = isDrainageEquipListRowPaid(row);
    const payLabel = paid ? "납부" : "미납";
    const payBadgeClass = feePayBadgeClassName(paid);
    const levyDisp = formatCurrency(f.levyRaw);
    const payAmtDisp = formatCurrency(f.payAmtRaw);
    const reqDateDisp = f.reqDate || "-";
    const payDdDisp = f.payDd || "-";
    const detailSeq = f.detailSeq != null ? Number(f.detailSeq) : NaN;

    if (variant === "mobile") {
      return (
        <div key={f.rowKey} className="mobile-card">
          <div className="mobile-card-header">
            <span
              className="mobile-card-id block truncate min-w-0"
              title={`번호 ${f.seq}${f.name ? ` · ${f.name}` : ""}` || undefined}
            >
              번호 {f.seq}
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
              <span className="mobile-card-label">등록일</span>
              <span className="mobile-card-value">{reqDateDisp}</span>
            </div>
            <div className="mobile-card-row">
              <span className="mobile-card-label">부과액</span>
              <span className="mobile-card-value">
                {levyDisp === "-" ? "-" : `${levyDisp}원`}
              </span>
            </div>
            <div className="mobile-card-row">
              <span className="mobile-card-label">납부일</span>
              <span className="mobile-card-value">{payDdDisp}</span>
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
              onClick={() => handlePaymentHistoryClick(f.itemId)}
            >
              납부내역
            </button>
            <button
              type="button"
              className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
              onClick={() => handleDetailClick(f.itemId)}
            >
              상세
            </button>
            <button
              type="button"
              className="px-2 py-1 text-[12px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              title={paid ? "납부완료 건은 삭제할 수 없습니다." : undefined}
              onClick={() =>
                handleDeleteClick(
                  f.itemId,
                  f.detailSeq,
                  f.name,
                  f.levyRaw as number | undefined,
                  paid,
                )
              }
              disabled={
                deleteLoading ||
                !Number.isFinite(detailSeq) ||
                detailSeq <= 0
              }
            >
              삭제
            </button>
          </div>
        </div>
      );
    }

    return (
      <tr key={f.rowKey} className="hover:bg-gray-50">
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
            title={f.name && f.name !== "-" ? f.name : undefined}
          >
            {f.name || "-"}
          </span>
        </td>
        <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 min-w-0 overflow-hidden align-middle">
          <span
            className="block min-w-0 truncate"
            title={f.addr && f.addr !== "-" ? f.addr : undefined}
          >
            {f.addr || "-"}
          </span>
        </td>
        <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 min-w-0 overflow-hidden align-middle">
          <span
            className="block min-w-0 truncate"
            title={reqDateDisp !== "-" ? reqDateDisp : undefined}
          >
            {reqDateDisp}
          </span>
        </td>
        <td className="px-3 py-2 border-r text-right text-[13px] text-gray-900 tabular-nums min-w-0 overflow-hidden align-middle">
          <span
            className="block min-w-0 truncate"
            title={levyDisp !== "-" ? `${levyDisp}원` : undefined}
          >
            {levyDisp === "-" ? "-" : `${levyDisp}원`}
          </span>
        </td>
        <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 min-w-0 overflow-hidden align-middle">
          <span
            className="block min-w-0 truncate"
            title={payDdDisp !== "-" ? payDdDisp : undefined}
          >
            {payDdDisp}
          </span>
        </td>
        <td className="px-3 py-2 border-r text-right text-[13px] text-gray-900 tabular-nums min-w-0 overflow-hidden align-middle">
          <span
            className="block min-w-0 truncate"
            title={payAmtDisp !== "-" ? `${payAmtDisp}원` : undefined}
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
              onClick={() => handlePaymentHistoryClick(f.itemId)}
            >
              납부내역
            </button>
            <button
              type="button"
              className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
              style={{ minWidth: "44px" }}
              onClick={() => handleDetailClick(f.itemId)}
            >
              상세
            </button>
            <button
              type="button"
              className="px-2 py-1 text-[12px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ minWidth: "44px" }}
              title={paid ? "납부완료 건은 삭제할 수 없습니다." : undefined}
              onClick={() =>
                handleDeleteClick(
                  f.itemId,
                  f.detailSeq,
                  f.name,
                  f.levyRaw as number | undefined,
                  paid,
                )
              }
              disabled={
                deleteLoading ||
                !Number.isFinite(detailSeq) ||
                detailSeq <= 0
              }
            >
              삭제
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">배수설비 관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>배수설비 관리</span>
        </nav>
      </div>

      <div className="md:hidden mb-2">
        <button
          type="button"
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
          <div
            className="flex flex-wrap"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          >
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch md:border-r border-gray-300"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  등록일
                </label>
                <div className="w-full md:w-3/4 flex items-center gap-2 p-2 flex-wrap">
                  <div className="flex-1 min-w-[120px]">
                    <FormDatePicker
                      name="reqDateFrom"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="시작일"
                      maxDate={endDate ? new Date(endDate) : undefined}
                    />
                  </div>
                  <span className="text-gray-600 flex-shrink-0">~</span>
                  <div className="flex-1 min-w-[120px]">
                    <FormDatePicker
                      name="reqDateTo"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
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
                  상태
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2">
                  <select
                    name="paySta"
                    value={paySta}
                    onChange={(e) => setPaySta(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                  >
                    <option value="">전체</option>
                    <option value="01">미납</option>
                    <option value="02">납부</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col md:flex-row items-stretch md:border-r border-gray-300"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  성명
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2">
                  <input
                    type="text"
                    name="userNm"
                    value={userNm}
                    onChange={(e) => setUserNm(e.target.value)}
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
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col md:flex-row items-stretch border-gray-300"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  주소
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2">
                  <input
                    type="text"
                    name="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
          onClick={() =>
            router.push("/adminWeb/support/drainage-equip/register")
          }
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            배수설비 관리 목록 (총 {totalElements.toLocaleString()}개)
          </h5>
          <div className="flex gap-2">
            <AdminExcelDownloadButton
              onClick={handleExcelDownload}
              loading={excelDownloading}
            />
          </div>
        </div>
        <div className="p-0">
          {loading && isInitialLoad ? (
            <div className="px-4 py-8 text-center text-gray-500">
              데이터를 불러오는 중...
            </div>
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
                        번호
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
                        등록일
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
                    {rows.length === 0 ? (
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
                      rows.map((row, index) =>
                        renderRowCells(row, index, "table"),
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mobile-card-view md:hidden">
                {rows.length === 0 ? (
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
                  rows.map((row, index) =>
                    renderRowCells(row, index, "mobile"),
                  )
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

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title={deleteDialogTitle}
        message={deleteDialogMessage}
        confirmText={deleteLoading ? "처리 중..." : "확인"}
        type="danger"
        useDeleteHeader
        disabled={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <ConfirmDialog
        isOpen={showDeleteSuccessDialog}
        title="삭제 완료"
        message={deleteSuccessMessage || "삭제 되었습니다."}
        confirmText="확인"
        type="success"
        singleAction
        onConfirm={handleDeleteSuccessDialogClose}
        onCancel={handleDeleteSuccessDialogClose}
      />

      <ConfirmDialog
        isOpen={showDeleteFailDialog}
        title="삭제 실패"
        message={deleteFailMessage || "배수설비 삭제에 실패했습니다."}
        confirmText="확인"
        cancelText="취소"
        variant={deleteFailDialogType === "warning" ? "alert" : "error"}
        type={
          deleteFailDialogType === "warning"
            ? "primary"
            : deleteFailDialogType
        }
        preferCheckHeader
        onConfirm={handleDeleteFailDialogClose}
        onCancel={handleDeleteFailDialogClose}
      />

      <ConfirmDialog
        isOpen={showExcelFailDialog}
        title="엑셀 다운로드"
        message={excelFailMessage || "엑셀 다운로드 중 오류가 발생했습니다."}
        confirmText="확인"
        type="primary"
        variant="alert"
        preferCheckHeader
        singleAction
        onConfirm={handleExcelFailDialogClose}
        onCancel={handleExcelFailDialogClose}
      />
    </>
  );
};
