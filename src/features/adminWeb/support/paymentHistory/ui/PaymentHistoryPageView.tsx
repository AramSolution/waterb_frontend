"use client";

import React from "react";
import { FormField, FormInput } from "@/shared/ui/adminWeb/form";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { usePaymentHistory } from "../model/usePaymentHistory";
import { CauserPaymentHistorySection } from "./CauserPaymentHistorySection";
import "@/shared/styles/admin/register-form.css";

const readOnlyClass = "bg-gray-100 !cursor-not-allowed";

/**
 * 납부내역 — 기본정보(성명·주소)는 **등록 화면과 동일 격자**, 읽기 전용(회색).
 * 데이터는 목록 `proId`(`businessId`) 기준(백엔드·상세 API 연동 시 대체).
 */
export const PaymentHistoryPageView: React.FC = () => {
  const {
    itemId,
    found,
    detailLoading,
    detailErrorMessage,
    applicantNm,
    telNo,
    zipCode,
    adres,
    detailAdres,
    detailEntries,
    persistRequestBuilderRef,
    preSaveValidateRef,
    loading,
    showSaveDialog,
    saveDialogVariant,
    saveDialogMessage,
    handleBack,
    handleSave,
    handleSaveDialogClose,
    noopChange,
  } = usePaymentHistory();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">납부내역</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt;{" "}
          <span>오수 원인자부담금 관리</span> &gt; <span>납부내역</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">기본정보</h5>
        </div>
        <div className="p-0">
          {detailLoading ? (
            <div className="px-6 py-8 text-sm text-gray-600">불러오는 중입니다…</div>
          ) : !found ? (
            <div className="px-6 py-8 text-sm text-gray-600">
              {detailErrorMessage.trim() ||
                "조회할 수 없는 대상이거나 잘못된 링크입니다. 목록에서 다시 시도해주세요."}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap">
                <FormField
                  label="성명"
                  isFirstRow
                  isFirstInRow
                  suppressBottomBorder
                >
                  <FormInput
                    type="text"
                    name="applicantNm"
                    value={applicantNm}
                    onChange={noopChange}
                    readOnly
                    className={readOnlyClass}
                    placeholder="성명"
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="전화번호" isFirstInRow suppressBottomBorder>
                  <FormInput
                    type="text"
                    name="telNo"
                    value={telNo}
                    onChange={noopChange}
                    readOnly
                    className={readOnlyClass}
                    placeholder="전화번호"
                    autoComplete="off"
                  />
                </FormField>
              </div>
              <div className="flex flex-wrap">
                <FormField label="주소" fullWidth forceTopBorder>
                  <div className="w-full flex items-stretch gap-1">
                    <div className="w-28 flex-shrink-0 flex flex-col">
                      <FormInput
                        type="text"
                        name="zipCode"
                        value={zipCode}
                        onChange={noopChange}
                        readOnly
                        placeholder="우편번호"
                        className={readOnlyClass}
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex items-stretch gap-1">
                      <div className="flex-1 min-w-0 flex flex-col">
                        <FormInput
                          type="text"
                          name="adres"
                          value={adres}
                          onChange={noopChange}
                          readOnly
                          placeholder="주소"
                          className={readOnlyClass}
                          autoComplete="off"
                        />
                      </div>
                      <button
                        type="button"
                        className="flex items-center justify-center w-10 min-w-[2.5rem] h-10 min-h-[2.5rem] flex-shrink-0 rounded-none border-0 bg-[#1967d2] hover:bg-[#1557b0] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        title="읽기 전용"
                        aria-label="주소 검색"
                        disabled
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <FormInput
                        type="text"
                        name="detailAdres"
                        value={detailAdres}
                        onChange={noopChange}
                        readOnly
                        placeholder="상세주소"
                        className={readOnlyClass}
                        maxLength={200}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </FormField>
              </div>
            </>
          )}
        </div>
      </div>

      {found ? (
        <CauserPaymentHistorySection
          itemId={itemId}
          initialEntries={detailEntries}
          persistRequestBuilderRef={persistRequestBuilderRef}
          preSaveValidateRef={preSaveValidateRef}
        />
      ) : null}

      <div className="flex justify-end mt-6 gap-2">
        {found ? (
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "처리 중..." : "저장"}
          </button>
        ) : null}
        <button
          type="button"
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-[13px]"
          style={{ minWidth: "100px" }}
          onClick={handleBack}
          disabled={loading}
        >
          닫기
        </button>
      </div>

      <ConfirmDialog
        isOpen={showSaveDialog}
        title="알림"
        message={saveDialogMessage || "처리 결과를 확인해주세요."}
        type={saveDialogVariant}
        preferCheckHeader
        confirmText="확인"
        onConfirm={handleSaveDialogClose}
        onCancel={handleSaveDialogClose}
      />
    </>
  );
};
