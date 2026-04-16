"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  FormTextarea,
} from "@/shared/ui/adminWeb/form";
import { useProgramDetail } from "../model";
import "@/shared/styles/admin/register-form.css";

interface ProgramDetailFormProps {
  progrmFileNm: string;
}

export const ProgramDetailForm: React.FC<ProgramDetailFormProps> = ({
  progrmFileNm,
}) => {
  const router = useRouter();
  const {
    detail,
    formData,
    loading,
    updating,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleUpdate,
    handleList,
    handleMessageDialogClose,
  } = useProgramDetail(progrmFileNm);

  return (
    <>
      {error && (
        <div className="p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}
      {loading ? (
        <div className="p-6 text-center">로딩 중...</div>
      ) : (
        <form noValidate>
          <ConfirmDialog
            isOpen={showMessageDialog}
            title={messageDialogTitle}
            message={messageDialogMessage}
            type={messageDialogType}
            onConfirm={handleMessageDialogClose}
            onCancel={handleMessageDialogClose}
          />
          {/* 프로그램명 + 저장경로 */}
          <div className="flex flex-wrap">
            <FormField
              label="프로그램명"
              required
              isFirstRow
              isFirstInRow
            >
              <FormInput
                type="text"
                name="progrmFileNm"
                value={formData.progrmFileNm}
                onChange={handleInputChange}
                readOnly
                disabled
              />
            </FormField>
            <FormField
              label="저장경로"
              required
              isFirstInRow
              error={errors.progrmStrePath}
            >
              <FormInput
                type="text"
                name="progrmStrePath"
                value={formData.progrmStrePath}
                onChange={handleInputChange}
                error={errors.progrmStrePath}
                placeholder="저장경로를 입력하세요"
                maxLength={500}
              />
            </FormField>
          </div>

          {/* 한글명 + URL */}
          <div className="flex flex-wrap">
            <FormField
              label="한글명"
              required
              error={errors.progrmKoreanNm}
            >
              <FormInput
                type="text"
                name="progrmKoreanNm"
                value={formData.progrmKoreanNm}
                onChange={handleInputChange}
                error={errors.progrmKoreanNm}
                placeholder="한글명을 입력하세요"
                maxLength={200}
              />
            </FormField>
            <FormField
              label="URL"
              required
              isFirstInRow
              error={errors.url}
            >
              <FormInput
                type="text"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                error={errors.url}
                placeholder="URL을 입력하세요"
                maxLength={500}
              />
            </FormField>
          </div>

          {/* 프로그램설명 */}
          <div className="flex flex-wrap">
            <FormField label="프로그램설명" fullWidth>
              <FormTextarea
                name="progrmDc"
                value={formData.progrmDc}
                onChange={handleInputChange}
                placeholder="프로그램설명을 입력하세요"
                maxLength={1000}
              />
            </FormField>
          </div>

          <div className="flex justify-end mt-3 gap-2 px-6 py-4">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              style={{ minWidth: "100px" }}
              onClick={handleUpdate}
              disabled={updating}
            >
              {updating ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              style={{ minWidth: "100px" }}
              onClick={handleList}
            >
              닫기
            </button>
          </div>
        </form>
      )}
    </>
  );
};
