"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  FormTextarea,
  FormRadioGroup,
} from "@/shared/ui/adminWeb/form";
import { useBannerRegister } from "../model";
import { BannerPhotoPreviewImage } from "@/features/adminWeb/banner/ui/BannerPhotoPreviewImage";
import "@/shared/styles/admin/register-form.css";

const useYnOptions = [
  { value: "Y", label: "사용" },
  { value: "N", label: "미사용" },
];

export const BannerRegisterForm: React.FC = () => {
  const router = useRouter();
  const {
    formData,
    errors,
    photoFile,
    photoInputRef,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleRadioChange,
    handlePhotoSelected,
    clearPhotoFile,
    saveLoading,
    handleSubmit,
    handleMessageDialogClose,
  } = useBannerRegister();

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-wrap">
          <FormField
            label="시작일"
            required
            isFirstRow
            isFirstInRow
            suppressBottomBorder
            error={errors.postStartDttm}
          >
            <FormInput
              type="date"
              name="postStartDttm"
              value={formData.postStartDttm}
              onChange={handleInputChange}
              error={errors.postStartDttm}
            />
          </FormField>
          <FormField
            label="종료일"
            required
            isFirstInRow
            suppressBottomBorder
            error={errors.postEndDttm}
          >
            <FormInput
              type="date"
              name="postEndDttm"
              value={formData.postEndDttm}
              onChange={handleInputChange}
              error={errors.postEndDttm}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField
            label="제목"
            required
            fullWidth
            forceTopBorder
            suppressBottomBorder
            error={errors.title}
          >
            <FormInput
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              error={errors.title}
              placeholder="제목을 입력하세요"
              maxLength={200}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField
            label="내용"
            fullWidth
            forceTopBorder
            suppressBottomBorder
            alignFieldStart
          >
            <FormTextarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="내용을 입력하세요"
              rows={5}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField
            label="정렬순서"
            required
            isFirstRow
            isFirstInRow
            forceTopBorder
            suppressBottomBorder
            error={errors.sortOrder}
          >
            <FormInput
              type="number"
              name="sortOrder"
              value={formData.sortOrder}
              onChange={handleInputChange}
              error={errors.sortOrder}
              placeholder="0"
              min={0}
              step={1}
            />
          </FormField>
          <FormField
            label="사용여부"
            isFirstInRow
            forceTopBorder
            suppressBottomBorder
          >
            <FormRadioGroup
              name="useYn"
              value={formData.useYn}
              onChange={handleRadioChange}
              options={useYnOptions}
            />
          </FormField>
        </div>

        {/* 이미지업로드 (학원회원 등록과 동일 UI) */}
        <div className="flex flex-wrap">
          <FormField label="이미지업로드" fullWidth forceTopBorder>
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-hidden
                  onChange={handlePhotoSelected}
                />
                <button
                  type="button"
                  className="px-3 py-1 text-sm border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-none whitespace-nowrap"
                  onClick={() => photoInputRef.current?.click()}
                  title="파일 선택"
                  aria-label="파일 선택"
                >
                  파일 선택
                </button>
                <span className="text-sm text-gray-500">
                  {photoFile ? photoFile.name : "선택된 파일 없음"}
                </span>
              </div>
              <div
                className="w-[120px] h-[120px] rounded-lg overflow-hidden border flex items-center justify-center flex-shrink-0 bg-gray-100"
                style={{ borderColor: "#dee2e6" }}
              >
                {photoFile ? (
                  <button
                    type="button"
                    className="w-full h-full p-0 border-0 bg-transparent cursor-pointer block"
                    title="클릭하여 이미지 보기"
                    aria-label="클릭하여 이미지 보기"
                    onClick={() => {
                      const url = URL.createObjectURL(photoFile);
                      window.open(url, "_blank", "noopener,noreferrer");
                      setTimeout(() => URL.revokeObjectURL(url), 120_000);
                    }}
                  >
                    <BannerPhotoPreviewImage file={photoFile} />
                  </button>
                ) : (
                  <span className="text-gray-400 text-xs">미리보기</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-sm border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-none whitespace-nowrap"
                  onClick={() => {
                    if (photoFile) {
                      const url = URL.createObjectURL(photoFile);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = photoFile.name || "image";
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  disabled={!photoFile}
                >
                  다운로드
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm border border-red-500 text-red-600 hover:bg-red-50 rounded-none whitespace-nowrap"
                  onClick={() => clearPhotoFile()}
                  disabled={!photoFile}
                >
                  삭제
                </button>
              </div>
              {errors.image && (
                <p className="text-red-600 text-[13px] m-0">{errors.image}</p>
              )}
            </div>
          </FormField>
        </div>

        <div className="flex justify-end mt-3 gap-2 px-6 py-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            disabled={saveLoading}
          >
            {saveLoading ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            style={{ minWidth: "100px" }}
            onClick={() => router.push("/adminWeb/banner/list")}
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
