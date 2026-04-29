"use client";

import React from "react";
import { FormField, FormInput, FormSelect } from "@/shared/ui/adminWeb/form";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { getSewageTypeOptionsForCategory } from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import {
  useCauserPaymentHistorySection,
  type CauserPaymentEntry,
} from "../model/useCauserPaymentHistorySection";
import type { SupportFeePayerPaymentSaveRequest } from "@/entities/adminWeb/support/api/feePayerManageApi";
import "@/shared/styles/admin/register-form.css";

/**
 * 납부내역 — 원인자부담 납부내역 (헤더 `추가` = 블록 전체 복제, 블록 내 `추가` = 일자·금액·비고 행).
 */
export interface CauserPaymentHistorySectionProps {
  itemId?: string;
  initialEntries?: CauserPaymentEntry[];
  persistRequestBuilderRef?: React.MutableRefObject<
    (() => SupportFeePayerPaymentSaveRequest | null) | null
  >;
}

export const CauserPaymentHistorySection: React.FC<
  CauserPaymentHistorySectionProps
> = ({ itemId, initialEntries, persistRequestBuilderRef }) => {
  const [showLimitDialog, setShowLimitDialog] = React.useState(false);
  const {
    entries,
    handleAddEntry,
    categoryStatusOptions,
    handleSelectChange,
    handleFieldChange,
    handleLineFieldChange,
    handleAddLine,
    handleRemoveLine,
  } = useCauserPaymentHistorySection(
    initialEntries,
    itemId,
    persistRequestBuilderRef,
  );

  const { category: catOpt, status: stOpt } = categoryStatusOptions;
  const readOnlyClass = "bg-gray-100 !cursor-not-allowed";
  const maxEntryCount = React.useMemo(
    () => Math.max(0, initialEntries?.length ?? 0),
    [initialEntries],
  );
  const limitMessage = React.useMemo(() => {
    if (maxEntryCount <= 0) {
      return "등록된 납부 대상이 없어 납부내역 블록을 추가할 수 없습니다.";
    }
    return `납부내역 블록은 최대 ${maxEntryCount}개까지만 추가할 수 있습니다.`;
  }, [maxEntryCount]);
  const handleAddEntryClick = React.useCallback(() => {
    if (entries.length >= maxEntryCount) {
      setShowLimitDialog(true);
      return;
    }
    handleAddEntry();
  }, [entries.length, handleAddEntry, maxEntryCount]);

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-2">
        <h5 className="text-lg font-semibold mb-0">원인자부담 납부내역</h5>
      </div>

      <div className="p-0 pb-6">
        {entries.map((entry, entryIndex) => (
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
                      options={stOpt}
                      data-entry-id={entry.id}
                      disabled
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
                      placeholder="--------선택하세요-----"
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
                      placeholder="--------선택하세요-----"
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
                    <span className="sr-only">오수량, 원인자부담금, 납부금액</span>
                    <div className="flex w-full flex-col md:flex-row md:flex-nowrap md:items-stretch">
                      <div className="flex min-w-0 w-full flex-col md:ml-0 md:flex-1 md:flex-row md:items-stretch">
                        <label
                          className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                          style={{
                            border: "1px solid #dee2e6",
                            padding: "5px",
                          }}
                        >
                          오수량
                        </label>
                        <div className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t">
                          <div className="w-full">
                            <FormInput
                              type="text"
                              name="sewageVolume"
                              value={entry.sewageVolume}
                              onChange={handleFieldChange}
                              placeholder="예: 9.8"
                              data-entry-id={entry.id}
                              readOnly
                              className={readOnlyClass}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:-ml-px md:flex-1 md:flex-row md:items-stretch md:border-t-0">
                        <label
                          className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                          style={{
                            border: "1px solid #dee2e6",
                            padding: "5px",
                          }}
                        >
                          원인자부담금
                        </label>
                        <div className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t">
                          <div className="w-full">
                            <FormInput
                              type="text"
                              name="causerCharge"
                              value={entry.causerCharge}
                              onChange={handleFieldChange}
                              placeholder="예: 300,000원"
                              data-entry-id={entry.id}
                              readOnly
                              className={readOnlyClass}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:-ml-px md:flex-1 md:flex-row md:items-stretch md:border-t-0">
                        <label
                          className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                          style={{
                            border: "1px solid #dee2e6",
                            padding: "5px",
                          }}
                        >
                          납부금액
                        </label>
                        <div className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t">
                          <div className="w-full">
                            <FormInput
                              type="text"
                              name="paidAmount"
                              value={entry.paidAmount}
                              onChange={handleFieldChange}
                              placeholder="납부금액"
                              data-entry-id={entry.id}
                              readOnly
                              className={readOnlyClass}
                            />
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
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minWidth: "72px" }}
                        onClick={() => handleAddLine(entry.id)}
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
                                readOnly={line.paymentSeq2 != null && line.paymentSeq2 > 0}
                                className={
                                  line.paymentSeq2 != null && line.paymentSeq2 > 0
                                    ? readOnlyClass
                                    : ""
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
                              <FormInput
                                type="text"
                                name="amount"
                                value={line.amount}
                                onChange={handleLineFieldChange}
                                placeholder="금액"
                                data-entry-id={entry.id}
                                data-line-id={line.id}
                                readOnly={line.paymentSeq2 != null && line.paymentSeq2 > 0}
                                className={
                                  line.paymentSeq2 != null && line.paymentSeq2 > 0
                                    ? readOnlyClass
                                    : ""
                                }
                              />
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
                                readOnly={line.paymentSeq2 != null && line.paymentSeq2 > 0}
                                className={
                                  line.paymentSeq2 != null && line.paymentSeq2 > 0
                                    ? readOnlyClass
                                    : ""
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex w-full shrink-0 items-center justify-end border-t border-[#dee2e6] py-2 pl-2 md:-ml-px md:min-w-[5.5rem] md:max-w-[6.5rem] md:items-stretch md:border md:border-[#dee2e6] md:px-1 md:py-2">
                          <button
                            type="button"
                            className="w-full max-w-full rounded-full border border-gray-400 bg-white px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            style={{ minWidth: "64px" }}
                            onClick={() => handleRemoveLine(entry.id, line.id)}
                            disabled={entry.lines.length <= 1}
                            title={
                              entry.lines.length <= 1
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
        ))}
        <div className="relative mx-6 border-t border-[#dee2e6] pt-5 pb-2">
          <button
            type="button"
            className="absolute left-1/2 top-0 z-[1] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-2xl font-light leading-none text-white shadow-md transition-colors hover:bg-blue-700"
            aria-label="원인자부담 납부내역 블록 추가"
            title="원인자부담 납부내역 블록 추가"
            onClick={handleAddEntryClick}
          >
            +
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showLimitDialog}
        title="알림"
        message={limitMessage}
        type="primary"
        confirmText="확인"
        cancelText="닫기"
        onConfirm={() => setShowLimitDialog(false)}
        onCancel={() => setShowLimitDialog(false)}
      />
    </div>
  );
};
