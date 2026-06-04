"use client";

import React, { type ChangeEvent } from "react";
import { FormDatePicker, FormField, FormInput } from "@/shared/ui/adminWeb/form";
import { normalizeDrainageYmd } from "../lib/drainageEquipDates";

const dashInputClassName =
  "bg-gray-100 text-center !cursor-default pointer-events-none";

function buildEntryDateChangeEvent(
  name: string,
  entryId: string,
  value: string,
): ChangeEvent<HTMLInputElement> {
  const syntheticTarget = {
    name,
    value,
    dataset: { entryId },
  } as unknown as HTMLInputElement;
  return { target: syntheticTarget } as ChangeEvent<HTMLInputElement>;
}

export interface DrainageEquipReqDateFieldProps {
  label: string;
  value: string;
  entryId: string;
  readOnly: boolean;
  isFirstInRow?: boolean;
  forceTopBorder?: boolean;
  suppressBottomBorder?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

/** 등록일 — 착공·준공일과 동일 `FormDatePicker` (Lucide 달력 아이콘) */
export function DrainageEquipReqDateField({
  label,
  value,
  entryId,
  readOnly,
  isFirstInRow,
  forceTopBorder,
  suppressBottomBorder,
  onChange,
}: DrainageEquipReqDateFieldProps) {
  const fieldProps = {
    label,
    isFirstInRow,
    forceTopBorder,
    suppressBottomBorder,
  };
  const dateValue = normalizeDrainageYmd(value);

  if (readOnly) {
    const display = dateValue || "-";
    return (
      <FormField {...fieldProps}>
        <FormInput
          type="text"
          name="reqDate"
          value={display}
          readOnly
          data-entry-id={entryId}
          className={dashInputClassName}
          onChange={() => {}}
        />
      </FormField>
    );
  }

  return (
    <FormField {...fieldProps} required>
      <FormDatePicker
        name="reqDate"
        value={dateValue}
        onChange={(e) =>
          onChange(buildEntryDateChangeEvent("reqDate", entryId, e.target.value))
        }
        placeholder=" "
      />
    </FormField>
  );
}

export interface DrainageEquipPaidDateFieldProps {
  label: string;
  name: "startDate" | "planDate" | "compDate";
  value: string;
  /** 등록일 (미납 UI용, 납부 시 날짜 자동 채움 없음) */
  reqDate: string;
  entryId: string;
  paid: boolean;
  readOnly: boolean;
  isFirstRow?: boolean;
  isFirstInRow?: boolean;
  forceTopBorder?: boolean;
  suppressBottomBorder?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function DrainageEquipPaidDateField({
  label,
  name,
  value,
  reqDate: _reqDate,
  entryId,
  paid,
  readOnly,
  isFirstRow,
  isFirstInRow,
  forceTopBorder,
  suppressBottomBorder,
  onChange,
}: DrainageEquipPaidDateFieldProps) {
  const fieldProps = {
    label,
    isFirstRow,
    isFirstInRow,
    forceTopBorder,
    suppressBottomBorder,
  };

  if (!paid) {
    return (
      <FormField {...fieldProps}>
        <FormInput
          type="text"
          name={name}
          value="-"
          readOnly
          data-entry-id={entryId}
          className={dashInputClassName}
          onChange={() => {}}
        />
      </FormField>
    );
  }

  const dateValue = normalizeDrainageYmd(value);

  if (readOnly) {
    const display = dateValue || "-";
    return (
      <FormField {...fieldProps}>
        <FormInput
          type="text"
          name={name}
          value={display}
          readOnly
          data-entry-id={entryId}
          className={dashInputClassName}
          onChange={() => {}}
        />
      </FormField>
    );
  }

  return (
    <FormField {...fieldProps}>
      <FormDatePicker
        name={name}
        value={dateValue}
        onChange={(e) =>
          onChange(buildEntryDateChangeEvent(name, entryId, e.target.value))
        }
        placeholder=" "
      />
    </FormField>
  );
}
