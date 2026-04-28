"use client";

import React, {
  useLayoutEffect,
  useMemo,
  useState,
  type MutableRefObject,
} from "react";
import { FormField, FormInput, FormSelect } from "@/shared/ui/adminWeb/form";
import {
  getSewageTypeOptionsForCategory,
  SEWAGE_CATEGORY,
} from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import { getSewageCalcModeForLine } from "@/features/adminWeb/support/lib/sewageVolumeCalc";
import {
  useFeePayerSewageVolumeEstimate,
  type FeePayerSewageApiBridge,
  type SewageEstimateEntry,
} from "../model/useFeePayerSewageVolumeEstimate";
import { buildSupportFeePayerRegisterRequestForPersist } from "../lib/buildSupportFeePayerRegisterRequest";
import type { SupportFeePayerRegisterRequest } from "@/entities/adminWeb/support/api/feePayerManageApi";
import { UsageLookupModal } from "./UsageLookupModal";

const readOnlyInputClass = "bg-gray-100 !cursor-not-allowed";

export interface FeePayerSewageVolumeEstimateSectionProps {
  /** 읽기 전용(상세). 버튼·추가·모달 비활성. */
  readOnly?: boolean;
  /** 상세 등: 초기 엔트리 스냅샷. `readOnly`일 때 함께 넘기는 것을 권장. */
  initialEntries?: SewageEstimateEntry[];
  /**
   * 통지일 블록 하단 원형 `+`(엔트리 추가). 기본 true — 등록·상세 동일.
   */
  showAddNoticeBlockButton?: boolean;
  /** 기본정보·ITEM_ID — 계산 API(`POST …/fee-payer/calculate`) 연동 시 전달 */
  feePayerApi?: FeePayerSewageApiBridge | null;
  /** 저장 시 `POST …/fee-payer` 본문 조립 — `feePayerApi.getBasicInfoBody` 필수 */
  persistRequestBuilderRef?: MutableRefObject<
    (() => SupportFeePayerRegisterRequest | null) | null
  >;
}

/** 오수량 발생량 산정 — `UsageLookupModal`은 용도 **조회** 전용. 통지일 블록 추가 `+`는 엔트리 카드 **하단 테두리 가운데**에 반만 걸친 원형(상세·용도 아래 흐름). 상세 `추가` = 층수~삭제 행만. */
export const FeePayerSewageVolumeEstimateSection: React.FC<
  FeePayerSewageVolumeEstimateSectionProps
