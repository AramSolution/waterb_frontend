"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/shared/ui/adminWeb/form";
import { useArticleReply } from "../model";

export const ArticleReplyForm: React.FC = () => {
  const router = useRouter();
  const editorRef = useRef<RichTextEditorHandle>(null);
  const {
    formData,
    loading,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleContentChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
  } = useArticleReply();

  return (
    <>
      {error && <div className="p-6 text-center text-red-600">{error}</div>}
      <form
        onSubmit={(e) =>
          handleSubmit(e, editorRef.current?.getValue())
        }
        noValidate
      >
        {/* 본문제목 */}
        <FormField
          label="본문제목"
          isFirstRow
          isFirstInRow
          fullWidth
        >
          <FormInput
            type="text"
            name="parentNttSj"
            value={formData.parentNttSj}
            onChange={() => {}} // readonly이므로 변경 불가
            readOnly={true}
            placeholder="본문제목"
          />
        </FormField>

        {/* 답글제목 */}
        <FormField
          label="답글제목"
          required
          fullWidth
          error={errors.nttSj}
        >
          <FormInput
            type="text"
            name="nttSj"
            value={formData.nttSj}
            onChange={handleInputChange}
            error={errors.nttSj}
            placeholder="답글 제목을 입력하세요"
          />
        </FormField>

        {/* 게시글 내용 */}
        <FormField
          label="게시글 내용"
          fullWidth
          error={errors.nttCn}
        >
          <RichTextEditor
            editorRef={editorRef}
            name="nttCn"
            value={formData.nttCn}
            onChange={(html) => handleContentChange("nttCn", html)}
            placeholder="게시글 내용을 입력하세요"
            error={errors.nttCn}
            minHeight="300px"
          />
        </FormField>

        {/* 버튼 */}
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
            onClick={handleCancel}
            disabled={loading}
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
