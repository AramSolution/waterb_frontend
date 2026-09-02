"use client";

import React, { useLayoutEffect, useMemo, useState, type MutableRefObject } from "react";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormField, FormInput, FormSelect } from "@/shared/ui/adminWeb/form";
import {
  feePayStatusReadOnlyFieldClassName,
  feePayStatusSelectClassName,
} from "@/features/adminWeb/support/lib/feePayStatusUi";
import type { SupportDrainageEquipRegisterRequest } from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import {
  buildSupportDrainageEquipRegisterRequestForPersist,
  hasInvalidRequiredFieldsInDrainageEntries,
} from "../lib/buildSupportDrainageEquipRegisterRequest";
import {
  isDrainageEquipEntryPaid,
  useDrainageEquipDetailSection,
  type DrainageEquipApiBridge,
  type DrainageEquipDetailEntry,
} from "../model/useDrainageEquipDetailSection";
import {
  DrainageEquipPaidDateField,
  DrainageEquipReqDateField,
} from "./drainageEquipDetailFieldUi";

export interface DrainageEquipDetailSectionProps {
  readOnly?: boolean;
  /** 상세 편집 등 — 상태(미납/납부)만 변경 불가 */
  statusReadOnly?: boolean;
  initialEntries?: DrainageEquipDetailEntry[];
  drainageEquipApi?: DrainageEquipApiBridge | null;
  persistRequestBuilderRef?: MutableRefObject<
    (() => SupportDrainageEquipRegisterRequest | null) | null
  >;
  persistBuildStateRef?: MutableRefObject<"invalid_required" | "no_changes" | null>;
}

export const DrainageEquipDetailSection: React.FC<
  DrainageEquipDetailSectionProps
