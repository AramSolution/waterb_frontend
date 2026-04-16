"use client";

import React, { useCallback } from "react";
import dynamic from "next/dynamic";

import { API_CONFIG, FILES } from "@/shared/config/api";
import { apiClient } from "@/shared/lib/apiClient";

import type {
  RichTextEditorClientProps,
  RichTextEditorHandle,
} from "./RichTextEditorClient";

const RichTextEditorClient = dynamic(
  () =>
    import("./RichTextEditorClient").then((mod) => mod.RichTextEditorClient),
  {
    ssr: false,
    loading: () => (
      <div className="w-full border rounded-none px-3 py-2 bg-gray-50 min-h-[300px] flex items-center justify-center text-gray-500">
        에디터 로딩 중...
      </div>
    ),
  }
);

export type RichTextEditorProps = RichTextEditorClientProps & {
  editorRef?: React.RefObject<RichTextEditorHandle>;
};

type FileUploadResponse = {
  resultCode: string;
  resultMessage: string;
  status: number;
  data?: {
    fileId?: string | number;
    seq?: number;
    [key: string]: unknown;
  };
};

/**
 * Quill 리치 에디터 (클라이언트 전용 로드)
 *
 * 기본 이미지 업로드 동작:
 * - /api/v1/files/upload 로 파일 업로드
 * - 응답 data.fileId, data.seq로 /api/v1/files/view URL 생성
 * - 에디터 본문에는 Base64 대신 조회 URL만 저장
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  editorRef,
  onImageUpload,
  ...props
}) => {
  const defaultImageUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    // 필드명은 FileManageController.uploadMultipleFiles에서 제한하지 않으므로 임의 이름 사용 가능
    formData.append("file", file);

    const response = await apiClient.post<FileUploadResponse>(
      "/api/v1/files/upload",
      formData,
    );

    const data = response?.data;
    if (!data || data.fileId == null) {
      throw new Error("파일 업로드 응답에 fileId가 없습니다.");
    }

    const fileId = String(data.fileId);
    const seq = data.seq != null ? data.seq : 1;

    const base = API_CONFIG.BASE_URL;
    const path = FILES.VIEW; // "/api/v1/files/view"

    const url = `${base}${path}?fileId=${encodeURIComponent(
      fileId,
    )}&seq=${encodeURIComponent(String(seq))}`;

    return url;
  }, []);

  const imageUploadHandler =
    onImageUpload !== undefined ? onImageUpload : defaultImageUpload;

  return (
    <RichTextEditorClient
      ref={editorRef}
      onImageUpload={imageUploadHandler}
      {...props}
    />
  );
};
