"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AdminExcelDownloadButton,
  ConfirmDialog,
  Pagination,
} from "@/shared/ui/adminWeb";
import { useSupportDetailList } from "../model";
import { SupportApplicationService } from "@/entities/adminWeb/support/application/api/supportApplicationApi";
import { ApiError, decodeDisplayText } from "@/shared/lib";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/resizable-table.css";
import "@/shared/styles/admin/table-filter.css";
import "@/shared/styles/admin/search-form.css";

/** 샘플업무 신청목록 상세 — 상태 콤보박스 옵션(등록/상세와 동일 코드) */
const SUPPORT_APPLICATION_STATUS_OPTIONS = [
  { value: "01", label: "임시저장" },
  { value: "02", label: "신청" },
  { value: "03", label: "승인" },
  { value: "04", label: "완료" },
  { value: "11", label: "반려" },
  { value: "12", label: "중단" },
  { value: "99", label: "취소" },
] as const;

export const SupportDetailListPageView: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    items,
    totalElements,
    totalPages,
    error,
    setError,
    businessId,
    businessNm,
    applicantNm,
    sortConfig,
    tableRef,
    pageSize,
    setShowSearchForm,
    setApplicantNm,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSort,
    handleSearch,
    handleDetailClick: originalHandleDetailClick,
    handleExcelDownload,
    refetchDetailList,
  } = useSupportDetailList();

  const [statusUpdatingReqId, setStatusUpdatingReqId] = useState<string | null>(
    null,
  );

  /** 스터디사업 등 타 사업 메뉴 제거 후 샘플업무 전용 */
  const isStudy = false;
  const sortedDisplayItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const order = (v: unknown) => {
          const s = String(v ?? "")
            .trim()
            .toUpperCase();
          if (s === "Y") return 0;
          if (s === "R") return 1;
          if (s === "N") return 2;
          return 3;
        };
        const byResult =
          order((a as any).resultGb ?? (a as any).RESULT_GB) -
          order((b as any).resultGb ?? (b as any).RESULT_GB);
        if (byResult !== 0) return byResult;
        const aKey = String((a as any).reqId ?? (a as any).REQ_ID ?? "");
        const bKey = String((b as any).reqId ?? (b as any).REQ_ID ?? "");
        return aKey.localeCompare(bKey);
      }),
    [items],
  );

  /**
   * 샘플업무 신청목록 데스크톱 col 너비 (합계 100%).
   * 신청상태 6%는 지역연계 진로체험 활동 신청목록과 동일. 공간이 부족하면 선정여부를 우선 축소.
   */
  const nonStudyDesktopColWidths = [
    "5%", // 번호
    "6%", // 신청상태 (지역연계 진로체험과 동일)
    "5%", // 선정여부
    "7%", // 보호자명
    "9%", // 보호자연락처
    "11%", // 학교명
    "7%", // 학년정보
    "8%", // 학생명
    "9%", // 학생연락처
    "16%", // 주소
    "8%", // 상태(변경)
    "9%", // 관리
  ] as const;

  const handleApplicationStatusChange = useCallback(
    async (row: Record<string, unknown>, nextSttus: string) => {
      const reqId = String(row.reqId ?? "").trim();
      const current = String(row.status ?? "");
      if (!reqId || nextSttus === current) return;

      setError("");
      setStatusUpdatingReqId(reqId);
      try {
        const res = await SupportApplicationService.updateArtappmStatusByReqId({
          reqId,
          sttusCode: nextSttus,
        });
        if (res?.result !== "00") {
          setError(res?.message || "상태 변경에 실패했습니다.");
          return;
        }
        await refetchDetailList();
      } catch (err) {
        console.error("신청 상태 변경 실패:", err);
        if (err instanceof ApiError) {
          setError(err.message || "상태 변경 중 오류가 발생했습니다.");
        } else {
          setError("상태 변경 중 오류가 발생했습니다.");
        }
      } finally {
        setStatusUpdatingReqId(null);
      }
    },
    [refetchDetailList, setError],
  );

  /** 스터디 수강확인증(제거된 메뉴) — UI 분기만 유지 */
  const handleCourseCertificateClick = (_item: unknown) => {};

  const handleDetailClick = (item: any) => {
    originalHandleDetailClick(item);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "01":
        return "임시저장";
      case "02":
        return "신청";
      case "03":
        return "승인";
      case "04":
        return "완료";
      case "11":
        return "반려";
      case "12":
        return "중단";
      case "99":
        return "취소";
      // 기존 영어 코드도 지원 (하위 호환성)
      case "RECEIVE":
        return "접수";
      case "APPROVE":
        return "승인";
      case "REJECT":
        return "거절";
      case "CANCEL":
        return "취소";
      case "COMPLETE":
        return "완료";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "01":
        return "bg-gray-100 text-gray-800";
      case "02":
        return "bg-blue-100 text-blue-800";
      case "03":
        return "bg-green-100 text-green-800";
      case "04":
        return "bg-gray-100 text-gray-800";
      case "11":
        return "bg-red-100 text-red-800";
      case "12":
        return "bg-orange-100 text-orange-800";
      case "99":
        return "bg-yellow-100 text-yellow-800";
      // 기존 영어 코드도 지원 (하위 호환성)
      case "RECEIVE":
        return "bg-blue-100 text-blue-800";
      case "APPROVE":
        return "bg-green-100 text-green-800";
      case "REJECT":
        return "bg-red-100 text-red-800";
      case "CANCEL":
        return "bg-yellow-100 text-yellow-800";
      case "COMPLETE":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getResultGbLabel = (resultGb: string | undefined) => {
    if (!resultGb || resultGb.trim() === "") return "-";
    const v = resultGb.toUpperCase();
    if (v === "Y") return "선정";
    if (v === "N") return "미선정";
    if (v === "R") return "예비";
    return resultGb;
  };

  if (!businessId) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">신청목록 상세</h1>
          <nav className="breadcrumb">
            <span>홈</span> &gt; <span>관리자</span> &gt; <span>업무관리</span>{" "}
            &gt; <span>신청목록 상세</span>
          </nav>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center text-red-600">
            사업코드가 필요합니다. 목록 페이지로 돌아가주세요.
          </div>
          <div className="mt-4 text-center">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
              onClick={() => router.push("/adminWeb/support/list")}
            >
              목록으로
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">신청목록 상세</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt; <span>업무관리</span>{" "}
          &gt; <span>신청목록 상세</span>
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

      {/* 조회 필터 */}
      <div
        className={`bg-white mb-3 rounded-lg shadow search-form-container ${
          showSearchForm ? "show" : ""
        }`}
      >
        <div className="border border-gray-300">
          <div className="flex flex-wrap">
            <div className="w-full">
              <div
                className="flex flex-col md:flex-row items-stretch"
                style={{ minHeight: "45px" }}
              >
                <label className="w-full md:w-1/6 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  사업명
                </label>
                <div className="w-full md:flex-1 flex items-center p-2 border-r border-gray-300">
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-none text-[13px] bg-gray-200 text-gray-600 cursor-not-allowed"
                    value={decodeDisplayText(businessNm ?? "")}
                    readOnly
                    disabled
                    placeholder="사업명이 표시됩니다"
                  />
                </div>
                <label className="w-full md:w-1/6 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  학생명
                </label>
                <div className="w-full md:flex-1 flex items-center p-2">
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                    value={applicantNm}
                    onChange={(e) => setApplicantNm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="학생명을 입력하세요"
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
          onClick={() => {
            const url = `/adminWeb/support/application/register?businessId=${businessId || ""}&programTitle=${encodeURIComponent(businessNm || "")}`;
            router.push(url);
          }}
        >
          ✏️ 등록
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-[13px]">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            신청목록 상세 (총 {totalElements.toLocaleString()}개)
          </h5>
          <div className="flex gap-2">
            <AdminExcelDownloadButton
              className="inline-flex items-center justify-center gap-1"
              style={{ minHeight: "28px" }}
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
                    {isStudy ? (
                      <>
                        {nonStudyDesktopColWidths.map((w, i) => (
                          <col key={`sk-${i}`} style={{ width: w }} />
                        ))}
                      </>
                    ) : (
                      <>
                        {nonStudyDesktopColWidths.map((w, i) => (
                          <col key={`sk-${i}`} style={{ width: w }} />
                        ))}
                      </>
                    )}
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr className="border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        번호
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        신청상태
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        선정여부
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        보호자명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        보호자연락처
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        학교명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        학년정보
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        학생명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        연락처
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        주소
                      </th>
                      {isStudy ? (
                        <>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        상태
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            상태
                          </th>
                          <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                            관리
                          </th>
                        </>
                      )}
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
                              width: "72px",
                              height: "22px",
                              margin: "0 auto",
                              borderRadius: "5px",
                            }}
                          ></div>
                        </td>
                        <td className="px-2 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: "52px",
                              height: "22px",
                              margin: "0 auto",
                              borderRadius: "5px",
                            }}
                          ></div>
                        </td>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3 border-r">
                            <div
                              className="skeleton"
                              style={{
                                width: "100px",
                                height: "16px",
                              }}
                            ></div>
                          </td>
                        ))}
                        {isStudy ? (
                          <>
                            <td className="px-4 py-3 border-r text-center">
                              <div
                                className="skeleton"
                                style={{
                                  width: "88px",
                                  height: "28px",
                                  margin: "0 auto",
                                  borderRadius: "4px",
                                }}
                              ></div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-1 flex-wrap">
                                <div
                                  className="skeleton"
                                  style={{
                                    width: "72px",
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
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 border-r text-center">
                              <div
                                className="skeleton"
                                style={{
                                  width: "88px",
                                  height: "28px",
                                  margin: "0 auto",
                                  borderRadius: "4px",
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
                          </>
                        )}
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
                    {isStudy ? (
                      <>
                        {nonStudyDesktopColWidths.map((w, i) => (
                          <col key={`dt-${i}`} style={{ width: w }} />
                        ))}
                      </>
                    ) : (
                      <>
                        {nonStudyDesktopColWidths.map((w, i) => (
                          <col key={`dt-${i}`} style={{ width: w }} />
                        ))}
                      </>
                    )}
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
                        신청상태
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        선정여부
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("parentNm")}
                      >
                        보호자명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("parentPhone")}
                      >
                        보호자연락처
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("schoolNm")}
                      >
                        학교명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("gradeInfo")}
                      >
                        학년정보
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("studentNm")}
                      >
                        학생명
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("studentPhone")}
                      >
                        학생연락처
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("address")}
                      >
                        주소
                      </th>
                      {isStudy ? (
                        <>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            상태
                          </th>
                          <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                            관리
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                            상태
                          </th>
                          <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                            관리
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? "데이터를 불러오는 중..."
                            : "조회된 데이터가 없습니다."}
                        </td>
                      </tr>
                    ) : (
                      sortedDisplayItems.map((item, index) => {
                        const actualNum =
                          item.rnum ||
                          String((currentPage - 1) * pageSize + index + 1);
                        const applicationId = item.applicationId || "";
                        const proSeq = item.proSeq || "";
                        const status = item.status || "";
                        const resultGb = item.resultGb;
                        const parentNm = item.parentNm || "";
                        const parentPhone = item.parentPhone || "";
                        const schoolNm = item.schoolNm || "";
                        const gradeInfo = item.gradeInfo || "";
                        const studentNm = item.studentNm || "";
                        const studentPhone = item.studentPhone || "";
                        const address = item.address || "";

                        return (
                          <tr
                            key={`${applicationId}-${actualNum}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {actualNum}
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <span
                                className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                  status,
                                )}`}
                              >
                                {getStatusLabel(status)}
                              </span>
                            </td>
                            <td className="px-2 py-2 border-r text-center text-[13px] text-gray-700 overflow-hidden">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={getResultGbLabel(resultGb)}
                              >
                                {getResultGbLabel(resultGb)}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={parentNm || ''}
                              >
                                {parentNm}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={parentPhone || ''}
                              >
                                {parentPhone}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={schoolNm || ''}
                              >
                                {schoolNm}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={gradeInfo || ''}
                              >
                                {gradeInfo}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={studentNm || ''}
                              >
                                {studentNm}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={studentPhone || ''}
                              >
                                {studentPhone}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                              <span
                                className="inline-block max-w-full truncate align-middle"
                                title={address}
                              >
                                {address}
                              </span>
                            </td>
                            {isStudy ? (
                              <>
                                <td className="px-3 py-2 border-r text-center">
                                  <select
                                    aria-label="상태 변경"
                                    value={status}
                                    disabled={
                                      deleteLoading ||
                                      (statusUpdatingReqId !== null &&
                                        statusUpdatingReqId ===
                                          String(item.reqId ?? ""))
                                    }
                                    onChange={(e) =>
                                      handleApplicationStatusChange(
                                        item as Record<string, unknown>,
                                        e.target.value,
                                      )
                                    }
                                    className="inline-block min-w-0 max-w-full w-full cursor-pointer rounded-[5px] border border-gray-300 bg-white px-1.5 py-1 text-[12px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {!SUPPORT_APPLICATION_STATUS_OPTIONS.some(
                                      (o) => o.value === status,
                                    ) &&
                                      status !== "" && (
                                        <option value={status}>
                                          {getStatusLabel(status)}
                                        </option>
                                      )}
                                    {SUPPORT_APPLICATION_STATUS_OPTIONS.map(
                                      (opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    <button
                                      type="button"
                                      className="px-3 py-1 text-[13px] text-gray-700 border border-gray-600 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                                      onClick={() =>
                                        handleCourseCertificateClick(item)
                                      }
                                    >
                                      수강확인증
                                    </button>
                                    <button
                                      type="button"
                                      className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                                      onClick={() => handleDetailClick(item)}
                                    >
                                      상세
                                    </button>
                                    <button
                                      type="button"
                                      className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                      onClick={() => handleDeleteClick(item)}
                                      disabled={deleteLoading}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-2 border-r text-center">
                                  <select
                                    aria-label="상태 변경"
                                    value={status}
                                    disabled={
                                      deleteLoading ||
                                      (statusUpdatingReqId !== null &&
                                        statusUpdatingReqId ===
                                          String(item.reqId ?? ""))
                                    }
                                    onChange={(e) =>
                                      handleApplicationStatusChange(
                                        item as Record<string, unknown>,
                                        e.target.value,
                                      )
                                    }
                                    className="inline-block min-w-0 max-w-full w-full cursor-pointer rounded-[5px] border border-gray-300 bg-white px-1.5 py-1 text-[12px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {!SUPPORT_APPLICATION_STATUS_OPTIONS.some(
                                      (o) => o.value === status,
                                    ) &&
                                      status !== "" && (
                                        <option value={status}>
                                          {getStatusLabel(status)}
                                        </option>
                                      )}
                                    {SUPPORT_APPLICATION_STATUS_OPTIONS.map(
                                      (opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    <button
                                      type="button"
                                      className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                                      onClick={() => handleDetailClick(item)}
                                    >
                                      상세
                                    </button>
                                    <button
                                      type="button"
                                      className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                      onClick={() => handleDeleteClick(item)}
                                      disabled={deleteLoading}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="mobile-card-view md:hidden">
                {items.length === 0 ? (
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
                  sortedDisplayItems.map((item, index) => {
                    const actualNum =
                      item.rnum ||
                      String((currentPage - 1) * pageSize + index + 1);
                    const applicationId = item.applicationId || "";
                    const proSeq = item.proSeq || "";
                    const status = item.status || "";
                    const resultGb = item.resultGb;
                    const parentNm = item.parentNm || "";
                    const parentPhone = item.parentPhone || "";
                    const schoolNm = item.schoolNm || "";
                    const gradeInfo = item.gradeInfo || "";
                    const studentNm = item.studentNm || "";
                    const studentPhone = item.studentPhone || "";
                    const address = item.address || "";

                    return (
                      <div
                        key={`${applicationId}-${actualNum}`}
                        className="mobile-card"
                      >
                        <div className="mobile-card-header">
                          <span
                            className="mobile-card-id block truncate min-w-0"
                            title={studentNm || undefined}
                          >
                            #{actualNum} - {studentNm}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">
                              신청상태
                            </span>
                            <span className="mobile-card-value">
                              <span
                                className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                  status,
                                )}`}
                              >
                                {getStatusLabel(status)}
                              </span>
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">
                              선정여부
                            </span>
                            <span className="mobile-card-value text-[13px] text-gray-700">
                              {getResultGbLabel(resultGb)}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">보호자명</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={parentNm || undefined}
                            >
                              {parentNm}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">
                              보호자연락처
                            </span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={parentPhone || undefined}
                            >
                              {parentPhone}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">학교명</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={schoolNm || undefined}
                            >
                              {schoolNm}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">학년정보</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={gradeInfo || undefined}
                            >
                              {gradeInfo}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">학생명</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={studentNm || undefined}
                            >
                              {studentNm}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">
                              학생연락처
                            </span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={studentPhone || undefined}
                            >
                              {studentPhone}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">주소</span>
                            <span
                              className="mobile-card-value truncate"
                              title={address}
                            >
                              {address}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">상태</span>
                            <span className="mobile-card-value">
                              <select
                                aria-label="상태 변경"
                                value={status}
                                disabled={
                                  deleteLoading ||
                                  (statusUpdatingReqId !== null &&
                                    statusUpdatingReqId ===
                                      String(item.reqId ?? ""))
                                }
                                onChange={(e) =>
                                  handleApplicationStatusChange(
                                    item as Record<string, unknown>,
                                    e.target.value,
                                  )
                                }
                                className="w-full max-w-full cursor-pointer rounded-[5px] border border-gray-300 bg-white px-2 py-1.5 text-[13px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {!SUPPORT_APPLICATION_STATUS_OPTIONS.some(
                                  (o) => o.value === status,
                                ) &&
                                  status !== "" && (
                                    <option value={status}>
                                      {getStatusLabel(status)}
                                    </option>
                                  )}
                                {SUPPORT_APPLICATION_STATUS_OPTIONS.map(
                                  (opt) => (
                                    <option
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      {opt.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-footer">
                          {isStudy && (
                            <button
                              type="button"
                              className="px-3 py-1 text-[13px] text-gray-700 border border-gray-600 rounded hover:bg-gray-50 transition-colors"
                              onClick={() => handleCourseCertificateClick(item)}
                            >
                              수강확인증
                            </button>
                          )}
                          <button
                            type="button"
                            className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() => handleDetailClick(item)}
                          >
                            상세
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteClick(item)}
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

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="신청목록 삭제"
        message={`해당 신청목록을 삭제하시겠습니까?`}
        confirmText={deleteLoading ? "처리 중..." : "삭제"}
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
};
