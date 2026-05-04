"use client";

import React from "react";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormField, FormInput, FormSelect } from "@/shared/ui/adminWeb/form";
import { getSewageTypeOptionsForCategory } from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import {
  useCauserPaymentHistorySection,
  type CauserPaymentEntry,
} from "../model/useCauserPaymentHistorySection";
import type { SupportFeePayerPaymentSaveRequest } from "@/entities/adminWeb/support/api/feePayerManageApi";
import "@/shared/styles/admin/register-form.css";
import {
  feePayStatusSelectClassName,
} from "@/features/adminWeb/support/lib/feePayStatusUi";
import { FEE_PAYER_SEWAGE_INPUT_BACKGROUND_RGBA } from "@/features/adminWeb/support/lib/feePayerSewageInputTint";

/** 납부내역 — 원인자부담 납부내역 (블록 내 `추가` = 일자·금액·비고 행). */
export interface CauserPaymentHistorySectionProps {
  itemId?: string;
  initialEntries?: CauserPaymentEntry[];
  persistRequestBuilderRef?: React.MutableRefObject<
    (() => SupportFeePayerPaymentSaveRequest | null) | null
  >;
  /** 저장 클릭 시 초과 납부 등 선검증 — `usePaymentHistory`에서 연결 */
  preSaveValidateRef?: React.MutableRefObject<(() => string | null) | null>;
  /** 납부 행 삭제 API 성공 후 상세 재조회 */
  onReloadDetail?: () => void | Promise<void>;
}

export const CauserPaymentHistorySection: React.FC<
  CauserPaymentHistorySectionProps
