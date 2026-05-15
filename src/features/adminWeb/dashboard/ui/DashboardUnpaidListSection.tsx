"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Pagination } from "@/shared/ui/adminWeb";
import {
  type Support,
  isFeePayerListRowPaid,
} from "@/entities/adminWeb/support/api";
import { decodeDisplayText } from "@/shared/lib";
import { feePayBadgeClassName } from "@/features/adminWeb/support/lib/feePayStatusUi";
import { useDashboardUnpaidList } from "../model/useDashboardUnpaidList";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";

function formatFeeCurrency(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(String(v).replace(/,/g, ""));
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("ko-KR");
}

function feeListRowFields(
  row: Support,
  index: number,
  page: number,
  ps: number,
) {
  const rowAny = row as Record<string, unknown>;
  const seq = String((page - 1) * ps + index + 1);
  const paid = isFeePayerListRowPaid(row);
  const name = decodeDisplayText(
    String(rowAny.applicantNm ?? row.userNm ?? row.businessNm ?? ""),
  );
  const addr = decodeDisplayText(
    String(rowAny.addr ?? rowAny.address ?? ""),
  );
  const notify = String(
    rowAny.notifyDd ?? rowAny.reqDate ?? row.recruitStartDate ?? "",
  ).trim();
  const levyRaw = rowAny.levyAmt ?? rowAny.waterCost ?? rowAny.impAmt;
  const payDd = String(
    rowAny.payDd ?? rowAny.payDay ?? rowAny.paymentDd ?? "",
  ).trim();
  const payAmtRaw =
    rowAny.payAmt ?? rowAny.waterPay ?? rowAny.pay ?? rowAny.paymentAmt;
  const itemId = String(
    rowAny.itemId ?? row.businessId ?? row.proId ?? "",
  ).trim();
  const det = rowAny.feeDetailSeq ?? rowAny.seq;
  const rowKey =
    itemId && det !== undefined && det !== null && String(det) !== ""
      ? `${itemId}-${det}`
      : itemId || `row-${index}`;
  return { seq, paid, name, addr, notify, levyRaw, payDd, payAmtRaw, rowKey };
}

export const DashboardUnpaidListSection: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    pageSize,
    rows,
    totalElements,
    totalPages,
    error,
    handlePageChange,
    refetch,
  } = useDashboardUnpaidList();

  const handleDetailClick = (businessId: string) => {
    const id = businessId.trim();
    if (!id) return;
    router.push(
      `/adminWeb/support/list/basic-detail?proId=${encodeURIComponent(id)}`,
    );
  };

  const handlePaymentHistoryClick = (itemId: string) => {
    const id = itemId.trim();
    if (!id) return;
    router.push(
      `/adminWeb/support/list/payment-history?itemId=${encodeURIComponent(id)}`,
    );
  };

  const renderTableBody = () => {
    if (rows.length === 0) {
      return (
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
      );
    }

    return rows.map((support, index) => {
      const f = feeListRowFields(support, index, currentPage, pageSize);
      const rowAny = support as Record<string, unknown>;
      const itemId = String(
        rowAny.itemId ?? support.businessId ?? support.proId ?? "",
      ).trim();
      const businessId = support.businessId || "";
      const payLabel = f.paid ? "납부" : "미납";
      const payBadgeClass = feePayBadgeClassName(f.paid);
      const levyDisp = formatFeeCurrency(f.levyRaw);
      const payAmtDisp = formatFeeCurrency(f.payAmtRaw);
      const notifyDisp = f.notify || "-";
      const payDdDisp = f.payDd || "-";

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
              title={notifyDisp !== "-" ? notifyDisp : undefined}
            >
              {notifyDisp}
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
                onClick={() =>
                  handlePaymentHistoryClick(
                    itemId || businessId || f.rowKey,
                  )
                }
              >
                납부내역
              </button>
              <button
                type="button"
                className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                style={{ minWidth: "44px" }}
                onClick={() => handleDetailClick(businessId || f.rowKey)}
              >
                상세
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      {error && !loading && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 px-3 py-1 text-sm rounded border border-red-300 hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            미납현황 (총 {totalElements.toLocaleString()}개)
          </h5>
        </div>
        <div className="p-0">
          {loading && isInitialLoad ? (
            <div className="px-4 py-12 text-center text-gray-500 text-[13px]">
              데이터를 불러오는 중...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block">
                <table
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
                    <col style={{ width: "14%" }} />
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
                    {renderTableBody()}
                  </tbody>
                </table>
              </div>

              <div className="mobile-card-view md:hidden p-3">
                {rows.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-[13px]">
                    {loading
                      ? "데이터를 불러오는 중..."
                      : "조회된 데이터가 없습니다."}
                  </div>
                ) : (
                  rows.map((support, index) => {
                    const f = feeListRowFields(
                      support,
                      index,
                      currentPage,
                      pageSize,
                    );
                    const rowAny = support as Record<string, unknown>;
                    const itemId = String(
                      rowAny.itemId ??
                        support.businessId ??
                        support.proId ??
                        "",
                    ).trim();
                    const businessId = support.businessId || "";
                    const payLabel = f.paid ? "납부" : "미납";
                    const payBadgeClass = feePayBadgeClassName(f.paid);
                    const levyDisp = formatFeeCurrency(f.levyRaw);
                    const payAmtDisp = formatFeeCurrency(f.payAmtRaw);

                    return (
                      <div key={f.rowKey} className="mobile-card mb-3">
                        <div className="mobile-card-header flex justify-between items-center">
                          <span className="font-semibold text-[13px]">
                            {f.name || "-"}
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-[5px] text-[12px] ${payBadgeClass}`}
                          >
                            {payLabel}
                          </span>
                        </div>
                        <div className="mobile-card-body text-[13px] space-y-1">
                          <p className="truncate">{f.addr || "-"}</p>
                          <p>통지일: {f.notify || "-"}</p>
                          <p>
                            부과액:{" "}
                            {levyDisp === "-" ? "-" : `${levyDisp}원`}
                          </p>
                          <p>납부일: {f.payDd || "-"}</p>
                          <p>
                            납부액:{" "}
                            {payAmtDisp === "-" ? "-" : `${payAmtDisp}원`}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-2">
                            <button
                              type="button"
                              className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded"
                              onClick={() =>
                                handlePaymentHistoryClick(
                                  itemId || businessId || f.rowKey,
                                )
                              }
                            >
                              납부내역
                            </button>
                            <button
                              type="button"
                              className="px-2 py-1 text-[12px] text-blue-600 border border-blue-600 rounded"
                              onClick={() =>
                                handleDetailClick(businessId || f.rowKey)
                              }
                            >
                              상세
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
    </>
  );
};
