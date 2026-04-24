"use client";

import React, { useMemo, useState } from "react";
import { FormField, FormInput, FormSelect } from "@/shared/ui/adminWeb/form";
import { useFeePayerSewageVolumeEstimate } from "../model/useFeePayerSewageVolumeEstimate";
import { UsageLookupModal } from "./UsageLookupModal";

/** 오수량 발생량 산정 — `UsageLookupModal`은 용도 **조회** 전용. 섹션 헤더 `추가` = 통지일 블록 전체 추가, 원인자부담금·계산 행 아래 `추가` = 층수~삭제 상세 행만 추가. */
export const FeePayerSewageVolumeEstimateSection: React.FC = () => {
  const [usageLookupOpen, setUsageLookupOpen] = useState(false);
  const [usageLookupTarget, setUsageLookupTarget] = useState<{
    entryId: string;
    lineId: string;
  } | null>(null);

  const {
    entries,
    handleAddEntry,
    handleAddDetailLine,
    handleRemoveDetailLine,
    handleEntryFieldChange,
    handleCalculateEntry,
    handleEntrySewageButton,
    applyUsageFromLookup,
  } = useFeePayerSewageVolumeEstimate();

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
  /** 유형: 기획 문구(백엔드 코드 확정 시 value만 맞추면 됨) */
  const typeOptions = useMemo(
    () => [
      {
        value: "BUILD_NEW_ALT",
        label: "개별건축물(신축, 증축, 변경)",
      },
      {
        value: "OTHER_ACT_BUILD",
        label: "타행위(신축, 개축)",
      },
      {
        value: "PERMIT_CHG_BUILD",
        label: "허가사항변경(개축)",
      },
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

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-lg font-semibold mb-0">오수량 발생량 산정</h5>
        <button
          type="button"
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minWidth: "72px" }}
          onClick={handleAddEntry}
        >
          추가
        </button>
      </div>

      <UsageLookupModal
        isOpen={usageLookupOpen}
        onClose={() => {
          setUsageLookupOpen(false);
          setUsageLookupTarget(null);
        }}
        onPickRow={(row) => {
          if (!usageLookupTarget) return;
          applyUsageFromLookup(usageLookupTarget.entryId, usageLookupTarget.lineId, {
            buildingUse: row.buildingUse,
            dailySewage: row.dailySewage,
          });
        }}
      />

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
              <div className="flex-1 min-w-0 border border-gray-200 md:border-l-0">
                <div className="md:hidden px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-800">
                  {entryIndex + 1}
                </div>

                {/* 상태·구분·유형·통지일: 기본정보와 동일한 FormField 라벨(회색) + 2열 규칙. */}
                <div className="flex flex-wrap">
                  <FormField
                    label="상태"
                    isFirstRow={entryIndex === 0}
                    isFirstInRow
                    forceTopBorder={entryIndex > 0}
                  >
                    <FormSelect
                      name="status"
                      value={entry.status}
                      onChange={handleEntryFieldChange}
                      options={statusOptions}
                      placeholder="--------선택하세요-----"
                      data-entry-id={entry.id}
                    />
                  </FormField>
                  <FormField
                    label="구분"
                    isFirstInRow
                    forceTopBorder={entryIndex > 0}
                  >
                    <FormSelect
                      name="category"
                      value={entry.category}
                      onChange={handleEntryFieldChange}
                      options={categoryOptions}
                      placeholder="--------선택하세요-----"
                      data-entry-id={entry.id}
                    />
                  </FormField>
                </div>

                <div className="flex flex-wrap">
                  <FormField label="유형">
                    <FormSelect
                      name="type"
                      value={entry.type}
                      onChange={handleEntryFieldChange}
                      options={typeOptions}
                      placeholder="--------선택하세요-----"
                      data-entry-id={entry.id}
                    />
                  </FormField>
                  <FormField label="통지일" isFirstInRow>
                    <FormInput
                      type="date"
                      name="notifyDate"
                      value={entry.notifyDate}
                      onChange={handleEntryFieldChange}
                      data-entry-id={entry.id}
                    />
                  </FormField>
                </div>

                {/* 기준단가·오수량·원인자부담금: 통합 회색 라벨 없이 라벨+값 셀 3세트 + 계산 (md 한 줄) */}
                <FormField
                  label=" "
                  fullWidth
                  fieldOnlyFullWidth
                  forceTopBorder
                  alignFieldStart
                >
                  <div className="w-full">
                    <span className="sr-only">
                      기준단가, 오수량, 원인자부담금 산정 및 계산
                    </span>
                    <div className="flex w-full flex-col md:flex-row md:flex-nowrap md:items-stretch">
                      <div className="flex min-w-0 w-full flex-col md:ml-0 md:flex-1 md:flex-row md:items-stretch">
                        <label
                          className="m-0 flex w-full shrink-0 items-center bg-gray-100 register-form-label md:w-1/4"
                          style={{
                            border: "1px solid #dee2e6",
                            padding: "5px",
                          }}
                        >
                          기준단가
                        </label>
                        <div
                          className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                        >
                          <div className="w-full">
                            <FormInput
                              type="text"
                              name="unitPrice"
                              value={entry.unitPrice}
                              onChange={handleEntryFieldChange}
                              placeholder="예: 12,000"
                              readOnly
                              className="bg-gray-100"
                              data-entry-id={entry.id}
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
                          오수량
                        </label>
                        <div
                          className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                        >
                          <div className="w-full">
                            <FormInput
                              type="text"
                              name="sewageVolume"
                              value={entry.sewageVolume}
                              onChange={handleEntryFieldChange}
                              placeholder="예: 9.8"
                              readOnly
                              className="bg-gray-100"
                              data-entry-id={entry.id}
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
                        <div
                          className="register-form-mobile-field flex w-full min-w-0 items-center border border-solid border-[#dee2e6] border-t-0 p-[5px] md:flex-1 md:border-l-0 md:border-t"
                        >
                          <div className="w-full">
                            <FormInput
                              type="text"
                              name="causerCharge"
                              value={entry.causerCharge}
                              onChange={handleEntryFieldChange}
                              placeholder="예: 300,000원"
                              data-entry-id={entry.id}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full shrink-0 items-end justify-start border-t border-solid border-[#dee2e6] px-2 py-2 md:-ml-px md:w-auto md:border md:border-solid md:border-[#dee2e6] md:py-2">
                        <button
                          type="button"
                          className="px-4 py-2 text-sm border border-gray-400 rounded-full bg-white text-gray-800 hover:bg-gray-50 transition-colors"
                          style={{ minWidth: "88px" }}
                          onClick={() => handleCalculateEntry(entry.id)}
                        >
                          계산
                        </button>
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
                      <button
                        type="button"
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minWidth: "72px" }}
                        onClick={() => handleAddDetailLine(entry.id)}
                      >
                        추가
                      </button>
                    </div>
                  </div>
                </FormField>

                {/* 층수·용도·… 상세: `추가`는 원인자부담금·계산 행 아래, 동일 열 1..n. 부담금 산정 행과 동일(회색 라벨 + 값 셀). */}
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
                        {lineIndex + 1}행 — 층수, 면적, 용도, 1일 오수
                        발생량, 행 선택, 오수량, 삭제
                      </span>
                      <div className="flex w-full flex-col md:flex-row md:flex-nowrap md:items-stretch">
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
                              />
                            </div>
                          </div>
                        </div>
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
                            </div>
                          </div>
                        </div>
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
                            aria-label="행 선택"
                          />
                        </div>
                        <div className="flex w-full shrink-0 flex-col justify-center gap-2 border-t border-solid border-[#dee2e6] px-2 py-2 md:-ml-px md:w-auto md:flex-row md:flex-wrap md:items-center md:border md:border-solid md:border-[#dee2e6] md:py-2">
                          <button
                            type="button"
                            className="px-3 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                            style={{ minWidth: "88px" }}
                            onClick={() =>
                              handleEntrySewageButton(entry.id, line.id)
                            }
                          >
                            오수량
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 text-sm border border-gray-400 rounded-full bg-white text-gray-800 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ minWidth: "72px" }}
                            onClick={() =>
                              handleRemoveDetailLine(entry.id, line.id)
                            }
                            disabled={
                              entry.lines.length === 1 && entries.length === 1
                            }
                            title={
                              entry.lines.length === 1 && entries.length === 1
                                ? "최소 한 통지일 블록·한 상세 행은 유지됩니다"
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
      </div>
    </div>
  );
};
