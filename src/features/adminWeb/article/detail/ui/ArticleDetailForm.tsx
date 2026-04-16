"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FormField,
  FormInput,
  FormRadioGroup,
  FormDatePicker,
  FormTextarea,
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/shared/ui/adminWeb/form";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  resolveArticleImageUrl,
  ARTICLE_ARCHIVE_LIST_THUMB_SIZE,
} from "@/entities/adminWeb/article/lib";
import { archiveRowHasImage } from "../../register/model";
import { useArticleDetail } from "../model";

interface ArticleDetailFormProps {
  articleId: string;
  bbsId: string;
}

export const ArticleDetailForm: React.FC<ArticleDetailFormProps> = ({
  articleId,
  bbsId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  /** 서버 미리보기 이미지 로드 실패(404 등) — 행 id 기준 */
  const [serverImgErrorByRowId, setServerImgErrorByRowId] = useState<
    Record<string, boolean>
  >({});
  const [archiveDragOverIndex, setArchiveDragOverIndex] = useState<number | null>(
    null,
  );
  const [showDeleteFileConfirm, setShowDeleteFileConfirm] = useState(false);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<{
    fileId: string;
    seq: string;
  } | null>(null);
  const {
    formData,
    loading,
    updating,
    error,
    errors,
    atchFileCnt,
    secretYn,
    bbsSe,
    fileList,
    selectedFiles,
    archiveImageRows,
    archiveImageMax,
    removeArchiveImageRow,
    reorderArchiveImageRows,
    handleArchiveImageSelected,
    handleFilesSelected,
    removeFile,
    handleDeleteFile,
    downloadExistingAttachment,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleContentChange,
    handleRadioChange,
    handleDateChange,
    handleEdit,
    handleList,
    handleMessageDialogClose,
  } = useArticleDetail(articleId, bbsId);

  useEffect(() => {
    setServerImgErrorByRowId({});
  }, [archiveImageRows, formData?.nttImgFileId]);

  // 수정 버튼: 에디터 ref에서 최신 HTML을 직접 읽어 handleEdit에 전달
  // React state 업데이트 지연/클로저 문제를 완전히 우회
  const handleEditWithLatestContent = () => {
    const latestNttCn = editorRef.current
      ? editorRef.current.getValue()
      : formData?.nttCn ?? "";
    handleEdit(latestNttCn);
  };

  /** 확장자별 파일 타입 아이콘 (public/images/adminWeb/icon) - 등록 폼과 동일 */
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

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded m-6">
        {error}
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-6 text-center text-gray-600">
        게시글 정보를 찾을 수 없습니다.
      </div>
    );
  }

  // 공지여부 라디오 옵션
  const noticeOptions = [
    { value: "Y", label: "사용" },
    { value: "N", label: "미사용" },
  ];

  // 상태코드 라디오 옵션
  const statusOptions = [
    { value: "A", label: "사용" },
    { value: "D", label: "삭제" },
  ];

  // 답글일 때 본문제목 표시용 (RE: 제거)
  const parentNttSjDisplay =
    formData.answerAt === "Y"
      ? (formData.nttSj || "").replace(/^RE:\s*/i, "").trim() || "-"
      : "";

  const isReply = formData.answerAt === "Y";
  const isArchiveBoard = bbsSe === "BBST03";

  return (
    <>
      <form noValidate>
        {isReply ? (
          /* 답글 단순 폼: 본문제목(표시), 답글제목, 게시글내용 - 답글 등록 폼과 동일 */
          <>
            <FormField label="본문제목" isFirstRow isFirstInRow fullWidth>
              <FormInput
                type="text"
                name="parentNttSjDisplay"
                readOnly
                value={parentNttSjDisplay}
                onChange={() => {}}
                placeholder="본문제목"
              />
            </FormField>
            <FormField label="답글제목" required fullWidth error={errors.nttSj}>
              <FormInput
                type="text"
                name="nttSj"
                value={formData.nttSj || ""}
                onChange={handleInputChange}
                error={errors.nttSj}
                placeholder="답글 제목을 입력하세요"
              />
            </FormField>
            <FormField label="게시글 내용" fullWidth error={errors.nttCn}>
              <RichTextEditor
                editorRef={editorRef}
                name="nttCn"
                value={formData.nttCn || ""}
                onChange={(html) => handleContentChange("nttCn", html)}
                placeholder="게시글 내용을 입력하세요"
                error={errors.nttCn}
                minHeight="300px"
              />
            </FormField>
            <div className="flex justify-end mt-3 gap-2 px-6 py-4">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minWidth: "100px" }}
                onClick={handleEditWithLatestContent}
                disabled={loading || updating}
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
          </>
        ) : (
          <>
            {/* 게시글 제목 + 공지여부 */}
            <div className="flex flex-wrap">
              <FormField
                label={isArchiveBoard ? "명칭" : "게시글 제목"}
                required
                isFirstRow
                isFirstInRow
              >
                <FormInput
                  type="text"
                  name="nttSj"
                  value={formData.nttSj || ""}
                  onChange={handleInputChange}
                  error={errors.nttSj}
                  placeholder={
                    isArchiveBoard
                      ? "명칭을 입력하세요"
                      : "게시글 제목을 입력하세요"
                  }
                />
              </FormField>
              <FormField label="공지여부" isFirstInRow>
                <FormRadioGroup
                  name="noticeAt"
                  value={formData.noticeAt || "N"}
                  onChange={handleRadioChange}
                  options={noticeOptions}
                />
              </FormField>
            </div>

            {/* 게시기간 + 상태코드 */}
            <div className="flex flex-wrap">
              <FormField label="게시기간" required>
                <div className="w-full flex items-center gap-2">
                  <FormDatePicker
                    name="ntcrStartDt"
                    value={formData.ntcrStartDt || ""}
                    onChange={handleInputChange}
                    placeholder="시작일을 선택하세요"
                    className="flex-1"
                    error={errors.ntcrStartDt}
                  />
                  <span className="text-gray-600">~</span>
                  <FormDatePicker
                    name="ntcrEndDt"
                    value={formData.ntcrEndDt || ""}
                    onChange={handleInputChange}
                    placeholder="종료일을 선택하세요"
                    className="flex-1"
                    error={errors.ntcrEndDt}
                  />
                </div>
              </FormField>
              <FormField label="상태코드" isFirstInRow>
                <FormRadioGroup
                  name="sttusCode"
                  value={formData.sttusCode || "A"}
                  onChange={handleRadioChange}
                  options={statusOptions}
                />
              </FormField>
            </div>

            {/* 비밀글 비밀번호 (게시판 비밀글사용여부 Y일 때만, 답글이 아닐 때만, 변경 시에만 입력) */}
            {secretYn === "Y" && formData.answerAt !== "Y" && (
              <div className="flex flex-wrap">
                <FormField
                  label="비밀번호"
                  isFirstRow
                  isFirstInRow
                  error={errors.password}
                >
                  <FormInput
                    type="password"
                    name="password"
                    value={formData.password || ""}
                    onChange={handleInputChange}
                    error={errors.password}
                    placeholder="변경 시에만 입력하세요"
                    autoComplete="new-password"
                  />
                </FormField>
              </div>
            )}

            {/* 아카이브(BBST03) 전용 메타 — 소개·자료출처·이미지 (지정별~소재지는 미사용) */}
            {isArchiveBoard && (
              <>
                <div className="flex flex-wrap">
                  <FormField
                    label="소개"
                    required
                    fullWidth
                    isFirstRow
                    isFirstInRow
                    error={errors.nttData6}
                  >
                    <FormTextarea
                      name="nttData6"
                      value={formData.nttData6 || ""}
                      onChange={handleInputChange}
                      error={errors.nttData6}
                      placeholder="소개를 입력하세요"
                      minHeight="45px"
                    />
                  </FormField>
                </div>
                <div className="flex flex-wrap">
                  <FormField
                    label="자료출처"
                    required
                    fullWidth
                    isFirstRow
                    isFirstInRow
                    error={errors.nttData5}
                  >
                    <FormInput
                      type="text"
                      name="nttData5"
                      value={formData.nttData5 || ""}
                      onChange={handleInputChange}
                      error={errors.nttData5}
                      placeholder="자료출처를 입력하세요"
                    />
                  </FormField>
                </div>
                <div className="flex flex-wrap">
                  <FormField
                    label="이미지업로드"
                    required
                    fullWidth
                    isFirstRow
                    isFirstInRow
                    error={errors.nttImgFileId}
                  >
                    <div className="flex flex-col gap-2 py-2 w-full min-w-0">
                      <p className="text-sm text-gray-600 m-0">
                        파일을 선택해 올리면 추가 업로드 영역이 자동으로 생깁니다. (현재{" "}
                        {archiveImageRows.filter((r) => archiveRowHasImage(r)).length}장
                        / 최대 {archiveImageMax}장) 왼쪽 핸들을 드래그하면 순서를 바꿀 수
                        있습니다.
                      </p>
                      <div className="w-full overflow-x-auto overflow-y-visible pb-1">
                        <div className="flex flex-nowrap gap-3 items-stretch w-max max-w-none pr-1">
                          {archiveImageRows.map((row, index) => {
                            const showServerPreview =
                              !row.file &&
                              row.serverFileId != null &&
                              row.serverSeq != null;
                            return (
                            <div
                              key={row.id}
                              className="flex w-[152px] shrink-0 flex-col gap-2 bg-gray-50/80 p-2"
                              style={
                                archiveDragOverIndex === index
                                  ? { border: "3px solid #0d6efd" }
                                  : { border: "1px solid #dee2e6" }
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setArchiveDragOverIndex(index);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setArchiveDragOverIndex(null);
                                const from = parseInt(
                                  e.dataTransfer.getData("text/plain"),
                                  10,
                                );
                                if (Number.isNaN(from) || from === index) return;
                                reorderArchiveImageRows(from, index);
                              }}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span
                                  className="inline-flex cursor-grab touch-none select-none active:cursor-grabbing items-center justify-center rounded border border-gray-300 bg-white px-0.5 py-0.5 text-gray-500 hover:bg-gray-100"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      String(index),
                                    );
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragEnd={() =>
                                    setArchiveDragOverIndex(null)
                                  }
                                  title="드래그하여 순서 변경"
                                  aria-label="순서 변경"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                    className="block"
                                  >
                                    <circle cx="9" cy="7" r="1.5" fill="currentColor" />
                                    <circle cx="15" cy="7" r="1.5" fill="currentColor" />
                                    <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                                    <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                                    <circle cx="9" cy="17" r="1.5" fill="currentColor" />
                                    <circle cx="15" cy="17" r="1.5" fill="currentColor" />
                                  </svg>
                                </span>
                                <span className="text-sm font-medium text-gray-700">
                                  {index + 1}
                                </span>
                              </div>
                              <input
                                id={`archive-detail-file-${row.id}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                aria-hidden
                                onChange={(e) =>
                                  handleArchiveImageSelected(row.id, e)
                                }
                              />
                              <button
                                type="button"
                                className="w-full px-2 py-1 text-xs border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-none whitespace-nowrap"
                                onClick={() =>
                                  document
                                    .getElementById(
                                      `archive-detail-file-${row.id}`,
                                    )
                                    ?.click()
                                }
                              >
                                파일 선택
                              </button>
                              <span
                                className="text-xs text-gray-500 min-h-[2.5rem] line-clamp-3 break-all"
                                title={
                                  row.file
                                    ? row.file.name
                                    : showServerPreview
                                      ? "서버에 저장된 이미지"
                                      : undefined
                                }
                              >
                                {row.file
                                  ? row.file.name
                                  : showServerPreview
                                    ? "기존 이미지"
                                    : "선택 없음"}
                              </span>
                              <div
                                className="mx-auto h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg border bg-gray-100 flex items-center justify-center"
                                style={{ borderColor: "#dee2e6" }}
                              >
                                {row.file ? (
                                  <img
                                    src={URL.createObjectURL(row.file)}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : showServerPreview ? (
                                  serverImgErrorByRowId[row.id] ? (
                                    <span className="text-gray-400 text-xs px-1 text-center leading-tight">
                                      불러올 수 없음
                                    </span>
                                  ) : (
                                    <img
                                      src={resolveArticleImageUrl(
                                        `${row.serverFileId}:${row.serverSeq}`,
                                        {
                                          thumbSize:
                                            ARTICLE_ARCHIVE_LIST_THUMB_SIZE,
                                          cacheBust: row.serverSaveNm,
                                        },
                                      )}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                      onError={() =>
                                        setServerImgErrorByRowId((prev) => ({
                                          ...prev,
                                          [row.id]: true,
                                        }))
                                      }
                                    />
                                  )
                                ) : (
                                  <span className="text-gray-400 text-xs px-1 text-center">
                                    미리보기
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="w-full px-2 py-1 text-xs border border-red-500 text-red-600 hover:bg-red-50 rounded-none"
                                onClick={() => removeArchiveImageRow(row.id)}
                                disabled={
                                  archiveImageRows.length <= 1 && !row.file
                                }
                                title={
                                  archiveImageRows.length > 1
                                    ? "이 슬롯 삭제"
                                    : "선택한 새 파일 취소"
                                }
                              >
                                {archiveImageRows.length > 1
                                  ? "삭제"
                                  : "선택 취소"}
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                      {errors.nttImgFileId && (
                        <p className="text-red-500 text-sm m-0">
                          {errors.nttImgFileId}
                        </p>
                      )}
                    </div>
                  </FormField>
                </div>
              </>
            )}

            {/* 게시글 내용 */}
            <FormField label="게시글 내용" fullWidth>
              <RichTextEditor
                editorRef={editorRef}
                name="nttCn"
                value={formData.nttCn || ""}
                onChange={(html) => handleContentChange("nttCn", html)}
                placeholder="게시글 내용을 입력하세요"
                minHeight="300px"
              />
            </FormField>

            {/* 첨부파일 - 등록 폼과 동일 구조: 기존 fileList 표시 + atchFileCnt > 0 시 추가 선택 */}
            {(atchFileCnt > 0 || fileList.length > 0) && (
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
                    {atchFileCnt > 0 && (
                      <>
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
                      </>
                    )}
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
                      {fileList.map((file) => {
                        const displayName =
                          file.orgfNm || file.saveNm || "첨부파일";
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
                                  void downloadExistingAttachment(
                                    file.fileId,
                                    file.seq,
                                    file.orgfNm || file.saveNm || undefined,
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
                                  setPendingDeleteFile({
                                    fileId: file.fileId,
                                    seq: file.seq,
                                  });
                                  setShowDeleteFileConfirm(true);
                                }}
                                title="파일삭제"
                                aria-label="파일삭제"
                              />
                            </div>
                          </div>
                        );
                      })}
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
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex justify-end mt-3 gap-2 px-6 py-4">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minWidth: "100px" }}
                onClick={handleEditWithLatestContent}
                disabled={loading || updating}
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
          </>
        )}
      </form>

      <ConfirmDialog
        isOpen={showDeleteFileConfirm}
        title="확인"
        message="파일을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="닫기"
        type="danger"
        onConfirm={() => {
          if (pendingDeleteFile) {
            handleDeleteFile(pendingDeleteFile.fileId, pendingDeleteFile.seq);
            setPendingDeleteFile(null);
            setShowDeleteFileConfirm(false);
          }
        }}
        onCancel={() => {
          setPendingDeleteFile(null);
          setShowDeleteFileConfirm(false);
        }}
      />
      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        confirmText="확인"
        cancelText="닫기"
        type={messageDialogType}
        onConfirm={handleMessageDialogClose}
        onCancel={handleMessageDialogClose}
      />
    </>
  );
};