> = ({
  readOnly = false,
  statusReadOnly = false,
  initialEntries,
  drainageEquipApi = null,
  persistRequestBuilderRef,
  persistBuildStateRef,
}) => {
  const statusFieldReadOnly = readOnly || statusReadOnly;
  const [showStatusRuleDialog, setShowStatusRuleDialog] = useState(false);
  const [statusRuleDialogMessage, setStatusRuleDialogMessage] = useState("");

  const {
    entries,
    removedDetailSeqsRef,
    handleAddEntry,
    handleEntryFieldChange,
  } = useDrainageEquipDetailSection(initialEntries, {
    statusReadOnly: statusFieldReadOnly,
    onStatusChangeBlocked: (message) => {
      setStatusRuleDialogMessage(message);
      setShowStatusRuleDialog(true);
    },
  });

  const statusOptions = useMemo(
    () => [
      { value: "UNPAID", label: "미납" },
      { value: "PAID", label: "납부" },
    ],
    [],
  );

  const canAddDetailBlock = useMemo(
    () => entries.length > 0 && entries.every((e) => e.status === "PAID"),
    [entries],
  );

  useLayoutEffect(() => {
    if (!persistRequestBuilderRef) return;
    if (!drainageEquipApi?.getBasicInfoBody) {
      persistRequestBuilderRef.current = null;
      if (persistBuildStateRef) persistBuildStateRef.current = null;
      return;
    }
    persistRequestBuilderRef.current = () => {
      if (persistBuildStateRef) persistBuildStateRef.current = null;
      const basicInfo = drainageEquipApi.getBasicInfoBody?.();
      if (!basicInfo) return null;
      const rawId = drainageEquipApi.itemId;
      const itemId =
        rawId != null && String(rawId).trim() !== ""
          ? String(rawId).trim()
          : undefined;
      if (hasInvalidRequiredFieldsInDrainageEntries(entries)) {
        if (persistBuildStateRef) {
          persistBuildStateRef.current = "invalid_required";
        }
        return null;
      }
      const body = buildSupportDrainageEquipRegisterRequestForPersist({
        basicInfo,
        itemId,
        entries,
        removedDetailSeqs: removedDetailSeqsRef.current,
      });
      if (!body && persistBuildStateRef) {
        persistBuildStateRef.current = "no_changes";
      }
      return body;
    };
    return () => {
      persistRequestBuilderRef.current = null;
      if (persistBuildStateRef) persistBuildStateRef.current = null;
    };
  }, [
    entries,
    drainageEquipApi,
    persistRequestBuilderRef,
    persistBuildStateRef,
    removedDetailSeqsRef,
  ]);

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="flex items-center justify-between border-b border-gray-200 pl-6 pr-4 py-4">
        <h5 className="text-lg font-semibold mb-0">배수설비 등록분</h5>
        {!readOnly ? (
          <button
            type="button"
            className="px-3 py-2 text-base bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minWidth: "72px" }}
            title={
              canAddDetailBlock
                ? "등록분 추가"
                : "기존 등록분이 모두 납부 상태일 때만 추가할 수 있습니다."
            }
            disabled={!canAddDetailBlock}
            onClick={handleAddEntry}
          >
            등록분 추가
          </button>
        ) : null}
      </div>

      <div className="p-0 pb-6">
        {entries.map((entry, entryIndex) => {
          const displayIndex = entries.length - entryIndex;
          const paid = isDrainageEquipEntryPaid(entry);
          const paidFieldsDisabled = readOnly || !paid;

          return (
            <div
              key={entry.id}
              className={
                entryIndex > 0
                  ? "mt-0 pt-6 mx-6"
                  : "mx-6 mt-0 pt-4 pb-0"
              }
            >
              <div className="flex flex-col md:flex-row md:items-stretch">
                <div
                  className="hidden md:flex w-11 shrink-0 items-start justify-center py-3 bg-gray-200 text-gray-800 font-semibold text-sm border border-gray-200 border-b-0 md:border-b md:border-r-0"
                  aria-hidden
                >
                  {displayIndex}
                </div>
                <div className="min-w-0 flex-1 border border-gray-200 md:border-l-0">
                  <div className="md:hidden px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-800">
                    {displayIndex}
                  </div>

                  <div className="flex flex-wrap">
                    <FormField
                      label="상태"
                      isFirstRow={entryIndex === 0}
                      isFirstInRow
                      suppressTopBorder={entryIndex > 0}
                      suppressBottomBorder
                    >
                      {statusFieldReadOnly ? (
                        <div className="flex w-full min-w-0 flex-1 self-stretch">
                          <span
                            className={feePayStatusReadOnlyFieldClassName(paid)}
                          >
                            {paid ? "납부" : "미납"}
                          </span>
                        </div>
                      ) : (
                        <FormSelect
                          name="status"
                          value={entry.status}
                          onChange={handleEntryFieldChange}
                          options={statusOptions}
                          data-entry-id={entry.id}
                          selectClassName={feePayStatusSelectClassName(
                            entry.status,
                          )}
                        />
                      )}
                    </FormField>
                    <FormField
                      label="배수설비 금액"
                      required
                      isFirstInRow
                      suppressTopBorder={entryIndex > 0}
                      suppressBottomBorder
                    >
                      <div className="relative w-full">
                        <FormInput
                          type="text"
                          name="equipCost"
                          value={entry.equipCost}
                          onChange={handleEntryFieldChange}
                          readOnly={readOnly || paid}
                          inputMode="numeric"
                          data-entry-id={entry.id}
                          placeholder="0"
                          className="pr-8 text-right placeholder:text-left"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                          원
                        </span>
                      </div>
                    </FormField>
                  </div>

                  <div className="flex flex-wrap">
                    <DrainageEquipReqDateField
                      label="등록일"
                      value={entry.reqDate}
                      entryId={entry.id}
                      readOnly={readOnly}
                      isFirstInRow
                      forceTopBorder
                      suppressBottomBorder
                      onChange={handleEntryFieldChange}
                    />
                    <DrainageEquipPaidDateField
                      label="착공일"
                      name="startDate"
                      value={entry.startDate}
                      reqDate={entry.reqDate}
                      entryId={entry.id}
                      paid={paid}
                      readOnly={readOnly}
                      isFirstInRow
                      forceTopBorder
                      suppressBottomBorder
                      onChange={handleEntryFieldChange}
                    />
                  </div>

                  <div className="flex flex-wrap">
                    <DrainageEquipPaidDateField
                      label="준공예정일"
                      name="planDate"
                      value={entry.planDate}
                      reqDate={entry.reqDate}
                      entryId={entry.id}
                      paid={paid}
                      readOnly={readOnly}
                      isFirstInRow
                      forceTopBorder
                      suppressBottomBorder
                      onChange={handleEntryFieldChange}
                    />
                    <DrainageEquipPaidDateField
                      label="준공일"
                      name="compDate"
                      value={entry.compDate}
                      reqDate={entry.reqDate}
                      entryId={entry.id}
                      paid={paid}
                      readOnly={readOnly}
                      isFirstInRow
                      forceTopBorder
                      suppressBottomBorder
                      onChange={handleEntryFieldChange}
                    />
                  </div>

                  <FormField label="대행업체" fullWidth forceTopBorder>
                    <FormInput
                      type="text"
                      name="agency"
                      value={entry.agency}
                      onChange={handleEntryFieldChange}
                      data-entry-id={entry.id}
                      readOnly={paidFieldsDisabled}
                      placeholder="대행업체 입력"
                      maxLength={200}
                    />
                  </FormField>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={showStatusRuleDialog}
        title="오류"
        message={statusRuleDialogMessage}
        type="danger"
        confirmText="확인"
        onConfirm={() => setShowStatusRuleDialog(false)}
        onCancel={() => setShowStatusRuleDialog(false)}
      />
    </div>
  );
};
