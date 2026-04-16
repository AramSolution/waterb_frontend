"use client";

import React from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  FormTextarea,
  FormRadioGroup,
} from "@/shared/ui/adminWeb/form";
import { useBannerDetail } from "../model";
import { BannerPhotoPreviewImage } from "@/features/adminWeb/banner/ui/BannerPhotoPreviewImage";
import "@/shared/styles/admin/register-form.css";

const useYnOptions = [
  { value: "Y", label: "사용" },
  { value: "N", label: "미사용" },
];

interface BannerDetailFormProps {
  bannerId: string;
  listHref: string;
}

export const BannerDetailForm: React.FC<BannerDetailFormProps> = ({
  bannerId,
  listHref,
}) => {
  const {
    row,
    loading,
    error,
    saveLoading,
    formData,
    errors,
    photoFile,
    photoInputRef,
    existingImageUrl,
    hasExistingImage,
    existingImageViewUrl,
    existingImageDownloadUrl,
    existingImageName,
    resolveImageViewUrl,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    showDeletePicConfirm,
    deletePicMessage,
    canDownloadOrDelete,
    handleInputChange,
    handleRadioChange,
    handlePhotoSelected,
    openDeletePicDialog,
    confirmDeletePic,
    cancelDeletePic,
    handleSubmit,
    handleMessageDialogClose,
  } = useBannerDetail(bannerId);

  if (loading) {
    return (
      <div className="px-6 py-10 text-center text-gray-500 text-[13px]">
        배너 정보를 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-10 text-center text-red-600 text-[13px]">
        {error}
      </div>
    );
  }

  if (!row) {
    return (
      <div className="px-6 py-10 text-center text-gray-600 text-[13px]">
        배너 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-wrap">
          <FormField
            label="배너 ID"
            isFirstRow
            isFirstInRow
            fullWidth
            suppressBottomBorder
          >
            <FormInput
              type="text"
              name="bannerIdDisplay"
              value={row.bannerId}
              onChange={() => {}}
              readOnly
            />
          </FormField>
        </div>

        <div className="flex flex-wrap">
          <FormField
            label="시작일"
            required
            isFirstRow
            isFirstInRow
            forceTopBorder
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
            forceTopBorder
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

        {/* 이미지업로드 (학원회원 수정과 동일 UI) */}
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
                <div className="text-sm text-gray-500 min-w-0 truncate max-w-full">
                  {photoFile ? (
                    photoFile.name
                  ) : hasExistingImage ? (
                    <button
                      type="button"
                      className="text-sm text-gray-500 text-left underline-offset-2 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit max-w-full truncate"
                      title="등록된 이미지 — 클릭 시 새 창"
                      onClick={() =>
                        window.open(
                          existingImageViewUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      등록된 이미지
                    </button>
                  ) : (
                    "선택된 파일 없음"
                  )}
                </div>
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
                ) : hasExistingImage ? (
                  <button
                    type="button"
                    className="w-full h-full p-0 border-0 bg-transparent cursor-pointer block"
                    title="클릭하여 이미지 보기"
                    aria-label="클릭하여 이미지 보기"
                    onClick={() =>
                      window.open(
                        existingImageViewUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={existingImageViewUrl}
                      alt="배너 이미지"
                      className="w-full h-full object-cover pointer-events-none"
                    />
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
                      return;
                    }
                    if (hasExistingImage) {
                      const a = document.createElement("a");
                      a.href = existingImageDownloadUrl;
                      a.download = existingImageName;
                      a.click();
                    }
                  }}
                  disabled={!canDownloadOrDelete}
                >
                  다운로드
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm border border-red-500 text-red-600 hover:bg-red-50 rounded-none whitespace-nowrap"
                  onClick={openDeletePicDialog}
                  disabled={!canDownloadOrDelete}
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
          <Link
            href={listHref}
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-[13px]"
            style={{ minWidth: "100px" }}
          >
            닫기
          </Link>
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

      <ConfirmDialog
        isOpen={showDeletePicConfirm}
        title="이미지 삭제"
        message={deletePicMessage}
        type="danger"
        confirmText="삭제"
        cancelText="닫기"
        onConfirm={confirmDeletePic}
        onCancel={cancelDeletePic}
      />
    </>
  );
};
