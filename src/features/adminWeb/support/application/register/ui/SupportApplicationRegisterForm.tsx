"use client";

import React, { useRef, useMemo } from "react";
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  FormRadioGroup,
} from "@/shared/ui/adminWeb/form";
import type { RadioOption } from "@/shared/ui/adminWeb/form";
import { Pagination, ConfirmDialog } from "@/shared/ui/adminWeb";
import { useSupportApplicationRegister } from "../model";
import type { SupportApplicationMode } from "../model/types";
import "@/shared/styles/admin/register-form.css";

interface SupportApplicationRegisterFormProps {
  businessId?: string;
  programTitle?: string;
  mode?: SupportApplicationMode;
  /** 지원사업신청ID(REQ_ID). 상세 모드 시 by-req-id API 호출에 사용 */
  reqId?: string;
}

export const SupportApplicationRegisterForm: React.FC<
  SupportApplicationRegisterFormProps
> = ({ businessId, programTitle = "", mode = "register", reqId }) => {
  const isDetailMode = mode === "detail";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    formData,
    loading,
    error,
    errors,
    selectedFiles,
    existingFiles,
    bankOptions,
    bankLoading,
    // 학교 검색 모달
    showSchoolModal,
    schoolSearchKeyword,
    setSchoolSearchKeyword,
    schoolList,
    schoolCurrentPage,
    setSchoolCurrentPage,
    schoolTotalPages,
    schoolLoading,
    handleSchoolSearch,
    handleSchoolSearchKeyPress,
    handleSchoolSelect,
    handleCloseSchoolModal,
    // 보호자 검색 모달
    showParentModal,
    parentSearchKeyword,
    setParentSearchKeyword,
    parentList,
    parentCurrentPage,
    setParentCurrentPage,
    parentTotalPages,
    parentLoading,
    handleParentSearch,
    handleParentSearchKeyPress,
    handleParentSelect,
    handleOpenParentModal,
    handleCloseParentModal,
    // 학생 콤보박스 (부모별 자녀 목록)
    studentList,
    studentLoading,
    handleStudentSelect,
    // 학급 정보
    classOptions,
    classOptions2,
    classLoading,
    handleInputChange,
    handleRadioChange,
    handleCheckboxChange,
    handleFilesSelected,
    removeFile,
    deleteExistingFile,
    handleDeleteFileClick,
    downloadExistingSupportApplicationAttachment,
    handleSubmit,
    handleCancel,
    // 메시지 다이얼로그
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleMessageDialogClose,
    // 삭제 확인 다이얼로그
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    fileToDelete,
    setFileToDelete,
  } = useSupportApplicationRegister(businessId, {
    mode,
    reqId,
  });

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

  // 성별 옵션
  const genderOptions: RadioOption[] = [
    { value: "M", label: "남" },
    { value: "F", label: "여" },
  ];

  // 은행 옵션은 useSupportApplicationRegister에서 API로 가져옴 (ARM002)

  return (
    <>
      {error && <div className="p-6 text-center text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} noValidate>
        {/* 사업코드 + 상태 */}
        <div className="flex flex-wrap">
          <FormField label="사업코드" isFirstRow isFirstInRow>
            <FormInput
              type="text"
              name="businessId"
              value={businessId || ""}
              onChange={handleInputChange}
              readOnly
            />
          </FormField>
          <FormField label="상태" isFirstInRow error={errors.status}>
            <FormSelect
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: "01", label: "임시저장" },
                { value: "02", label: "신청" },
                { value: "03", label: "승인" },
                { value: "04", label: "완료" },
                { value: "11", label: "반려" },
                { value: "12", label: "중단" },
                { value: "99", label: "취소" },
              ]}
              error={errors.status}
            />
          </FormField>
        </div>

        {/* 사업명 + 선정여부 */}
        <div className="flex flex-wrap">
          <FormField label="사업명">
            <FormInput
              type="text"
              name="programTitle"
              value={programTitle || formData.programTitle || ""}
              onChange={handleInputChange}
              readOnly
            />
          </FormField>
          <FormField
            label="선정여부"
            isFirstInRow
            error={errors.selectionStatus}
          >
            <FormSelect
              name="selectionStatus"
              value={formData.selectionStatus}
              onChange={handleInputChange}
              options={[
                { value: "N", label: "미선정" },
                { value: "Y", label: "선정" },
                { value: "R", label: "예비" },
              ]}
              error={errors.selectionStatus}
            />
          </FormField>
        </div>

        {/* 유형 + 활동범위 (한 줄) */}
        <div className="flex flex-wrap">
          <FormField label="유형" isFirstInRow error={errors.applicationType}>
            <div className="flex items-stretch gap-0">
              <button
                type="button"
                onClick={() => {
                  const event = {
                    target: { name: "applicationType", value: "INDIVIDUAL" },
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleInputChange(event);
                }}
                className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-l border border-gray-300 transition-colors whitespace-nowrap ${
                  formData.applicationType === "INDIVIDUAL"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                style={{ minWidth: "80px" }}
              >
                1인탐구형
              </button>
              <button
                type="button"
                onClick={() => {
                  const event = {
                    target: { name: "applicationType", value: "GROUP" },
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleInputChange(event);
                }}
                className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-r border-t border-r border-b border-gray-300 transition-colors whitespace-nowrap ${
                  formData.applicationType === "GROUP"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                style={{ minWidth: "80px" }}
              >
                모둠 탐구형
              </button>
            </div>
          </FormField>
          <FormField label="활동범위" isFirstInRow error={errors.activityScope}>
            <div className="flex items-stretch gap-0">
              <button
                type="button"
                onClick={() => {
                  const event = {
                    target: { name: "activityScope", value: "INSIDE" },
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleInputChange(event);
                }}
                className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-l border border-gray-300 transition-colors whitespace-nowrap ${
                  formData.activityScope === "INSIDE"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                style={{ minWidth: "80px" }}
              >
                군산 내
              </button>
              <button
                type="button"
                onClick={() => {
                  const event = {
                    target: { name: "activityScope", value: "OUTSIDE" },
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleInputChange(event);
                }}
                className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-r border-t border-r border-b border-gray-300 transition-colors whitespace-nowrap ${
                  formData.activityScope === "OUTSIDE"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                style={{ minWidth: "80px" }}
              >
                군산 외
              </button>
            </div>
          </FormField>
        </div>

        {/* 보호자명 + 생년월일 */}
        <div className="flex flex-wrap">
          <FormField
            label="보호자명"
            required
            isFirstInRow
            error={errors.parentName}
          >
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <FormInput
                  type="text"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleInputChange}
                  error={errors.parentName}
                  placeholder="보호자명을 검색하세요"
                  readOnly
                  className="w-full"
                  style={{
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    cursor: "not-allowed",
                  }}
                />
              </div>
              <button
                type="button"
                className={`flex items-center justify-center w-10 h-10 rounded transition-colors flex-shrink-0 ${
                  isDetailMode
                    ? "bg-gray-300 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={!isDetailMode ? handleOpenParentModal : undefined}
                title="보호자 검색"
                aria-label="보호자 검색"
                disabled={isDetailMode}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="7"
                    cy="7"
                    r="4"
                    stroke="white"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d="M10 10L13 13"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </FormField>
          <FormField
            label="생년월일"
            required
            isFirstInRow
            error={errors.parentBirthDate}
          >
            <FormInput
              type="date"
              name="parentBirthDate"
              value={formData.parentBirthDate}
              onChange={handleInputChange}
              error={errors.parentBirthDate}
              readOnly
              style={{
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
          </FormField>
        </div>

        {/* 보호자 연락처 */}
        <div className="flex flex-wrap">
          <FormField
            label="보호자 연락처"
            required
            isFirstInRow
            error={errors.parentPhone}
          >
            <FormInput
              type="tel"
              name="parentPhone"
              value={formData.parentPhone}
              onChange={handleInputChange}
              error={errors.parentPhone}
              placeholder="010-1234-5678"
              maxLength={13}
              readOnly
              style={{
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
          </FormField>
          <FormField label="">
            <div className="w-full h-full" />
          </FormField>
        </div>

        {/* 계좌번호 */}
        <div className="flex flex-wrap">
          <FormField
            label="계좌번호"
            isFirstInRow
            error={errors.accountNumber}
            fullWidth
          >
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <FormSelect
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  options={bankOptions}
                  loading={bankLoading}
                  loadingText="은행 목록을 불러오는 중..."
                  emptyText="선택하세요"
                />
              </div>
              <div className="flex-1 min-w-0">
                <FormInput
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  error={errors.accountNumber}
                  placeholder="계좌번호를 입력하세요"
                  maxLength={50}
                />
              </div>
              <div className="flex-1 min-w-0">
                <FormInput
                  type="text"
                  name="depositorName"
                  value={formData.depositorName}
                  onChange={handleInputChange}
                  placeholder="예금주를 입력하세요"
                  maxLength={50}
                />
              </div>
            </div>
          </FormField>
        </div>

        {/* 학생명(콤보박스) + 성별 */}
        <div className="flex flex-wrap">
          <FormField
            label="학생명"
            required
            isFirstInRow
            error={errors.studentName}
          >
            <FormSelect
              name="studentEsntlId"
              value={formData.studentEsntlId}
              onChange={(e) => handleStudentSelect(e.target.value)}
              options={useMemo(() => {
                const emptyLabel = formData.parentEsntlId
                  ? "선택하세요"
                  : "학부모 선택 후 선택";
                return [
                  { value: "", label: emptyLabel },
                  ...studentList
                    .map((c) => ({
                      value: c.esntlId || "",
                      label: c.userNm || "",
                    }))
                    .filter((o) => o.value),
                ];
              }, [studentList, formData.parentEsntlId])}
              loading={studentLoading}
              emptyText="학부모 선택 후 자녀 목록이 표시됩니다."
              disabled={isDetailMode || !formData.parentEsntlId}
            />
          </FormField>
          <FormField label="성별" isFirstInRow error={errors.studentGender}>
            <FormInput
              type="text"
              name="studentGender"
              value={
                formData.studentGender === "M"
                  ? "남"
                  : formData.studentGender === "F"
                    ? "여"
                    : ""
              }
              onChange={handleInputChange}
              error={errors.studentGender}
              readOnly
              style={{
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
          </FormField>
        </div>

        {/* 학생 연락처 + 생년월일 */}
        <div className="flex flex-wrap">
          <FormField
            label="학생 연락처"
            required
            isFirstInRow
            error={errors.studentPhone}
          >
            <FormInput
              type="tel"
              name="studentPhone"
              value={formData.studentPhone}
              onChange={handleInputChange}
              error={errors.studentPhone}
              placeholder="010-1234-5678"
              maxLength={13}
              readOnly
              style={{
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
          </FormField>
          <FormField
            label="생년월일"
            required
            isFirstInRow
            error={errors.studentBirthDate}
          >
            <FormInput
              type="date"
              name="studentBirthDate"
              value={formData.studentBirthDate}
              onChange={handleInputChange}
              error={errors.studentBirthDate}
              readOnly
              style={{
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
          </FormField>
        </div>

        {/* 학교명 + 학년정보 */}
        <div className="flex flex-wrap">
          <FormField
            label="학교명"
            required
            isFirstInRow
            error={errors.schoolName}
          >
            <FormInput
              type="text"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleInputChange}
              error={errors.schoolName}
              placeholder="학교 정보는 보호자/학생 선택 시 불러옵니다"
              readOnly
              className="w-full"
              style={{
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
          </FormField>
          <FormField
            label="학년정보"
            required
            isFirstInRow
            error={errors.gradeInfo}
          >
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 min-w-0">
                <FormSelect
                  name="gradeInfo"
                  value={formData.gradeInfo}
                  onChange={handleInputChange}
                  options={classOptions}
                  error={errors.gradeInfo}
                  loading={classLoading}
                  loadingText="학년 정보를 불러오는 중..."
                  emptyText="선택"
                  disabled
                  style={{
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    cursor: "not-allowed",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <FormSelect
                  name="gradeInfo2"
                  value={formData.gradeInfo2}
                  onChange={handleInputChange}
                  options={classOptions2}
                  loading={classLoading}
                  loadingText="반 정보를 불러오는 중..."
                  emptyText="선택"
                  disabled
                  style={{
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    cursor: "not-allowed",
                  }}
                />
              </div>
            </div>
          </FormField>
        </div>

        {/* 주소 (우편번호 + 주소 + 상세주소 한 줄 표시, FULL_ADRES 기준) */}
        <div className="flex flex-wrap">
          <FormField
            label="주소"
            required
            isFirstInRow
            error={errors.studentAddress}
            fullWidth
          >
            <FormInput
              type="text"
              name="studentAddressDisplay"
              value={[
                formData.studentPostalCode,
                formData.studentAddress,
                formData.studentDetailAddress,
              ]
                .filter(Boolean)
                .join(" ")}
              onChange={() => {}}
              readOnly
              className="w-full"
              placeholder="보호자/학생 선택 시 주소가 불러옵니다"
              error={errors.studentAddress}
              style={{
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                cursor: "not-allowed",
              }}
            />
            {errors.studentAddress && (
              <div className="text-red-600 text-sm mt-1 px-2 w-full">
                {errors.studentAddress}
              </div>
            )}
          </FormField>
        </div>

        {/* 신청분야 필드들 */}
        <div className="flex flex-wrap">
          <FormField
            label="인문분야"
            isFirstInRow
            error={errors.humanitiesField}
          >
            <div className="w-full flex items-center gap-2">
              <input
                type="checkbox"
                name="humanitiesChecked"
                checked={formData.humanitiesChecked}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <FormInput
                type="text"
                name="humanitiesField"
                value={formData.humanitiesField}
                onChange={handleInputChange}
                error={errors.humanitiesField}
                placeholder="인문분야를 입력하세요"
                className="flex-1"
                maxLength={200}
              />
            </div>
          </FormField>
          <FormField label="과학분야" isFirstInRow error={errors.scienceField}>
            <div className="w-full flex items-center gap-2">
              <input
                type="checkbox"
                name="scienceChecked"
                checked={formData.scienceChecked}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <FormInput
                type="text"
                name="scienceField"
                value={formData.scienceField}
                onChange={handleInputChange}
                error={errors.scienceField}
                placeholder="과학분야를 입력하세요"
                className="flex-1"
                maxLength={200}
              />
            </div>
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField label="예체능분야" isFirstInRow error={errors.artsField}>
            <div className="w-full flex items-center gap-2">
              <input
                type="checkbox"
                name="artsChecked"
                checked={formData.artsChecked}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <FormInput
                type="text"
                name="artsField"
                value={formData.artsField}
                onChange={handleInputChange}
                error={errors.artsField}
                placeholder="예체능분야를 입력하세요"
                className="flex-1"
                maxLength={200}
              />
            </div>
          </FormField>
          <FormField
            label="인성분야"
            isFirstInRow
            error={errors.characterField}
          >
            <div className="w-full flex items-center gap-2">
              <input
                type="checkbox"
                name="characterChecked"
                checked={formData.characterChecked}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <FormInput
                type="text"
                name="characterField"
                value={formData.characterField}
                onChange={handleInputChange}
                error={errors.characterField}
                placeholder="인성분야를 입력하세요"
                className="flex-1"
                maxLength={200}
              />
            </div>
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField label="기타" isFirstInRow error={errors.otherField}>
            <div className="w-full flex items-center gap-2">
              <input
                type="checkbox"
                name="otherChecked"
                checked={formData.otherChecked}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <FormInput
                type="text"
                name="otherField"
                value={formData.otherField}
                onChange={handleInputChange}
                error={errors.otherField}
                placeholder="기타를 입력하세요"
                className="flex-1"
                maxLength={200}
              />
            </div>
          </FormField>
          <FormField label="">
            <div className="w-full h-full" />
          </FormField>
        </div>

        {/* 목적 */}
        <div className="flex flex-wrap">
          <FormField label="목적" isFirstInRow error={errors.purpose} fullWidth>
            <FormTextarea
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              error={errors.purpose}
              placeholder="목적을 입력하세요"
              maxLength={500}
              minHeight="100px"
            />
          </FormField>
        </div>

        {/* 활동내용 */}
        <div className="flex flex-wrap">
          <FormField
            label="활동내용"
            isFirstInRow
            error={errors.activityContent}
            fullWidth
          >
            <FormTextarea
              name="activityContent"
              value={formData.activityContent}
              onChange={handleInputChange}
              error={errors.activityContent}
              placeholder="활동내용을 입력하세요"
              maxLength={500}
              minHeight="100px"
            />
          </FormField>
        </div>

        {/* 예산 사용계획 */}
        <div className="flex flex-wrap">
          <FormField
            label="예산 사용계획"
            isFirstInRow
            error={errors.budgetPlan}
            fullWidth
          >
            <FormTextarea
              name="budgetPlan"
              value={formData.budgetPlan}
              onChange={handleInputChange}
              error={errors.budgetPlan}
              placeholder="예산 사용계획을 입력하세요"
              maxLength={500}
              minHeight="100px"
            />
          </FormField>
        </div>

        {/* 기타 텍스트 */}
        <div className="flex flex-wrap">
          <FormField label="기타" isFirstInRow error={errors.other} fullWidth>
            <FormTextarea
              name="other"
              value={formData.other}
              onChange={handleInputChange}
              error={errors.other}
              placeholder="기타 사항을 입력하세요"
              maxLength={1000}
              minHeight="100px"
            />
          </FormField>
        </div>

        {/* 사유 (REA_DESC) */}
        <div className="flex flex-wrap">
          <FormField label="사유" fullWidth>
            <FormTextarea
              name="reaDesc"
              value={formData.reaDesc}
              onChange={handleInputChange}
              placeholder="사유를 입력하세요"
              maxLength={2048}
              minHeight="100px"
            />
          </FormField>
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
                borderLeft: "none",
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
                {(isDetailMode && existingFiles.length > 0) ||
                selectedFiles.length > 0 ? (
                  <>
                    {/* 기존 첨부파일 목록 (상세 모드일 때만) */}
                    {isDetailMode &&
                      existingFiles.map((file) => {
                        const displayName =
                          file.orgfNm || file.saveNm || "파일";
                        return (
                        <div
                          key={`${file.fileId}-${file.seq}`}
                          className="attach-file-down flex items-center gap-2 py-2.5 px-2 rounded border border-gray-200 bg-gray-50 min-h-[30px]"
                        >
                          <img
                            src={getFileIconSrc(displayName)}
                            alt=""
                            className="w-5 h-5 flex-shrink-0 object-contain"
                            aria-hidden
                          />
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button
                              type="button"
                              className="text-gray-800 text-sm truncate min-w-0 text-left underline-offset-2 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit max-w-full"
                              title={`${displayName} — 클릭 시 다운로드`}
                              onClick={() =>
                                void downloadExistingSupportApplicationAttachment(
                                  file,
                                )
                              }
                            >
                              {displayName}
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
                                handleDeleteFileClick(file);
                              }}
                              title="파일삭제"
                              aria-label="파일삭제"
                            />
                          </div>
                        </div>
                        );
                      })}

                    {/* 새로 추가한 첨부파일 목록 */}
                    {selectedFiles.map((item) => (
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
                            {item.file.name}
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
                    ))}
                  </>
                ) : (
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

        {/* 버튼 */}
        <div className="flex justify-end mt-3 gap-2 px-6 py-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            disabled={loading}
          >
            {loading ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            style={{ minWidth: "100px" }}
            onClick={handleCancel}
            disabled={loading}
          >
            닫기
          </button>
        </div>
      </form>

      {/* 학교 검색 모달 */}
      {showSchoolModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCloseSchoolModal}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                <h2 className="text-lg font-semibold text-gray-900">
                  학교 검색
                </h2>
                <button
                  onClick={handleCloseSchoolModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              {/* 검색 영역 */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={schoolSearchKeyword}
                    onChange={(e) => setSchoolSearchKeyword(e.target.value)}
                    onKeyPress={handleSchoolSearchKeyPress}
                    placeholder="학교명을 입력하세요"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSchoolSearch}
                    className="px-6 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    검색
                  </button>
                </div>
              </div>

              {/* 목록 영역 */}
              <div className="flex-1 overflow-y-auto p-4 rounded-b-lg">
                {schoolLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">로딩 중...</div>
                  </div>
                ) : schoolList.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">조회된 학교가 없습니다.</div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "40%" }} />
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "40%" }} />
                        </colgroup>
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              학교명
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              학교종류
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              주소
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {schoolList.map((school, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleSchoolSelect(school)}
                            >
                              <td className="px-4 py-3 text-sm text-gray-700 truncate">
                                {school.schulNm || ""}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 truncate">
                                {school.schulKndScNm || ""}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 truncate">
                                {school.orgRdnma || ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 페이징 */}
                    {schoolTotalPages > 0 && (
                      <div className="mt-4 flex justify-center">
                        <Pagination
                          currentPage={schoolCurrentPage}
                          totalPages={schoolTotalPages}
                          onPageChange={(page) => setSchoolCurrentPage(page)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 보호자 검색 모달 */}
      {showParentModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCloseParentModal}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                <h2 className="text-lg font-semibold text-gray-900">
                  보호자 검색
                </h2>
                <button
                  onClick={handleCloseParentModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              {/* 검색 영역 */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={parentSearchKeyword}
                    onChange={(e) => setParentSearchKeyword(e.target.value)}
                    onKeyPress={handleParentSearchKeyPress}
                    placeholder="보호자명을 입력하세요"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleParentSearch}
                    className="px-6 py-2 bg-blue-600 text-white rounded-none hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    검색
                  </button>
                </div>
              </div>

              {/* 목록 영역 */}
              <div className="flex-1 overflow-y-auto p-4 rounded-b-lg">
                {parentLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">로딩 중...</div>
                  </div>
                ) : parentList.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">
                      조회된 보호자가 없습니다.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "20%" }} />
                        </colgroup>
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              이름
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              아이디
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              전화번호
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              생년월일
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                              상태
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {parentList.map((parent, index) => (
                            <tr
                              key={parent.esntlId || index}
                              className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleParentSelect(parent)}
                            >
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="block truncate min-w-0" title={parent.userNm || undefined}>
                                  {parent.userNm || ""}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="block truncate min-w-0" title={parent.userId || undefined}>
                                  {parent.userId || ""}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="block truncate min-w-0" title={parent.mbtlnum || undefined}>
                                  {parent.mbtlnum || ""}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="block truncate min-w-0" title={parent.brthdy || undefined}>
                                  {parent.brthdy || ""}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <span className="block truncate min-w-0" title={parent.mberSttusNm || parent.mberSttus || undefined}>
                                  {parent.mberSttusNm || parent.mberSttus || ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 페이징 */}
                    {parentTotalPages > 0 && (
                      <div className="mt-4 flex justify-center">
                        <Pagination
                          currentPage={parentCurrentPage}
                          totalPages={parentTotalPages}
                          onPageChange={(page) => setParentCurrentPage(page)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteConfirmDialog}
        title="파일 삭제"
        message="해당 첨부파일을 삭제하시겠습니까?"
        type="danger"
        onConfirm={async () => {
          if (fileToDelete) {
            setShowDeleteConfirmDialog(false);
            const file = fileToDelete;
            setFileToDelete(null);
            await deleteExistingFile(file);
          } else {
            setShowDeleteConfirmDialog(false);
            setFileToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteConfirmDialog(false);
          setFileToDelete(null);
        }}
        confirmText="삭제"
        cancelText="닫기"
      />

      {/* 메시지 다이얼로그 */}
      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        type={messageDialogType}
        onConfirm={handleMessageDialogClose}
        onCancel={handleMessageDialogClose}
        confirmText="확인"
        cancelText="닫기"
      />
    </>
  );
};
