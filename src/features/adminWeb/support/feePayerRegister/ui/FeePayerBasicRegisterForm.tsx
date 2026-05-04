"use client";

import React, { useMemo, useRef } from "react";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormField, FormInput } from "@/shared/ui/adminWeb/form";
import type { SupportFeePayerRegisterRequest } from "@/entities/adminWeb/support/api/feePayerManageApi";
import { useFeePayerBasicRegister } from "../model";
import { FeePayerSewageVolumeEstimateSection } from "./FeePayerSewageVolumeEstimateSection";
import "@/shared/styles/admin/register-form.css";

export interface FeePayerBasicRegisterFormProps {
  /** 상세 URL의 `proId` — 전달 시 목 행으로 폼·오수량 산정 초기화(등록과 동일 편집) */
  seedProId?: string | null;
}

export const FeePayerBasicRegisterForm: React.FC<
  FeePayerBasicRegisterFormProps
> = ({ seedProId = null }) => {
  const persistRequestBuilderRef = useRef<
    (() => SupportFeePayerRegisterRequest | null) | null
  >(null);

  const {
    applicantNm,
    telNo,
    zipCode,
    adres,
    detailAdres,
    errors,
    loading,
    showInfoDialog,
    infoDialogTitle,
    infoDialogMessage,
    infoDialogType,
    seedInvalid,
    detailLoading,
    detailErrorMessage,
    sewageInitialEntries,
    feePayerItemId,
    setFeePayerItemId,
    getBasicInfoBody,
    persistBuildStateRef,
    persistRegisterFailMessageRef,
    handleInputChange,
    noopInputChange,
    handleAddressSearch,
    handleSubmit,
    handleCancel,
    handleInfoDialogClose,
  } = useFeePayerBasicRegister({ seedProId, persistRequestBuilderRef });

  const feePayerApi = useMemo(
    () => ({
      getBasicInfoBody,
      feePayerItemId: feePayerItemId ?? seedProId?.trim() ?? undefined,
      onFeePayerItemId: setFeePayerItemId,
    }),
    [getBasicInfoBody, feePayerItemId, seedProId, setFeePayerItemId],
  );

  if (seedInvalid) {
    return (
      <>
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-8 text-sm text-gray-600">
            {detailErrorMessage.trim() ||
              "조회할 수 없는 대상이거나 잘못된 링크입니다. 목록에서 다시 시도해주세요."}
          </div>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-base"
            style={{ minWidth: "100px" }}
            onClick={handleCancel}
          >
            닫기
          </button>
        </div>
      </>
    );
  }

  if (seedProId?.trim() && detailLoading) {
    return (
      <div className="bg-white rounded-lg shadow px-6 py-12 text-center text-sm text-gray-600">
        불러오는 중입니다…
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="fee-payer-register-scope"
      >
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h5 className="text-lg font-semibold mb-0">기본정보</h5>
          </div>
          <div className="p-0">
            <div className="flex flex-wrap">
              <FormField
                label="성명"
                required
                isFirstRow
                isFirstInRow
                suppressBottomBorder
                error={errors.applicantNm}
              >
                <FormInput
                  type="text"
                  name="applicantNm"
                  value={applicantNm}
                  onChange={handleInputChange}
                  error={errors.applicantNm}
                  placeholder="성명을 입력하세요"
                  maxLength={100}
                  autoComplete="name"
                />
              </FormField>
              <FormField
                label="전화번호"
                isFirstInRow
                suppressBottomBorder
                error={errors.telNo}
              >
                <FormInput
                  type="tel"
                  name="telNo"
                  value={telNo}
                  onChange={handleInputChange}
                  error={errors.telNo}
                  placeholder="전화번호를 입력하세요"
                  maxLength={13}
                  autoComplete="tel"
                />
              </FormField>
            </div>
            {/* 주소 (다음 API 연동: 주소 입력란 옆에 돋보기로 조회) */}
            <div className="flex flex-wrap">
              <FormField
                label="주소"
                required
                fullWidth
                forceTopBorder
                error={errors.zipCode || errors.adres || errors.detailAdres}
              >
                <div className="w-full flex items-stretch gap-1">
                  <div className="w-28 flex-shrink-0 flex flex-col">
                    <FormInput
                      type="text"
                      name="zipCode"
                      value={zipCode}
                      onChange={noopInputChange}
                      readOnly
                      placeholder="우편번호"
                      className="bg-gray-100"
                      error={errors.zipCode}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex items-stretch gap-1">
                    <div className="flex-1 min-w-0 flex flex-col">
                      <FormInput
                        type="text"
                        name="adres"
                        value={adres}
                        onChange={noopInputChange}
                        readOnly
                        placeholder="주소"
                        className="bg-gray-100"
                        error={errors.adres}
                      />
                    </div>
                    <button
                      type="button"
                      className="flex items-center justify-center w-10 min-w-[2.5rem] h-10 min-h-[2.5rem] flex-shrink-0 rounded-none border-0 bg-[#1967d2] hover:bg-[#1557b0] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleAddressSearch}
                      title="주소 검색"
                      aria-label="주소 검색"
                      disabled={loading}
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
                      onChange={handleInputChange}
                      placeholder="상세주소"
                      maxLength={200}
                      error={errors.detailAdres}
                    />
                  </div>
                </div>
              </FormField>
            </div>
          </div>
        </div>

        <FeePayerSewageVolumeEstimateSection
          key={seedProId?.trim() ? `detail-${seedProId.trim()}` : "register"}
          initialEntries={sewageInitialEntries}
          feePayerApi={feePayerApi}
          persistRequestBuilderRef={persistRequestBuilderRef}
          persistBuildStateRef={persistBuildStateRef}
          persistRegisterFailMessageRef={persistRegisterFailMessageRef}
        />

        <div className="flex justify-end mt-4 gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-base disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            disabled={loading}
          >
            {loading ? "처리 중..." : "저장"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-base"
            style={{ minWidth: "100px" }}
            onClick={handleCancel}
            disabled={loading}
          >
            닫기
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showInfoDialog}
        title={infoDialogTitle}
        message={infoDialogMessage}
        type={infoDialogType}
        confirmText="확인"
        onConfirm={handleInfoDialogClose}
        onCancel={handleInfoDialogClose}
      />
    </>
  );
};
