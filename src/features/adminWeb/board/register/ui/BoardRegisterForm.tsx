"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  FormRadioGroup,
} from "@/shared/ui/adminWeb/form";
import { useBoardRegister } from "../model";

export const BoardRegisterForm: React.FC = () => {
  const router = useRouter();
  const {
    siteList,
    targetList,
    bbsSeList,
    formData,
    loading,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleRadioChange,
    handleSubmit,
    handleMessageDialogClose,
  } = useBoardRegister();

  // 사이트 목록을 SelectOption 형식으로 변환
  const siteOptions = siteList.map((site) => ({
    value: site.siteId,
    label: site.siteNm,
  }));

  // 대상구분 목록을 SelectOption 형식으로 변환
  const targetOptions = targetList.map((target) => ({
    value: target.code,
    label: target.codeNm,
  }));

  // 게시판유형 목록을 SelectOption 형식으로 변환
  const bbsSeOptions = bbsSeList.map((bbsSe) => ({
    value: bbsSe.code,
    label: bbsSe.codeNm,
  }));

  // 답장가능여부 라디오 옵션
  const replyOptions = [
    { value: "Y", label: "예", disabled: false },
    { value: "N", label: "아니오", disabled: false },
  ];

  // 비밀글사용여부 라디오 옵션
  const secretOptions = [
    { value: "Y", label: "예", disabled: false },
    { value: "N", label: "아니오", disabled: false },
  ];

  // 상태 라디오 옵션
  const statusOptions = [
    { value: "A", label: "정상", disabled: false },
    { value: "D", label: "삭제", disabled: false },
  ];

  return (
    <>
      {error && <div className="p-6 text-center text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} noValidate>
        {/* 사이트ID + 게시판명 */}
        <div className="flex flex-wrap">
          <FormField
            label="사이트ID"
            required
            isFirstRow
            isFirstInRow
            error={errors.siteId}
          >
            <FormSelect
              name="siteId"
              value={formData.siteId}
              onChange={handleInputChange}
              options={siteOptions}
              loading={loading}
              loadingText="로딩 중..."
              emptyText="사이트 목록이 없습니다"
              error={errors.siteId}
              required
            />
          </FormField>
          <FormField
            label="게시판명"
            required
            isFirstInRow
            error={errors.bbsNm}
          >
            <FormInput
              type="text"
              name="bbsNm"
              value={formData.bbsNm}
              onChange={handleInputChange}
              error={errors.bbsNm}
              placeholder="게시판명을 입력하세요"
              maxLength={200}
            />
          </FormField>
        </div>

        {/* 게시판설명 */}
        <div className="flex flex-wrap">
          <FormField label="게시판설명" fullWidth>
            <FormTextarea
              name="bbsDe"
              value={formData.bbsDe}
              onChange={handleInputChange}
              placeholder="게시판설명을 입력하세요"
              maxLength={500}
            />
          </FormField>
        </div>

        {/* 대상구분 + 게시판유형 */}
        <div className="flex flex-wrap">
          <FormField label="대상구분">
            <FormSelect
              name="targetGbn"
              value={formData.targetGbn}
              onChange={handleInputChange}
              options={targetOptions}
              loading={loading}
              loadingText="로딩 중..."
              emptyText="대상구분 목록이 없습니다"
            />
          </FormField>
          <FormField label="게시판유형" isFirstInRow>
            <FormSelect
              name="bbsSe"
              value={formData.bbsSe}
              onChange={handleInputChange}
              options={bbsSeOptions}
              loading={loading}
              loadingText="로딩 중..."
              emptyText="게시판유형 목록이 없습니다"
            />
          </FormField>
        </div>

        {/* 파일첨부개수 + 답장가능여부 */}
        <div className="flex flex-wrap">
          <FormField label="파일첨부개수">
            <div className="relative w-full">
              <FormInput
                type="text"
                name="atchFileCnt"
                value={formData.atchFileCnt}
                onChange={handleInputChange}
                placeholder="파일첨부개수를 입력하세요"
                maxLength={10}
                className="pr-8 text-right"
              />
              <span
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700 pointer-events-none"
                style={{ fontSize: "14px" }}
              >
                개
              </span>
            </div>
          </FormField>
          <FormField label="답장가능여부" isFirstInRow>
            <FormRadioGroup
              name="replyYn"
              value={formData.replyYn}
              onChange={handleRadioChange}
              options={replyOptions}
            />
          </FormField>
          <FormField label="비밀글사용여부" isFirstInRow>
            <FormRadioGroup
              name="secretYn"
              value={formData.secretYn}
              onChange={handleRadioChange}
              options={secretOptions}
            />
          </FormField>
          <FormField label="상태" isFirstInRow>
            <FormRadioGroup
              name="sttusCode"
              value={formData.sttusCode}
              onChange={handleRadioChange}
              options={statusOptions}
            />
          </FormField>
        </div>

        <div className="flex justify-end mt-3 gap-2 px-6 py-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            disabled={loading}
          >
            {loading ? "등록 중..." : "등록"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            style={{ minWidth: "100px" }}
            onClick={() => router.push("/adminWeb/board/list")}
          >
            닫기
          </button>
        </div>
      </form>

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
