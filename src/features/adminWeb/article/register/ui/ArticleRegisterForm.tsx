"use client";

import React, { useRef, useState } from "react";
import type { RichTextEditorHandle } from "@/shared/ui/adminWeb/form";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  FormRadioGroup,
  FormDatePicker,
  FormTextarea,
  RichTextEditor,
} from "@/shared/ui/adminWeb/form";
import type { RadioOption } from "@/shared/ui/adminWeb/form";
import {
  archiveRowHasImage,
  type ArticleRegisterViewModel,
  type ArchiveRegisterPayload,
} from "../model";

interface ArticleRegisterFormProps {
  vm: ArticleRegisterViewModel;
}

/** 아카이브(BBST03) 전용 — 소개·자료출처 (지정별~소재지 미사용) */
interface ArchiveRegisterDraft {
  intro: string;
  dataSource: string;
}

interface ArchiveRegisterErrors {
  intro?: string;
  dataSource?: string;
  archiveImageFile?: string;
}

const initialArchiveDraft: ArchiveRegisterDraft = {
  intro: "",
  dataSource: "",
};

export const ArticleRegisterForm: React.FC<ArticleRegisterFormProps> = ({
  vm,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [archiveDraft, setArchiveDraft] =
    useState<ArchiveRegisterDraft>(initialArchiveDraft);
  const [archiveErrors, setArchiveErrors] = useState<ArchiveRegisterErrors>({});
  const [archiveDragOverIndex, setArchiveDragOverIndex] = useState<number | null>(
    null,
  );

  const {
    formData,
    bbsSe,
    loading,
    error,
    errors,
    atchFileCnt,
    secretYn,
    selectedFiles,
    archiveImageRows,
    archiveImageMax,
    removeArchiveImageRow,
    reorderArchiveImageRows,
    handleArchiveImageSelected,
    handleFilesSelected,
    removeFile,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleContentChange,
    handleRadioChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
  } = vm;

  const isArchiveBoard = bbsSe === "BBST03";

  const handleArchiveDraftChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setArchiveDraft((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (archiveErrors[name as keyof ArchiveRegisterErrors]) {
      setArchiveErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateArchiveDraft = (): boolean => {
    if (!isArchiveBoard) return true;

    const nextErrors: ArchiveRegisterErrors = {};
    if (!archiveDraft.intro.trim()) {
      nextErrors.intro = "소개를 입력해주세요.";
    }
    if (!archiveDraft.dataSource.trim()) {
      nextErrors.dataSource = "자료출처를 입력해주세요.";
    }
    if (!archiveImageRows.some((r) => r.file)) {
      nextErrors.archiveImageFile = "이미지를 등록해주세요.";
    }

    setArchiveErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (!validateArchiveDraft()) {
      e.preventDefault();
      return;
    }
    const archivePayload: ArchiveRegisterPayload | undefined = isArchiveBoard
      ? {
          nttData5: archiveDraft.dataSource.trim(),
          nttData6: archiveDraft.intro.trim(),
        }
      : undefined;
    handleSubmit(e, editorRef.current?.getValue(), archivePayload);
  };

  // 공지여부 라디오 옵션
  const noticeOptions: RadioOption[] = [
    { value: "Y", label: "사용", disabled: false },
    { value: "N", label: "미사용", disabled: false },
  ];

  // 상태코드 라디오 옵션
  const statusOptions: RadioOption[] = [
    { value: "A", label: "사용", disabled: false },
    { value: "D", label: "미사용", disabled: false },
  ];

  /** adms documentManagement 방식: 확장자별 파일 타입 아이콘 (public/images/adminWeb/icon) */
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

  return (
    <>
      {error && <div className="p-6 text-center text-red-600">{error}</div>}
      <form onSubmit={handleFormSubmit} noValidate>
        {/* 게시글 제목(아카이브: 명칭) + 공지여부 */}
        <div className="flex flex-wrap">
          <FormField
            label={isArchiveBoard ? "명칭" : "게시글 제목"}
            required
            isFirstRow
            isFirstInRow
            error={errors.nttSj}
          >
            <FormInput
              type="text"
              name="nttSj"
              value={formData.nttSj}
              onChange={handleInputChange}
              error={errors.nttSj}
              placeholder={
                isArchiveBoard
                  ? "명칭을 입력하세요"
                  : "게시글 제목을 입력하세요"
              }
            />
          </FormField>
          <FormField label="공지여부" isFirstInRow error={errors.noticeAt}>
            <FormRadioGroup
              name="noticeAt"
              value={formData.noticeAt}
              onChange={handleRadioChange}
              options={noticeOptions}
              error={errors.noticeAt}
            />
          </FormField>
        </div>

        {/* 게시기간 + 상태코드 */}
        <div className="flex flex-wrap">
          <FormField
            label="게시기간"
            required
            error={errors.ntcrStartDt || errors.ntcrEndDt}
          >
            <div className="w-full flex items-center gap-2">
              <FormDatePicker
                name="ntcrStartDt"
                value={formData.ntcrStartDt}
                onChange={handleInputChange}
                error={errors.ntcrStartDt}
                placeholder="시작일을 선택하세요"
                className="flex-1"
                maxDate={
                  formData.ntcrEndDt ? new Date(formData.ntcrEndDt) : undefined
                }
              />
              <span className="text-gray-600">~</span>
              <FormDatePicker
                name="ntcrEndDt"
                value={formData.ntcrEndDt}
                onChange={handleInputChange}
                error={errors.ntcrEndDt}
                placeholder="종료일을 선택하세요"
                className="flex-1"
                minDate={
                  formData.ntcrStartDt
                    ? new Date(formData.ntcrStartDt)
                    : undefined
                }
              />
            </div>
          </FormField>
          <FormField label="상태코드" isFirstInRow error={errors.sttusCode}>
            <FormRadioGroup
              name="sttusCode"
              value={formData.sttusCode}
              onChange={handleRadioChange}
              options={statusOptions}
              error={errors.sttusCode}
            />
          </FormField>
        </div>

        {/* 비밀글 비밀번호 (게시판 비밀글사용여부 Y일 때만) */}
        {secretYn === "Y" && (
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
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
                placeholder="비밀글 비밀번호를 입력하세요"
                autoComplete="new-password"
              />
            </FormField>
          </div>
        )}

        {/* 아카이브(BBST03) 전용 메타 — 소개·자료출처·이미지 */}
        {isArchiveBoard && (
          <>
            <div className="flex flex-wrap">
              <FormField
                label="소개"
                required
                fullWidth
                isFirstRow
                isFirstInRow
                error={archiveErrors.intro}
              >
                <FormTextarea
                  name="intro"
                  value={archiveDraft.intro}
                  onChange={handleArchiveDraftChange}
                  placeholder="소개를 입력하세요"
                  minHeight="45px"
                  error={archiveErrors.intro}
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
                error={archiveErrors.dataSource}
              >
                <FormInput
                  type="text"
                  name="dataSource"
                  value={archiveDraft.dataSource}
                  onChange={handleArchiveDraftChange}
                  placeholder="자료출처를 입력하세요"
                  error={archiveErrors.dataSource}
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
                error={archiveErrors.archiveImageFile}
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
                      {archiveImageRows.map((row, index) => (
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
                              onDragEnd={() => setArchiveDragOverIndex(null)}
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
                            id={`archive-register-file-${row.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            aria-hidden
                            onChange={(e) => {
                              handleArchiveImageSelected(row.id, e);
                              setArchiveErrors((prev) => ({
                                ...prev,
                                archiveImageFile: undefined,
                              }));
                            }}
                          />
                          <button
                            type="button"
                            className="w-full px-2 py-1 text-xs border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-none whitespace-nowrap"
                            onClick={() =>
                              document
                                .getElementById(
                                  `archive-register-file-${row.id}`,
                                )
                                ?.click()
                            }
                          >
                            파일 선택
                          </button>
                          <span
                            className="text-xs text-gray-500 min-h-[2.5rem] line-clamp-3 break-all"
                            title={row.file ? row.file.name : undefined}
                          >
                            {row.file ? row.file.name : "선택 없음"}
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
                            ) : (
                              <span className="text-gray-400 text-xs px-1 text-center">
                                미리보기
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="w-full px-2 py-1 text-xs border border-red-500 text-red-600 hover:bg-red-50 rounded-none"
                            onClick={() => {
                              removeArchiveImageRow(row.id);
                              if (archiveErrors.archiveImageFile) {
                                setArchiveErrors((prev) => ({
                                  ...prev,
                                  archiveImageFile: "이미지를 등록해주세요.",
                                }));
                              }
                            }}
                            disabled={
                              archiveImageRows.length <= 1 && !row.file
                            }
                            title={
                              archiveImageRows.length > 1
                                ? "이 슬롯 삭제"
                                : "선택한 파일 취소"
                            }
                          >
                            {archiveImageRows.length > 1 ? "삭제" : "선택 취소"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {archiveErrors.archiveImageFile && (
                    <p className="text-red-500 text-sm m-0">
                      {archiveErrors.archiveImageFile}
                    </p>
                  )}
                </div>
              </FormField>
            </div>
          </>
        )}

        {/* 게시글 내용 */}
        <FormField label="게시글 내용" fullWidth error={errors.nttCn}>
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

        {/* 첨부파일 - adms documentManagement 방식: 첨부파일 텍스트 오른쪽 클립 아이콘 클릭으로 파일 선택 */}
        {atchFileCnt > 0 && (
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
