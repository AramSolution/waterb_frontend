"use client";

import React from "react";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormField, FormInput } from "@/shared/ui/adminWeb/form";
import { useFeePayerBasicRegister } from "../model";
import { FeePayerSewageVolumeEstimateSection } from "./FeePayerSewageVolumeEstimateSection";
import "@/shared/styles/admin/register-form.css";

export const FeePayerBasicRegisterForm: React.FC = () => {
  const {
    applicantNm,
    zipCode,
    adres,
    detailAdres,
    errors,
    loading,
    showInfoDialog,
    handleInputChange,
    noopInputChange,
    handleAddressSearch,
    handleSubmit,
    handleCancel,
    handleInfoDialogClose,
  } = useFeePayerBasicRegister();

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
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
              {/* 첫 행 우측 반칸: 격자 세로·하단선만 (라벨 공백 → FormField 빈 라벨 레이아웃) */}
              <FormField label=" " isFirstInRow suppressBottomBorder>
                <span className="sr-only">추가 입력 없음</span>
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

        <FeePayerSewageVolumeEstimateSection />

        <div className="flex justify-end mt-6 gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            disabled={loading}
          >
            {loading ? "처리 중..." : "저장"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-[13px]"
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
        title="알림"
        message="등록 API는 아직 연결되지 않았습니다. 목록으로 이동합니다."
        type="primary"
        confirmText="확인"
        cancelText="닫기"
        onConfirm={handleInfoDialogClose}
        onCancel={handleInfoDialogClose}
      />
    </>
  );
};