> = ({
  itemId,
  initialEntries,
  persistRequestBuilderRef,
  preSaveValidateRef,
  onReloadDetail,
}) => {
  const {
    entries,
    categoryStatusOptions,
    handleSelectChange,
    handleFieldChange,
    handleLineFieldChange,
    handleAddLine,
    requestLineDelete,
    showLineDeleteConfirm,
    lineDeleteSubmitting,
    handleLineDeleteConfirm,
    handleLineDeleteCancel,
    showLineDeleteSuccess,
    handleLineDeleteSuccessClose,
    showLineDeleteError,
    lineDeleteErrorMessage,
    handleLineDeleteErrorClose,
  } = useCauserPaymentHistorySection(
    initialEntries,
    itemId,
    persistRequestBuilderRef,
    preSaveValidateRef,
    onReloadDetail,
  );

  const { category: catOpt, status: statusOpt } = categoryStatusOptions;
  const readOnlyClass = "bg-gray-100 !cursor-not-allowed";
  const sewageVolumeInputStyle: React.CSSProperties = {
    backgroundColor: FEE_PAYER_SEWAGE_INPUT_BACKGROUND_RGBA,
  };

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-2">
        <h5 className="text-lg font-semibold mb-0">원인자부담 납부내역</h5>
      </div>

      <div className="p-0 pb-6">
        {entries.map((entry, entryIndex) => {
          const isEntryPaid = entry.status === "PAID";
          const lineFieldsReadOnly = isEntryPaid;
          return (
          <div
            key={entry.id}
            className={
              entryIndex > 0
                ? "mt-0 pt-6 border-t border-gray-200 mx-6"
                : "mx-6 mt-0 pt-4 pb-0"
            }
          >
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div
                className="hidden md:flex w-11 shrink-0 items-start justify-center py-3 bg-gray-200 text-gray-800 font-semibold text-sm border border-gray-200 border-b-0 md:border-b md:border-r-0"
                aria-hidden
              >
                {entryIndex + 1}
              </div>
              <div className="min-w-0 flex-1 border border-gray-200 md:border-l-0">
                <div className="md:hidden px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-800">
                  {entryIndex + 1}
                </div>

                <div className="flex flex-wrap">
                  <FormField
                    label="상태"
                    isFirstRow={entryIndex === 0}
                    isFirstInRow
                    forceTopBorder={entryIndex > 0}
                    mdGridSpan={4}
                  >
                    <FormSelect
                      name="status"
                      value={entry.status}
                      onChange={handleSelectChange}
                      options={statusOpt}
                      emptyText=""
                      data-entry-id={entry.id}
                      disabled={isEntryPaid}
                      selectClassName={feePayStatusSelectClassName(entry.status)}
                    />
                  </FormField>
                  <FormField
                    label="구분"
                    isFirstInRow
                    forceTopBorder={entryIndex > 0}
                    mdGridSpan={4}
                  >
                    <FormSelect
                      name="category"
                      value={entry.category}
                      onChange={handleSelectChange}
                      options={catOpt}
                      emptyText=""
                      data-entry-id={entry.id}
                      disabled
                    />
                  </FormField>
                  <FormField label="유형" isFirstInRow mdGridSpan={4}>
                    <FormSelect
                      name="type"
                      value={entry.type}
                      onChange={handleSelectChange}
                      options={getSewageTypeOptionsForCategory(entry.category)}
                      emptyText=""
                      data-entry-id={entry.id}
                      disabled
                    />
                  </FormField>
                  <FormField label="통지일" isFirstInRow mdGridSpan={4}>
                    <FormInput
                      type="date"
                      name="notifyDate"
                      value={entry.notifyDate}
                      onChange={handleFieldChange}
                      data-entry-id={entry.id}
                      readOnly
                      className={readOnlyClass}
                    />
                  </FormField>
                </div>

                <FormField
                  label=" "
                  fullWidth
                  fieldOnlyFullWidth
                  forceTopBorder
                  alignFieldStart
                >
                  <div className="w-full">
                    <span className="sr-only">
                      오수부과량, 오수량, 원인자부담금, 납부금액
                    </span>
                    <div className="feePayerPriceGrid w-full overflow-hidden rounded-none border border-[#e5e7eb] bg-white">
                      <div className="flex w-full flex-col md:flex-row md:items-stretch">
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col border-b border-[#e5e7eb] md:flex-row md:border-b-0 md:border-r md:border-[#e5e7eb]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:py-2">
                            오수부과량
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="relative w-full min-w-0">
                              <FormInput
                                type="text"
                                name="sewageLevyAmount"
                                value={entry.sewageLevyAmount}
                                onChange={handleFieldChange}
                                placeholder="오수부과량"
                                data-entry-id={entry.id}
                                readOnly
                                className={`${readOnlyClass} pr-8 text-right placeholder:text-left`}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                t
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col border-b border-[#e5e7eb] md:flex-row md:border-b-0 md:border-[#e5e7eb]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:py-2">
                            오수량
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="relative w-full min-w-0">
                              <FormInput
                                type="text"
                                name="sewageVolume"
                                value={entry.sewageVolume}
                                onChange={handleFieldChange}
                                placeholder="예: 9.8"
                                data-entry-id={entry.id}
                                readOnly
                                className={`${readOnlyClass} pr-8 text-right placeholder:text-left`}
                                style={sewageVolumeInputStyle}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                t
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="feePayerPriceGridRow2 flex w-full flex-col bg-gray-50/50 md:flex-row md:items-stretch">
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col border-b border-[#e5e7eb] shadow-[inset_0_1px_0_0_#d1d5db] md:flex-row md:border-b-0 md:border-r md:border-[#e5e7eb]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:border-0 md:py-2">
                            원인자부담금
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="relative w-full min-w-0">
                              <FormInput
                                type="text"
                                name="causerCharge"
                                value={entry.causerCharge}
                                onChange={handleFieldChange}
                                placeholder="예: 300,000"
                                data-entry-id={entry.id}
                                readOnly
                                className={`pr-8 ${readOnlyClass}`}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                원
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col md:flex-row md:shadow-[inset_0_1px_0_0_#d1d5db]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:border-0 md:py-2">
                            납부금액
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="relative w-full min-w-0">
                              <FormInput
                                type="text"
                                name="unitPrice"
                                value={entry.paidAmount}
                                onChange={handleFieldChange}
                                placeholder="납부액"
                                data-entry-id={entry.id}
                                readOnly
                                className={`${readOnlyClass} pr-8 text-right placeholder:text-left`}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                원
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </FormField>

                <FormField
                  label=" "
                  fullWidth
                  fieldOnlyFullWidth
                  suppressBottomBorder
                >
                  <div className="w-full">
                    <span className="sr-only">이 블록에 납부 상세 행 추가</span>
                    <div className="flex w-full justify-end">
                      <button
                        type="button"
                        className="px-3 py-2 text-base bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minWidth: "72px" }}
                        onClick={() => handleAddLine(entry.id)}
                        disabled={isEntryPaid}
                        title={
                          isEntryPaid
                            ? "납부 처리된 블록에는 행을 추가할 수 없습니다."
                            : undefined
                        }
                      >
                        추가
                      </button>
                    </div>
                  </div>
                </FormField>

                {entry.lines.map((line, lineIndex) => (
                  <FormField
                    key={line.id}
                    label=" "
                    fullWidth
                    fieldOnlyFullWidth
                    forceTopBorder
                    alignFieldStart
                  >
                    <div className="w-full">
                      <span className="sr-only">
                        {entryIndex + 1}번 블록 납부 이력 {lineIndex + 1} — 일자,
                        금액, 비고
                      </span>
                      <div className="flex w-full flex-col gap-0 md:flex-row md:flex-nowrap md:items-stretch">
                        <div className="flex min-w-0 w-full flex-col md:w-[17rem] md:flex-none md:flex-row md:items-stretch">
                          <label
                            className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-[38%] md:min-w-[4.5rem] md:max-w-[5.5rem]"
                            style={{
                              border: "1px solid #dee2e6",
                              padding: "5px",
                            }}
                          >
                            일자
                          </label>
                          <div className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t">
                            <div className="w-full">
                              <FormInput
                                type="date"
                                name="lineDate"
                                value={line.lineDate}
                                onChange={handleLineFieldChange}
                                data-entry-id={entry.id}
                                data-line-id={line.id}
                                readOnly={lineFieldsReadOnly}
                                className={
                                  lineFieldsReadOnly ? readOnlyClass : ""
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:w-[16rem] md:flex-none md:-ml-px md:flex-row md:items-stretch md:border-t-0">
                          <label
                            className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-[38%] md:min-w-[3.5rem] md:max-w-[4.5rem]"
                            style={{
                              border: "1px solid #dee2e6",
                              padding: "5px",
                            }}
                          >
                            금액
                          </label>
                          <div className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t">
                            <div className="w-full">
                              <div className="relative w-full">
                                <FormInput
                                  type="text"
                                  name="amount"
                                  value={line.amount}
                                  onChange={handleLineFieldChange}
                                  placeholder="금액"
                                  inputMode="numeric"
                                  data-entry-id={entry.id}
                                  data-line-id={line.id}
                                  readOnly={lineFieldsReadOnly}
                                  className={`pr-8 ${
                                    lineFieldsReadOnly ? readOnlyClass : ""
                                  }`.trim()}
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                  원
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 w-full flex-1 flex-col border-t border-[#dee2e6] md:-ml-px md:flex-row md:items-stretch md:border-t-0">
                          <label
                            className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-[18%] md:min-w-[3.25rem] md:max-w-[4rem]"
                            style={{
                              border: "1px solid #dee2e6",
                              padding: "5px",
                            }}
                          >
                            비고
                          </label>
                          <div className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:min-w-0 md:flex-1 md:border-l-0 md:border-t">
                            <div className="w-full min-w-0">
                              <FormInput
                                type="text"
                                name="remarks"
                                value={line.remarks}
                                onChange={handleLineFieldChange}
                                placeholder="비고"
                                data-entry-id={entry.id}
                                data-line-id={line.id}
                                readOnly={lineFieldsReadOnly}
                                className={
                                  lineFieldsReadOnly ? readOnlyClass : ""
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex min-h-[48px] w-full shrink-0 flex-col items-center justify-center border-t border-solid border-[#dee2e6] px-3 py-2 md:-ml-px md:min-h-0 md:w-[100px] md:flex-none md:border md:border-solid md:border-[#dee2e6] md:border-l md:border-t-0 md:px-2 md:py-2">
                          <button
                            type="button"
                            className="inline-flex min-h-10 min-w-[72px] items-center justify-center rounded-full border border-gray-400 bg-white px-4 py-1.5 text-base text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() =>
                              requestLineDelete(entry.id, line.id)
                            }
                            disabled={
                              entry.lines.length <= 1 || isEntryPaid
                            }
                            title={
                              isEntryPaid
                                ? "납부 처리된 블록에서는 행을 삭제할 수 없습니다."
                                : entry.lines.length <= 1
                                  ? "최소 한 행은 유지됩니다"
                                  : undefined
                            }
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </FormField>
                ))}
              </div>
            </div>
          </div>
        );
        })}
      </div>

      <ConfirmDialog
        isOpen={showLineDeleteConfirm}
        title="납부내역 삭제"
        message="선택한 납부 행을 삭제하시겠습니까?"
        type="danger"
        useDeleteHeader
        confirmText={lineDeleteSubmitting ? "처리 중..." : "예"}
        disabled={lineDeleteSubmitting}
        onConfirm={handleLineDeleteConfirm}
        onCancel={handleLineDeleteCancel}
      />

      <ConfirmDialog
        isOpen={showLineDeleteSuccess}
        title="삭제 완료"
        message="정상적으로 삭제되었습니다."
        type="success"
        preferCheckHeader
        confirmText="확인"
        singleAction
        onConfirm={handleLineDeleteSuccessClose}
        onCancel={handleLineDeleteSuccessClose}
      />

      <ConfirmDialog
        isOpen={showLineDeleteError}
        title="삭제 실패"
        message={
          lineDeleteErrorMessage.trim() ||
          "납부내역 삭제 중 오류가 발생했습니다."
        }
        type="danger"
        preferCheckHeader
        confirmText="확인"
        singleAction
        onConfirm={handleLineDeleteErrorClose}
        onCancel={handleLineDeleteErrorClose}
      />
    </div>
  );
};
