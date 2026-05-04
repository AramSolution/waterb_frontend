"use client";

import React, { useRef } from "react";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  FormDatePicker,
  FormTextarea,
  FormSelect,
  RichTextEditor,
} from "@/shared/ui/adminWeb/form";
import { useSupportUpdate } from "../model";
import { useRecruitTargetOptions } from "../../lib/recruitTargetOptions";
import { buildRunStaSelectOptions } from "@/entities/adminWeb/support/lib/runStaAdmin";
import { PRO_NATURE_LABELS } from "@/entities/adminWeb/support/lib/proPartNature";
import "@/shared/styles/admin/register-form.css";

export const SupportUpdateForm: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promoFileInputRef = useRef<HTMLInputElement>(null);
  const {
    formData,
    loading,
    detailLoading,
    error,
    errors,
    selectedFiles,
    selectedPromoFile,
    existingProFileList,
    existingFileList,
    handleFilesSelected,
    handlePromoFileSelected,
    removeFile,
    removePromoFile,
    deleteExistingProFile,
    deleteExistingFile,
    downloadExistingAttachment,
    handleDeleteProFileClick,
    handleDeleteFileClick,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleCheckboxChange,
    handleGroupSelectAll,
    isGroupAllSelected,
    handleReqGbChange,
    handleProNatureChange,
    handleBusinessContentChange,
    handleProgramTypeChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
    // 삭제 확인 다이얼로그
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    deleteConfirmType,
    fileToDelete,
    setFileToDelete,
    existingProGb,
    from,
    chargeDeptOptions,
    chargeDeptLoading,
  } = useSupportUpdate();

  // 파일 타입 아이콘 가져오기
  const getFileIconSrc = (fileName: string): string => {
    const ext =
      (fileName || "").toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/)?.[1] ??
      "";
    const base = "/images/adminWeb/icon";
    if (["gif", "jpg", "jpeg", "png", "bmp"].includes(ext))
      return `${base}/ico_file_img.png`;
    if (["xls", "xlsx", "xlsm"].includes(ext))
      return `${base}/ico_file_xlsx.png`;
    if (ext === "pdf") return `${base}/ico_file_pdf.png`;
    if (ext === "pptx") return `${base}/ico_file_ppt.png`;
    if (["hwp", "hwpx"].includes(ext)) return `${base}/ico_file_hwp.png`;
    return `${base}/ico_file_new_20.png`;
  };

  // 사업대상 옵션 (EDR003 API 조회 후 그룹핑)
  const {
    targetGroups,
    otherItems,
    loading: recruitTargetLoading,
    error: recruitTargetError,
  } = useRecruitTargetOptions();

  const statusOptions = buildRunStaSelectOptions(formData.statusCode);

  if (detailLoading) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">데이터를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <>
      {error && <div className="p-6 text-center text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} noValidate>
        {/* ========== 기본정보 (홍보 등록과 동일: 홍보문구까지) ========== */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h5 className="text-lg font-semibold mb-0">기본정보</h5>
          </div>
          <div className="p-0">
        {/* 사업코드 + 상태 (최상단) */}
        <div className="flex flex-wrap">
          <FormField
            label="사업코드"
            isFirstRow
            isFirstInRow
            error={errors.businessCode}
          >
            <FormInput
              type="text"
              name="businessCode"
              value={formData.businessCode}
              onChange={handleInputChange}
              error={errors.businessCode}
              maxLength={50}
              className="bg-gray-100"
              readOnly
              disabled
            />
          </FormField>
          <FormField
            label="상태"
            isFirstRow
            isFirstInRow
            error={errors.statusCode}
          >
            <FormSelect
              name="statusCode"
              value={formData.statusCode}
              onChange={handleInputChange}
              options={statusOptions}
              error={errors.statusCode}
            />
          </FormField>
        </div>

        {/* 사업명 + 사업대상명 */}
        <div className="flex flex-wrap">
          <FormField
            label="사업명"
            required
            isFirstInRow
            error={errors.businessNm}
          >
            <FormInput
              type="text"
              name="businessNm"
              value={formData.businessNm}
              onChange={handleInputChange}
              error={errors.businessNm}
              placeholder="사업명을 입력하세요"
              maxLength={200}
            />
          </FormField>
          <FormField label="사업대상명" isFirstInRow error={errors.targetName}>
            <FormInput
              type="text"
              name="targetName"
              value={formData.targetName}
              onChange={handleInputChange}
              error={errors.targetName}
              placeholder="예) 초등학생 1~6학년, 중학생"
              maxLength={200}
            />
          </FormField>
        </div>

        {/* 신청구분 + 담당부서 (샘플업무/스터디 공통) */}
        <div className="flex flex-wrap">
          <FormField
            label="신청구분"
            required
            isFirstRow
            isFirstInRow
            error={errors.reqGb}
          >
            <div id="support-req-gb" className="w-full">
              <div className="flex flex-wrap gap-6 py-2">
                {[
                  { label: "학생", index: 0 },
                  { label: "학부모/일반", index: 1 },
                ].map(({ label, index }) => (
                  <label
                    key={index}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.reqGb[index]}
                      onChange={(e) =>
                        handleReqGbChange(index, e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-[13px] text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              {errors.reqGb && (
                <div className="text-red-600 text-sm mt-1 px-2">
                  {errors.reqGb}
                </div>
              )}
            </div>
          </FormField>
          <FormField label="담당부서" isFirstInRow>
            <FormSelect
              name="chargeDept"
              value={formData.chargeDept}
              onChange={handleInputChange}
              options={chargeDeptOptions}
              loading={chargeDeptLoading}
              loadingText="담당부서 목록 불러오는 중..."
              placeholder="선택하세요"
              emptyText="등록된 담당부서 코드가 없습니다"
            />
          </FormField>
        </div>

        {/* 스터디사업 전용: 기초생활수급자 / 차상위계층 / 한부모가족 - 각각 한 줄, 동일 디자인 */}
        {existingProGb === "02" && (
          <>
            <div className="flex flex-wrap">
              <FormField label="기초생활수급자" fullWidth>
                <div className="flex items-center gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      const event = {
                        target: { name: "basicYn", value: "Y" },
                      } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }}
                    className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-l border border-gray-300 transition-colors ${
                      formData.basicYn === "Y"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{ minWidth: "80px" }}
                  >
                    예
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const event = {
                        target: { name: "basicYn", value: "N" },
                      } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }}
                    className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-r border-t border-r border-b border-gray-300 transition-colors ${
                      formData.basicYn === "N"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{ minWidth: "80px" }}
                  >
                    아니요
                  </button>
                </div>
              </FormField>
            </div>

            <div className="flex flex-wrap">
              <FormField label="차상위계층" fullWidth>
                <div className="flex items-center gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      const event = {
                        target: { name: "poorYn", value: "Y" },
                      } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }}
                    className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-l border border-gray-300 transition-colors ${
                      formData.poorYn === "Y"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{ minWidth: "80px" }}
                  >
                    예
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const event = {
                        target: { name: "poorYn", value: "N" },
                      } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }}
                    className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-r border-t border-r border-b border-gray-300 transition-colors ${
                      formData.poorYn === "N"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{ minWidth: "80px" }}
                  >
                    아니요
                  </button>
                </div>
              </FormField>
            </div>

            <div className="flex flex-wrap">
              <FormField label="한부모가족" fullWidth>
                <div className="flex items-center gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      const event = {
                        target: { name: "singleYn", value: "Y" },
                      } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }}
                    className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-l border border-gray-300 transition-colors ${
                      formData.singleYn === "Y"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{ minWidth: "80px" }}
                  >
                    예
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const event = {
                        target: { name: "singleYn", value: "N" },
                      } as React.ChangeEvent<HTMLInputElement>;
                      handleInputChange(event);
                    }}
                    className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-r border-t border-r border-b border-gray-300 transition-colors ${
                      formData.singleYn === "N"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{ minWidth: "80px" }}
                  >
                    아니요
                  </button>
                </div>
              </FormField>
            </div>
          </>
        )}

        {/* 사업대상 */}
        <div className="flex flex-wrap">
          <FormField label="사업대상" error={recruitTargetError} fullWidth>
            <div className="flex flex-wrap gap-6 py-2">
              {recruitTargetLoading ? (
                <span className="text-[13px] text-gray-500">
                  사업대상 목록 불러오는 중...
                </span>
              ) : (
                <>
                  {/* 초등학교, 중학교, 고등학교 그룹 */}
                  {targetGroups.map((group) => {
                    const isAllSelected = isGroupAllSelected(group.values);
                    return (
                      <div
                        key={group.groupLabel}
                        className="flex flex-col gap-2 min-w-[200px]"
                      >
                        <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={(e) =>
                                handleGroupSelectAll(
                                  group.values,
                                  e.target.checked,
                                )
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-[13px] font-semibold text-gray-800">
                              {group.groupLabel}
                            </span>
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {group.values.map((value, index) => (
                            <label
                              key={value}
                              className="flex items-center gap-1.5 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                name="recruitTarget"
                                value={value}
                                checked={formData.recruitTarget.includes(value)}
                                onChange={handleCheckboxChange}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-[13px] text-gray-700">
                                {group.labels[index]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* 기타 옵션 (T1 등) - 그룹 전체 선택 + 개별 체크박스 */}
                  {otherItems.length > 0 &&
                    (() => {
                      const otherValues = otherItems.map((i) => i.value);
                      const isAllSelected = isGroupAllSelected(otherValues);
                      return (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) =>
                                  handleGroupSelectAll(
                                    otherValues,
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-[13px] font-semibold text-gray-800">
                                기타
                              </span>
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {otherItems.map((item) => (
                              <label
                                key={item.value}
                                className="flex items-center gap-1.5 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  name="recruitTarget"
                                  value={item.value}
                                  checked={formData.recruitTarget.includes(
                                    item.value,
                                  )}
                                  onChange={handleCheckboxChange}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-[13px] text-gray-700">
                                  {item.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                </>
              )}
            </div>
          </FormField>
        </div>

        {/* 담당자 · 연락처 (사업대상 아래, 홍보 등록과 동일) */}
        <div className="flex flex-wrap">
          <FormField label="담당자">
            <FormInput
              type="text"
              name="chargePerson"
              value={formData.chargePerson}
              onChange={handleInputChange}
              placeholder="담당자를 입력하세요"
              maxLength={50}
            />
          </FormField>
          <FormField label="연락처" isFirstInRow>
            <FormInput
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              placeholder="연락처를 입력하세요"
              maxLength={50}
            />
          </FormField>
        </div>

        {/* 사업성격 (PRO_PART, 홍보 등록과 동일) */}
        <div className="flex flex-wrap">
          <FormField label="사업성격" fullWidth>
            <div className="flex flex-wrap gap-6 py-2">
              {PRO_NATURE_LABELS.map((label, index) => (
                <label
                  key={label}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.proNature[index]}
                    onChange={(e) =>
                      handleProNatureChange(index, e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[13px] text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </FormField>
        </div>

        {/* 홍보문구 (PRO_SUM) */}
        <div className="flex flex-wrap">
          <FormField label="홍보문구" fullWidth error={errors.businessSummary}>
            <FormTextarea
              name="businessSummary"
              value={formData.businessSummary}
              onChange={handleInputChange}
              error={errors.businessSummary}
              placeholder="홍보문구를 입력하세요"
              minHeight="150px"
              maxLength={1024}
              showCharCount={true}
            />
          </FormField>
        </div>
          </div>
        </div>

        {/* ========== 사업개요 (홍보 등록 두 번째 박스와 동일 구분) ========== */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h5 className="text-lg font-semibold mb-0">사업개요</h5>
          </div>
          <div className="p-0">
        {/* 사업기간 + 사업구분(스터디) */}
        <div className="flex flex-wrap">
          <FormField
            label="사업기간"
            isFirstRow
            isFirstInRow
            forceLabelLeftBorder
            error={errors.businessPeriodStart || errors.businessPeriodEnd}
          >
            <div className="w-full flex items-center gap-2">
              <FormDatePicker
                name="businessPeriodStart"
                value={formData.businessPeriodStart}
                onChange={handleInputChange}
                error={errors.businessPeriodStart}
                placeholder="시작일"
                className="flex-1"
                maxDate={
                  formData.businessPeriodEnd
                    ? new Date(formData.businessPeriodEnd)
                    : undefined
                }
              />
              <span className="text-gray-600 flex-shrink-0">~</span>
              <FormDatePicker
                name="businessPeriodEnd"
                value={formData.businessPeriodEnd}
                onChange={handleInputChange}
                error={errors.businessPeriodEnd}
                placeholder="종료일"
                className="flex-1"
                minDate={
                  formData.businessPeriodStart
                    ? new Date(formData.businessPeriodStart)
                    : undefined
                }
              />
            </div>
          </FormField>
          {existingProGb === "02" && (
            <FormField label="사업구분" required isFirstInRow error={errors.programType}>
              <div className="flex items-center gap-0">
                <button
                  type="button"
                  onClick={() => handleProgramTypeChange("01", true)}
                  className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-l border border-gray-300 transition-colors ${
                    formData.programType.includes("01")
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{ minWidth: "80px" }}
                >
                  마중물
                </button>
                <button
                  type="button"
                  onClick={() => handleProgramTypeChange("02", true)}
                  className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-r border-t border-r border-b border-gray-300 transition-colors ${
                    formData.programType.includes("02")
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{ minWidth: "80px" }}
                >
                  희망
                </button>
              </div>
            </FormField>
          )}
        </div>

        {/* 사업내용 (PRO_DESC) */}
        <div className="flex flex-wrap">
          <FormField label="사업내용" fullWidth error={errors.businessContent}>
            <RichTextEditor
              name="businessContent"
              value={formData.businessContent}
              onChange={handleBusinessContentChange}
              placeholder="사업내용을 입력하세요"
              error={errors.businessContent}
              minHeight="300px"
            />
          </FormField>
        </div>

        {/* 모집기간 + 모집인원수 */}
        <div className="flex flex-wrap">
          <FormField
            label="모집기간"
            required
            error={errors.recruitStartDate || errors.recruitEndDate}
          >
            <div className="w-full flex items-center gap-2">
              <FormDatePicker
                name="recruitStartDate"
                value={formData.recruitStartDate}
                onChange={handleInputChange}
                error={errors.recruitStartDate}
                placeholder="시작일을 선택하세요"
                className="flex-1"
                maxDate={
                  formData.recruitEndDate
                    ? new Date(formData.recruitEndDate)
                    : undefined
                }
              />
              <span className="text-gray-600">~</span>
              <FormDatePicker
                name="recruitEndDate"
                value={formData.recruitEndDate}
                onChange={handleInputChange}
                error={errors.recruitEndDate}
                placeholder="종료일을 선택하세요"
                className="flex-1"
                minDate={
                  formData.recruitStartDate
                    ? new Date(formData.recruitStartDate)
                    : undefined
                }
              />
            </div>
          </FormField>
          <FormField
            label="모집인원수"
            isFirstInRow
            error={errors.recruitCount}
          >
            <div className="relative w-full">
              <FormInput
                type="text"
                name="recruitCount"
                value={formData.recruitCount}
                onChange={handleInputChange}
                error={errors.recruitCount}
                placeholder="모집인원수를 입력하세요"
                maxLength={10}
                className="pr-8 text-right"
              />
              <span
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700 pointer-events-none"
                style={{ fontSize: "14px" }}
              >
                명
              </span>
            </div>
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField label="신청방법" fullWidth>
            <FormTextarea
              name="applyMethod"
              value={formData.applyMethod}
              onChange={handleInputChange}
              placeholder="신청방법을 입력하세요"
              rows={3}
              maxLength={1000}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField label="홈페이지" fullWidth>
            <FormInput
              type="text"
              name="homepage"
              value={formData.homepage}
              onChange={handleInputChange}
              placeholder="URL 입력"
              maxLength={500}
            />
          </FormField>
        </div>

        {/* 기타내용 (ETC_NM, 최대 512자) */}
        <div className="flex flex-wrap">
          <FormField label="기타내용" fullWidth error={errors.etcNm}>
            <FormTextarea
              name="etcNm"
              value={formData.etcNm}
              onChange={handleInputChange}
              error={errors.etcNm}
              placeholder="기타내용을 입력하세요"
              minHeight="100px"
              maxLength={512}
              showCharCount={true}
            />
          </FormField>
        </div>

        {/* 홍보사진 */}
        <div className="w-full register-form-mobile-row">
          <div
            className="register-form-mobile-wrapper md:flex md:items-stretch"
            style={{ minHeight: "45px" }}
          >
            <div
              className="w-full md:w-[12.5%] flex items-center gap-2 m-0 register-form-label bg-gray-100"
              style={{
                border: "1px solid #dee2e6",
                borderTop: "none",
                padding: "5px",
              }}
            >
              <span>홍보사진</span>
              <input
                ref={promoFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handlePromoFileSelected(files[0]);
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 cursor-pointer flex-shrink-0"
                onClick={() => promoFileInputRef.current?.click()}
                title="파일 선택"
                aria-label="파일 선택"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
            </div>
            <div className="w-full md:flex-1 flex flex-col min-h-[45px]">
              <div
                className="register-form-mobile-field w-full flex flex-col gap-2 flex-1 min-h-[45px]"
                style={{
                  border: "1px solid #dee2e6",
                  borderLeft: "none",
                  borderTop: "none",
                  padding: "5px",
                  minHeight: "45px",
                }}
              >
                {/* 홍보사진 1개만 표시: 새로 선택한 파일이 있으면 그것만, 없으면 DB 기존 파일만 */}
                {selectedPromoFile ? (
                  <div className="attach-file-down flex items-center gap-2 py-2.5 px-2 rounded border border-gray-200 bg-gray-50 min-h-[30px]">
                    <img
                      src={getFileIconSrc(selectedPromoFile.name)}
                      alt=""
                      className="w-5 h-5 flex-shrink-0 object-contain"
                      aria-hidden
                    />
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="text-gray-800 text-sm truncate min-w-0"
                        title={selectedPromoFile.name}
                      >
                        {selectedPromoFile.name}
                      </span>
                      <button
                        type="button"
                        className="delFileBtn flex-shrink-0 w-5 h-5 bg-transparent border-0 p-0 cursor-pointer bg-center bg-no-repeat bg-contain hover:opacity-80"
                        style={{
                          backgroundImage:
                            "url(/images/adminWeb/icon/ico_file_del_new_20.png)",
                        }}
                        onClick={removePromoFile}
                        title="파일삭제"
                        aria-label="파일삭제"
                      />
                    </div>
                  </div>
                ) : (
                  existingProFileList.map((file) => (
                    <div
                      key={file.seq ?? file.orgfNm ?? file.fileId}
                      className="attach-file-down flex items-center gap-2 py-2.5 px-2 rounded border border-gray-200 bg-gray-50 min-h-[30px]"
                    >
                      <img
                        src={getFileIconSrc(file.orgfNm ?? "")}
                        alt=""
                        className="w-5 h-5 flex-shrink-0 object-contain"
                        aria-hidden
                      />
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <button
                          type="button"
                          className="text-gray-800 text-sm truncate min-w-0 text-left underline-offset-2 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit max-w-full"
                          title={`${file.orgfNm ?? "파일"} — 클릭 시 다운로드`}
                          onClick={() =>
                            downloadExistingAttachment(
                              file.fileId ?? "",
                              file.seq ?? "",
                              file.orgfNm,
                            )
                          }
                        >
                          {file.orgfNm ?? "파일"}
                        </button>
                        <button
                          type="button"
                          className="delFileBtn flex-shrink-0 w-5 h-5 bg-transparent border-0 p-0 cursor-pointer bg-center bg-no-repeat bg-contain hover:opacity-80"
                          style={{
                            backgroundImage:
                              "url(/images/adminWeb/icon/ico_file_del_new_20.png)",
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProFileClick(
                              file.fileId ?? "",
                              file.seq ?? "",
                            );
                          }}
                          title="파일삭제"
                          aria-label="파일삭제"
                        />
                      </div>
                    </div>
                  ))
                )}
                {existingProFileList.length === 0 && !selectedPromoFile && (
                  <div className="min-h-[30px] flex items-center pt-2">
                    <span className="text-gray-400 text-sm">
                      파일을 선택하세요 (한 개 가능)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 첨부파일 */}
        <div className="w-full register-form-mobile-row">
          <div
            className="register-form-mobile-wrapper md:flex md:items-stretch"
            style={{ minHeight: "45px" }}
          >
            <div
              className="w-full md:w-[12.5%] flex items-center gap-2 m-0 register-form-label bg-gray-100"
              style={{
                border: "1px solid #dee2e6",
                borderTop: "none",
                padding: "5px",
              }}
            >
              <span>첨부파일</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                className="hidden"
                aria-hidden
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleFilesSelected(files);
                  }
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 cursor-pointer flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="파일 선택 (여러 개)"
                aria-label="파일 선택 (여러 개)"
              >
                {/* 클립 + 플러스: 여러 개 첨부 구분용 */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  <line x1="21" y1="19" x2="21" y2="23" />
                  <line x1="19" y1="21" x2="23" y2="21" />
                </svg>
              </button>
            </div>
            <div className="w-full md:flex-1 flex flex-col min-h-[45px]">
              <div
                className="register-form-mobile-field w-full flex flex-col gap-2 flex-1 min-h-[45px]"
                style={{
                  border: "1px solid #dee2e6",
                  borderLeft: "none",
                  borderTop: "none",
                  padding: "5px",
                  minHeight: "45px",
                }}
              >
                {existingFileList.map((file) => (
                  <div
                    key={file.seq ?? file.orgfNm ?? file.fileId}
                    className="attach-file-down flex items-center gap-2 py-2.5 px-2 rounded border border-gray-200 bg-gray-50 min-h-[30px]"
                  >
                    <img
                      src={getFileIconSrc(file.orgfNm ?? "")}
                      alt=""
                      className="w-5 h-5 flex-shrink-0 object-contain"
                      aria-hidden
                    />
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        className="text-gray-800 text-sm truncate min-w-0 text-left underline-offset-2 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit max-w-full"
                        title={`${file.orgfNm ?? "파일"} — 클릭 시 다운로드`}
                        onClick={() =>
                          downloadExistingAttachment(
                            file.fileId ?? "",
                            file.seq ?? "",
                            file.orgfNm,
                          )
                        }
                      >
                        {file.orgfNm ?? "파일"}
                      </button>
                      <button
                        type="button"
                        className="delFileBtn flex-shrink-0 w-5 h-5 bg-transparent border-0 p-0 cursor-pointer bg-center bg-no-repeat bg-contain hover:opacity-80"
                        style={{
                          backgroundImage:
                            "url(/images/adminWeb/icon/ico_file_del_new_20.png)",
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteFileClick(
                            file.fileId ?? "",
                            file.seq ?? "",
                          );
                        }}
                        title="파일삭제"
                        aria-label="파일삭제"
                      />
                    </div>
                  </div>
                ))}
                {selectedFiles.length > 0
                  ? selectedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="attach-file-down flex items-center gap-2 py-2.5 px-2 rounded border border-gray-200 bg-gray-50 min-h-[30px]"
                      >
                        <img
                          src={getFileIconSrc(item.file.name)}
                          alt=""
                          className="w-5 h-5 flex-shrink-0 object-contain"
                          aria-hidden
                        />
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className="text-gray-800 text-sm truncate min-w-0"
                            title={item.file.name}
                          >
                            {item.file.name} (신규)
                          </span>
                          <button
                            type="button"
                            className="delFileBtn flex-shrink-0 w-5 h-5 bg-transparent border-0 p-0 cursor-pointer bg-center bg-no-repeat bg-contain hover:opacity-80"
                            style={{
                              backgroundImage:
                                "url(/images/adminWeb/icon/ico_file_del_new_20.png)",
                            }}
                            onClick={() => removeFile(item.id)}
                            title="파일삭제"
                            aria-label="파일삭제"
                          />
                        </div>
                      </div>
                    ))
                  : null}
                {existingFileList.length === 0 &&
                  selectedFiles.length === 0 && (
                    <div className="min-h-[30px] flex items-center pt-2">
                      <span className="text-gray-400 text-sm">
                        파일을 선택하세요 (여러 개 가능)
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>

        {/* 저장·닫기 (홍보 등록과 동일: 사업개요 카드 밖) */}
        <div className="flex justify-end mt-6 gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            disabled={loading || detailLoading}
          >
            {loading ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-[13px]"
            style={{ minWidth: "100px" }}
            onClick={handleCancel}
            disabled={loading || detailLoading}
          >
            닫기
          </button>
        </div>
      </form>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteConfirmDialog}
        title="파일 삭제"
        message={
          deleteConfirmType === "proFile"
            ? "해당 홍보사진을 삭제하시겠습니까?"
            : "해당 첨부파일을 삭제하시겠습니까?"
        }
        type="danger"
        onConfirm={async () => {
          if (!fileToDelete) {
            setShowDeleteConfirmDialog(false);
            return;
          }

          // fileToDelete 값을 먼저 저장
          const { fileId, seq } = fileToDelete;
          const type = deleteConfirmType;

          // 다이얼로그 닫기
          setShowDeleteConfirmDialog(false);
          setFileToDelete(null);

          // 삭제 실행
          try {
            if (type === "proFile") {
              await deleteExistingProFile(fileId, seq);
            } else {
              await deleteExistingFile(fileId, seq);
            }
          } catch (error) {
            console.error("파일 삭제 중 오류:", error);
          }
        }}
        onCancel={() => {
          setShowDeleteConfirmDialog(false);
          setFileToDelete(null);
        }}
        confirmText="삭제"
      />

      {/* 메시지 다이얼로그 */}
      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        confirmText="확인"
        type={messageDialogType}
        onConfirm={handleMessageDialogClose}
        onCancel={handleMessageDialogClose}
      />
    </>
  );
};