> = ({
  readOnly = false,
  initialEntries,
  showAddNoticeBlockButton = true,
  feePayerApi = null,
  persistRequestBuilderRef,
}) => {
  const [usageLookupOpen, setUsageLookupOpen] = useState(false);
  const [usageLookupTarget, setUsageLookupTarget] = useState<{
    entryId: string;
    lineId: string;
  } | null>(null);

  const {
    entries,
    calcBusyEntryId,
    removedDetailSeqsRef,
    removedCalcsRef,
    handleAddEntry,
    handleAddDetailLine,
    handleRemoveDetailLine,
    handleEntryFieldChange,
    handleCalculateEntry,
    applyUsageFromLookup,
  } = useFeePayerSewageVolumeEstimate(initialEntries, feePayerApi);

  useLayoutEffect(() => {
    if (!persistRequestBuilderRef) return;
    if (!feePayerApi?.getBasicInfoBody) {
      persistRequestBuilderRef.current = null;
      return;
    }
    persistRequestBuilderRef.current = () => {
      const basicInfo = feePayerApi.getBasicInfoBody?.();
      if (!basicInfo) return null;
      const rawId = feePayerApi.feePayerItemId;
      const itemId =
        rawId != null && String(rawId).trim() !== ""
          ? String(rawId).trim()
          : undefined;
      return buildSupportFeePayerRegisterRequestForPersist({
        basicInfo,
        itemId,
        entries,
        removedDetailSeqs: removedDetailSeqsRef.current,
        removedCalcs: removedCalcsRef.current,
      });
    };
    return () => {
      persistRequestBuilderRef.current = null;
    };
  }, [
    entries,
    feePayerApi,
    persistRequestBuilderRef,
    removedDetailSeqsRef,
    removedCalcsRef,
  ]);

  const statusOptions = useMemo(
    () => [
      { value: "UNPAID", label: "미납" },
      { value: "PAID", label: "납부" },
    ],
    [],
  );
  const categoryOptions = useMemo(
    () => [
      { value: "INDIVIDUAL", label: "개별건축물" },
      { value: "OTHER_ACT", label: "타행위" },
      { value: "PERMIT_CHANGE", label: "허가사항변경" },
    ],
    [],
  );
  const floorOptions = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        value: String(i + 1),
        label: `${i + 1}층`,
      })),
    [],
  );

  /** 통지일 블록 `+`: 기존 블록이 모두 「납부」일 때만 추가 가능(미납 블록이 있으면 차단) */
  const canAddNoticeBlock = useMemo(
    () => entries.length > 0 && entries.every((e) => e.status === "PAID"),
    [entries],
  );

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="border-b border-gray-200 px-6 py-4">
        <h5 className="text-lg font-semibold mb-0">오수량 발생량 산정</h5>
      </div>

      {!readOnly ? (
        <UsageLookupModal
          isOpen={usageLookupOpen}
          onClose={() => {
            setUsageLookupOpen(false);
            setUsageLookupTarget(null);
          }}
          onPickRow={(row) => {
            if (!usageLookupTarget) return;
            if (process.env.NODE_ENV === "development") {
              console.log("[FeePayer 오수량 산정] 용도조회 onPickRow", {
                target: usageLookupTarget,
                gubun2: row.gubun2,
                midCategoryLabel: row.midCategoryLabel,
                buildingUse: row.buildingUse,
                dailySewage: row.dailySewage,
                calcMode: getSewageCalcModeForLine({
                  buildingUseSubCode: row.gubun2,
                  buildingUse: row.buildingUse,
                  midCategoryLabel: row.midCategoryLabel,
                }),
              });
            }
            applyUsageFromLookup(
              usageLookupTarget.entryId,
              usageLookupTarget.lineId,
              {
                buildingUse: row.buildingUse,
                dailySewage: row.dailySewage,
                midCategoryLabel: row.midCategoryLabel,
                gubun2: row.gubun2,
                armbuildBuildId: row.armbuildBuildId,
              },
            );
          }}
        />
      ) : null}

      <div className="p-0 pb-6">
        {entries.map((entry, entryIndex) => {
          const isPermitChangeCategory =
            entry.category === SEWAGE_CATEGORY.PERMIT_CHANGE;
          const entryPaid = entry.status === "PAID";
          const rowReadOnly = readOnly || entryPaid;
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
              <div className="flex-1 min-w-0 border border-gray-200 md:border-l-0">
                <div className="md:hidden px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-800">
                  {entryIndex + 1}
                </div>

                {/* 상태·구분·유형·통지일: md 한 줄(4칸), 모바일은 flex-wrap */}
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
                      onChange={handleEntryFieldChange}
                      options={statusOptions}
                      data-entry-id={entry.id}
                      disabled={rowReadOnly}
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
                      onChange={handleEntryFieldChange}
                      options={categoryOptions}
                      placeholder="--------선택하세요-----"
                      data-entry-id={entry.id}
                      disabled={rowReadOnly}
                    />
                  </FormField>
                  <FormField label="유형" isFirstInRow mdGridSpan={4}>
                    <FormSelect
                      name="type"
                      value={entry.type}
                      onChange={handleEntryFieldChange}
                      options={getSewageTypeOptionsForCategory(entry.category)}
                      placeholder="--------선택하세요-----"
                      data-entry-id={entry.id}
                      disabled={rowReadOnly}
                    />
                  </FormField>
                  <FormField label="통지일" isFirstInRow mdGridSpan={4}>
                    <FormInput
                      type="date"
                      name="notifyDate"
                      value={entry.notifyDate}
                      onChange={handleEntryFieldChange}
                      data-entry-id={entry.id}
                      readOnly={rowReadOnly}
                      className={rowReadOnly ? readOnlyInputClass : undefined}
                    />
                  </FormField>
                </div>

                {/* 1행: 기준단가·오수량·계산 / 2행: 원인자부담금·오수부과량 */}
                <FormField
                  label=" "
                  fullWidth
                  fieldOnlyFullWidth
                  forceTopBorder
                  alignFieldStart
                >
                  <div className="w-full">
                    <span className="sr-only">
                      기준단가, 오수량, 계산 버튼, 원인자부담금, 오수부과량
                    </span>
                    {/* md: 2+2 열 + 계산열 동일 폭 스페이서로 세로 정렬, 선은 연한 회색 */}
                    <div className="feePayerPriceGrid w-full overflow-hidden rounded-none border border-[#e5e7eb] bg-white">
                      <div className="flex w-full flex-col md:flex-row md:items-stretch">
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col border-b border-[#e5e7eb] md:flex-row md:border-b-0 md:border-r md:border-[#e5e7eb]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 text-[13px] font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:py-2">
                            기준단가
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="w-full min-w-0">
                              <FormInput
                                type="text"
                                name="unitPrice"
                                value={entry.unitPrice}
                                onChange={handleEntryFieldChange}
                                placeholder="예: 12,000"
                                readOnly={rowReadOnly || !isPermitChangeCategory}
                                className={
                                  rowReadOnly || !isPermitChangeCategory
                                    ? readOnlyInputClass
                                    : undefined
                                }
                                data-entry-id={entry.id}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col border-b border-[#e5e7eb] md:flex-row md:border-b-0 md:border-r md:border-[#e5e7eb]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 text-[13px] font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:py-2">
                            오수량
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="w-full min-w-0">
                              <FormInput
                                type="text"
                                name="sewageVolume"
                                value={entry.sewageVolume}
                                onChange={handleEntryFieldChange}
                                placeholder="예: 9.8"
                                readOnly={rowReadOnly || !isPermitChangeCategory}
                                className={
                                  rowReadOnly || !isPermitChangeCategory
                                    ? readOnlyInputClass
                                    : undefined
                                }
                                data-entry-id={entry.id}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex min-h-[45px] w-full shrink-0 items-center justify-center border-b border-[#e5e7eb] px-2 py-2 md:w-[104px] md:border-b-0 md:border-r-0 md:bg-gray-50/60">
                          {!readOnly ? (
                            <button
                              type="button"
                              className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ minWidth: "80px" }}
                              onClick={() => void handleCalculateEntry(entry.id)}
                              disabled={
                                calcBusyEntryId === entry.id ||
                                isPermitChangeCategory ||
                                rowReadOnly
                              }
                              title={
                                entryPaid
                                  ? "납부 처리된 블록은 수정·계산할 수 없습니다."
                                  : isPermitChangeCategory
                                    ? "허가사항변경은 계산 없이 금액·오수량 등을 직접 입력합니다."
                                    : "서버 계산(선저장 후 f_cost)"
                              }
                            >
                              {calcBusyEntryId === entry.id ? "계산 중…" : "계산"}
                            </button>
                          ) : (
                            <div
                              className="flex min-h-[40px] min-w-[80px] items-center justify-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-[13px] text-gray-500"
                              aria-hidden
                            >
                              계산
                            </div>
                          )}
                        </div>
                      </div>
                      {/* 1행↔2행 가로 구분: 데이터 열만(계산 열·스페이서 아래 선 없음) */}
                      <div className="feePayerPriceGridRow2 flex w-full flex-col bg-gray-50/50 md:flex-row md:items-stretch">
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col border-b border-[#e5e7eb] shadow-[inset_0_1px_0_0_#d1d5db] md:flex-row md:border-b-0 md:border-r md:border-[#e5e7eb]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 text-[13px] font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:border-0 md:py-2">
                            원인자부담금
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="w-full min-w-0">
                              <FormInput
                                type="text"
                                name="causerCharge"
                                value={entry.causerCharge}
                                onChange={handleEntryFieldChange}
                                placeholder="예: 300,000원"
                                data-entry-id={entry.id}
                                readOnly={rowReadOnly}
                                className={
                                  rowReadOnly ? readOnlyInputClass : undefined
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="feePayerPricePair flex min-h-[45px] w-full min-w-0 flex-1 flex-col md:flex-row md:border-r md:border-[#e5e7eb] md:shadow-[inset_0_1px_0_0_#d1d5db]">
                          <label className="m-0 flex min-h-[40px] shrink-0 items-center bg-gray-100 px-2 py-1.5 text-[13px] font-bold text-gray-800 register-form-label md:w-[34%] md:max-w-[8.5rem] md:border-0 md:py-2">
                            오수부과량
                          </label>
                          <div className="register-form-mobile-field flex min-h-[40px] flex-1 items-center border-t border-[#e5e7eb] p-[5px] md:min-h-[45px] md:border-t-0">
                            <div className="w-full min-w-0">
                              <FormInput
                                type="text"
                                name="sewageLevyAmount"
                                value={entry.sewageLevyAmount}
                                onChange={handleEntryFieldChange}
                                placeholder="오수부과량"
                                data-entry-id={entry.id}
                                readOnly={rowReadOnly}
                                className={
                                  rowReadOnly ? readOnlyInputClass : undefined
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div
                          className="hidden min-h-[45px] shrink-0 md:block md:w-[104px] md:bg-gray-50/50"
                          aria-hidden
                        />
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
                    <span className="sr-only">층수~삭제 상세 행 추가</span>
                    <div className="flex w-full justify-end">
                      {!readOnly && !rowReadOnly ? (
                        <button
                          type="button"
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ minWidth: "72px" }}
                          onClick={() => handleAddDetailLine(entry.id)}
                        >
                          추가
                        </button>
                      ) : null}
                    </div>
                  </div>
                </FormField>

                {/* 층수·용도·… 상세: `추가`는 원인자부담금·계산 행 아래, 동일 열 1..n. 부담금 산정 행과 동일(회색 라벨 + 값 셀). */}
                {entry.lines.map((line, lineIndex) => {
                  const lineCalcMode = getSewageCalcModeForLine({
                    buildingUseSubCode: line.buildingUseSubCode,
                    buildingUse: line.usage,
                    midCategoryLabel: line.midCategoryLabel,
                  });
                  return (
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
                        {lineIndex + 1}행 — 층수, 용도, 산정 모드에 따른 면적 또는
                        방수(·다중주택일 때 세대수), 1일 오수 발생량, 행 선택,
                        오수량(산출), 삭제
                      </span>
                      <div className="flex w-full flex-col flex-wrap md:flex-row md:items-stretch">
                        <div className="flex min-w-0 w-full flex-col md:ml-0 md:flex-[0.55] md:flex-row md:items-stretch">
                          <label
                            className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                            style={{
                              border: "1px solid #dee2e6",
                              padding: "5px",
                            }}
                          >
                            층수
                          </label>
                          <div
                            className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                          >
                            <div className="w-full">
                              <FormSelect
                                name="floor"
                                value={line.floor}
                                onChange={handleEntryFieldChange}
                                options={floorOptions}
                                data-entry-id={entry.id}
                                data-line-id={line.id}
                                disabled={rowReadOnly}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:-ml-px md:flex-[1.9] md:flex-row md:items-stretch md:border-t-0">
                          <label
                            className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                            style={{
                              border: "1px solid #dee2e6",
                              padding: "5px",
                            }}
                          >
                            용도
                          </label>
                          <div
                            className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                          >
                            <div className="w-full flex items-stretch gap-1">
                              <div className="min-w-0 flex-1">
                                <FormInput
                                  type="text"
                                  name="usage"
                                  value={line.usage}
                                  onChange={handleEntryFieldChange}
                                  readOnly
                                  className="bg-gray-100"
                                  placeholder="용도 조회로 선택"
                                  title="용도는 조회 모달로만 지정됩니다. 돋보기를 눌러주세요."
                                  data-entry-id={entry.id}
                                  data-line-id={line.id}
                                />
                              </div>
                              {!readOnly && !rowReadOnly ? (
                                <button
                                  type="button"
                                  className="flex h-10 min-h-[2.5rem] w-10 min-w-[2.5rem] flex-shrink-0 items-center justify-center rounded-none border-0 bg-[#1967d2] text-white transition-colors hover:bg-[#1557b0]"
                                  title="용도 조회"
                                  aria-label="용도 조회"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setUsageLookupTarget({
                                      entryId: entry.id,
                                      lineId: line.id,
                                    });
                                    setUsageLookupOpen(true);
                                  }}
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden
                                  >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                  </svg>
                                </button>
                              ) : (
                                <div
                                  className="flex h-10 min-h-[2.5rem] w-10 min-w-[2.5rem] flex-shrink-0 items-center justify-center rounded-none border border-gray-200 bg-gray-200"
                                  title="읽기 전용"
                                  aria-hidden
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        {lineCalcMode === "default" ? (
                          <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:-ml-px md:flex-[0.55] md:flex-row md:items-stretch md:border-t-0">
                            <label
                              className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                              style={{
                                border: "1px solid #dee2e6",
                                padding: "5px",
                              }}
                            >
                              면적
                            </label>
                            <div
                              className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                            >
                              <div className="w-full">
                                <FormInput
                                  type="text"
                                  name="area"
                                  value={line.area}
                                  onChange={handleEntryFieldChange}
                                  placeholder="면적"
                                  data-entry-id={entry.id}
                                  data-line-id={line.id}
                                  readOnly={rowReadOnly}
                                  className={
                                    rowReadOnly ? readOnlyInputClass : undefined
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {lineCalcMode !== "default" ? (
                          <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:-ml-px md:flex-[0.55] md:flex-row md:items-stretch md:border-t-0">
                            <label
                              className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                              style={{
                                border: "1px solid #dee2e6",
                                padding: "5px",
                              }}
                            >
                              방수
                            </label>
                            <div
                              className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                            >
                              <div className="w-full">
                                <FormInput
                                  type="text"
                                  name="roomCount"
                                  value={line.roomCount ?? ""}
                                  onChange={handleEntryFieldChange}
                                  placeholder="방"
                                  inputMode="decimal"
                                  data-entry-id={entry.id}
                                  data-line-id={line.id}
                                  readOnly={rowReadOnly}
                                  className={
                                    rowReadOnly ? readOnlyInputClass : undefined
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {lineCalcMode === "multi" ? (
                          <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:-ml-px md:flex-[0.55] md:flex-row md:items-stretch md:border-t-0">
                            <label
                              className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                              style={{
                                border: "1px solid #dee2e6",
                                padding: "5px",
                              }}
                            >
                              세대수
                            </label>
                            <div
                              className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                            >
                              <div className="w-full">
                                <FormInput
                                  type="text"
                                  name="householdCount"
                                  value={line.householdCount ?? ""}
                                  onChange={handleEntryFieldChange}
                                  placeholder="세대"
                                  inputMode="numeric"
                                  data-entry-id={entry.id}
                                  data-line-id={line.id}
                                  readOnly={rowReadOnly}
                                  className={
                                    rowReadOnly ? readOnlyInputClass : undefined
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="flex min-w-0 w-full flex-col border-t border-[#dee2e6] md:-ml-px md:min-w-[15.5rem] md:flex-[1.65] md:flex-row md:items-stretch md:border-t-0">
                          <label
                            className="m-0 flex w-full shrink-0 items-center whitespace-nowrap bg-gray-100 text-sm register-form-label md:w-[42%]"
                            style={{
                              border: "1px solid #dee2e6",
                              padding: "5px",
                            }}
                          >
                            1일오수발생량
                          </label>
                          <div
                            className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                          >
                            <div className="w-full">
                              <FormInput
                                type="text"
                                name="dailySewage"
                                value={line.dailySewage}
                                onChange={handleEntryFieldChange}
                                placeholder="1일 오수발생량"
                                readOnly
                                className="bg-gray-100"
                                data-entry-id={entry.id}
                                data-line-id={line.id}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex w-full shrink-0 items-center justify-center border-t border-solid border-[#dee2e6] py-2 md:-ml-px md:min-h-0 md:w-11 md:flex-none md:border md:border-solid md:border-[#dee2e6] md:px-0 md:py-0">
                          <input
                            type="checkbox"
                            name="selected"
                            checked={line.selected}
                            onChange={handleEntryFieldChange}
                            data-entry-id={entry.id}
                            data-line-id={line.id}
                            className="h-4 w-4 rounded border-gray-300"
                            aria-label="체크 시 오수량 산정식 끝에 곱하기 0, 미체크 시 곱하기 1"
                            title="체크: 산정 결과×0 / 미체크: ×1"
                            disabled={rowReadOnly}
                          />
                        </div>
                        <div className="flex w-full shrink-0 flex-col justify-center gap-2 border-t border-solid border-[#dee2e6] px-2 py-2 md:-ml-px md:w-auto md:min-w-0 md:flex-1 md:flex-row md:flex-wrap md:items-center md:border md:border-solid md:border-[#dee2e6] md:py-2">
                          <div className="flex w-full min-w-[5.5rem] flex-col gap-0.5 md:w-auto md:max-w-[7.5rem]">
                            <span className="px-0.5 text-[11px] font-medium text-gray-600 md:hidden">
                              오수량
                            </span>
                            <FormInput
                              type="text"
                              name="sewageQty"
                              value={line.sewageQty ?? ""}
                              placeholder="오수량"
                              title="분류 중분류(단독주택·공동주택 등)·면적·방·세대·1일오수에 따라 자동 산출"
                              readOnly
                              className={readOnlyInputClass}
                              data-entry-id={entry.id}
                              data-line-id={line.id}
                            />
                          </div>
                          {!readOnly && !rowReadOnly ? (
                            <button
                              type="button"
                              className="px-4 py-2 text-sm border border-gray-400 rounded-full bg-white text-gray-800 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              style={{ minWidth: "72px" }}
                              onClick={() =>
                                handleRemoveDetailLine(entry.id, line.id)
                              }
                              disabled={
                                entry.lines.length === 1 &&
                                entries.length === 1
                              }
                              title={
                                entry.lines.length === 1 &&
                                entries.length === 1
                                  ? "최소 한 통지일 블록·한 상세 행은 유지됩니다"
                                  : undefined
                              }
                            >
                              삭제
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </FormField>
                  );
                })}

                {/* 통지일 블록(엔트리) 추가: 카드 하단 경계 가운데, 원이 선에 반쯝 걸치게 */}
                {!readOnly && showAddNoticeBlockButton ? (
                  <div className="relative border-t border-[#dee2e6] pt-5 pb-4">
                    <button
                      type="button"
                      className="absolute left-1/2 top-0 z-[1] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-2xl font-light leading-none text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="통지일 블록 추가"
                      title={
                        canAddNoticeBlock
                          ? "통지일 블록 추가"
                          : "기존 통지일 블록이 모두 납부 상태일 때만 추가할 수 있습니다."
                      }
                      disabled={!canAddNoticeBlock}
                      onClick={handleAddEntry}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-[#dee2e6] pt-2 pb-2" />
                )}
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
};
