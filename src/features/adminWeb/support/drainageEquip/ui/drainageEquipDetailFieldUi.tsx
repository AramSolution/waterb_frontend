"use client";

import React, { type ChangeEvent } from "react";
import { FormField, FormInput } from "@/shared/ui/adminWeb/form";
import { normalizeDrainageYmd } from "../lib/drainageEquipDates";

const dashInputClassName =
  "bg-gray-100 text-center !cursor-default pointer-events-none";

export interface DrainageEquipPaidDateFieldProps {
  label: string;
  name: "startDate" | "planDate" | "compDate";
  value: string;
  /** 등록일 — 납부 시 날짜 기본값 */
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
  reqDate,
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

  const dateValue = normalizeDrainageYmd(value) || normalizeDrainageYmd(reqDate);

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
      <FormInput
        type="date"
        name={name}
        value={dateValue}
        onChange={onChange}
        data-entry-id={entryId}
      />
    </FormField>
  );
}
