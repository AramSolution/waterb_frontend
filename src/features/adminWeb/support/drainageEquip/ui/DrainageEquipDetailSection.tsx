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
  initialEntries,
  drainageEquipApi = null,
  persistRequestBuilderRef,
  persistBuildStateRef,
}) => {
  const [showStatusRuleDialog, setShowStatusRuleDialog] = useState(false);
  const [statusRuleDialogMessage, setStatusRuleDialogMessage] = useState("");

  const {
    entries,
    removedDetailSeqsRef,
    handleAddEntry,
    handleEntryFieldChange,
  } = useDrainageEquipDetailSection(initialEntries, {
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
      <div className="border-b border-gray-200 px-6 py-4">
        <h5 className="text-lg font-semibold mb-0">배수설비 등록분</h5>
      </div>

      <div className="p-0 pb-6">
        {entries.map((entry, entryIndex) => {
          const paid = isDrainageEquipEntryPaid(entry);
          const paidFieldsDisabled = readOnly || !paid;
          const sectionFirstRow = entryIndex === 0;
          const blockContinues = entryIndex > 0;

          return (
            <React.Fragment key={entry.id}>
              {blockContinues ? (
                <div className="border-t border-gray-200" aria-hidden />
              ) : null}

              <div className="flex flex-wrap">
                <FormField
                  label="상태"
                  isFirstRow={sectionFirstRow}
                  isFirstInRow
                  forceTopBorder={blockContinues}
                  suppressBottomBorder
                >
                  {readOnly ? (
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
                  forceTopBorder={blockContinues}
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

              {!readOnly && entryIndex === entries.length - 1 ? (
                <div className="relative mt-3 h-0 overflow-visible border-t border-[#dee2e6]">
                  <button
                    type="button"
                    className="absolute left-1/2 top-0 z-[1] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="등록분 추가"
                    title={
                      canAddDetailBlock
                        ? "등록분 추가"
                        : "기존 등록분이 모두 납부 상태일 때만 추가할 수 있습니다."
                    }
                    disabled={!canAddDetailBlock}
                    onClick={handleAddEntry}
                  >
                    <span className="block translate-y-[-0.08em] text-3xl font-light leading-none">
                      +
                    </span>
                  </button>
                </div>
              ) : null}
            </React.Fragment>
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
