"use client";

import React, { useEffect, useId, useRef } from "react";
import type {
  RecruitTargetGroup,
  RecruitTargetOtherItem,
} from "./recruitTargetOptions";

export interface RecruitTargetGroupOnlyFieldsProps {
  targetGroups: RecruitTargetGroup[];
  otherItems: RecruitTargetOtherItem[];
  recruitTarget: string[];
  /** checkbox: 그룹 단위 선택/해제 */
  onGroupChange?: (groupValues: string[], checked: boolean) => void;
  /** radio: 단일 그룹만 선택 — 해당 그룹 코드 전체로 `recruitTarget` 교체 */
  onRadioSelect?: (groupValues: string[]) => void;
  /** 기본 checkbox. radio 시 `onRadioSelect` 사용 */
  selectionMode?: "checkbox" | "radio";
  loading?: boolean;
  loadingText?: string;
}

function isGroupExactlySelected(
  groupValues: string[],
  recruitTarget: string[],
): boolean {
  if (groupValues.length === 0 || recruitTarget.length === 0) return false;
  if (recruitTarget.length !== groupValues.length) return false;
  const set = new Set(groupValues);
  return recruitTarget.every((v) => set.has(v));
}

function GroupCheckbox({
  groupLabel,
  groupValues,
  recruitTarget,
  onGroupChange,
}: {
  groupLabel: string;
  groupValues: string[];
  recruitTarget: string[];
  onGroupChange: (groupValues: string[], checked: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const allSelected =
    groupValues.length > 0 &&
    groupValues.every((v) => recruitTarget.includes(v));
  const someSelected = groupValues.some((v) => recruitTarget.includes(v));

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        ref={inputRef}
        type="checkbox"
        checked={allSelected}
        onChange={(e) => onGroupChange(groupValues, e.target.checked)}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        aria-checked={
          allSelected ? "true" : someSelected ? "mixed" : "false"
        }
      />
      <span className="text-[13px] font-semibold text-gray-800">
        {groupLabel}
      </span>
    </label>
  );
}

function GroupRadio({
  groupLabel,
  groupValues,
  recruitTarget,
  onSelect,
  radioName,
}: {
  groupLabel: string;
  groupValues: string[];
  recruitTarget: string[];
  onSelect: () => void;
  radioName: string;
}) {
  const selected = isGroupExactlySelected(groupValues, recruitTarget);
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name={radioName}
        checked={selected}
        onChange={() => onSelect()}
        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        aria-checked={selected}
      />
      <span className="text-[13px] font-semibold text-gray-800">
        {groupLabel}
      </span>
    </label>
  );
}

/**
 * 사업대상: 대분류(학교급·기타)만 표시. 소분류(학년)는 숨기고 그룹 선택 시 해당 코드 전체가 반영된다.
 * checkbox(기본) 또는 radio(단일 그룹) 선택 가능.
 */
export function RecruitTargetGroupOnlyFields({
  targetGroups,
  otherItems,
  recruitTarget,
  onGroupChange,
  onRadioSelect,
  selectionMode = "checkbox",
  loading,
  loadingText = "사업대상 목록 불러오는 중...",
}: RecruitTargetGroupOnlyFieldsProps) {
  const radioId = useId();
  const radioName = `recruitTargetGroup-${radioId.replace(/:/g, "")}`;

  if (loading) {
    return (
      <span className="text-[13px] text-gray-500">{loadingText}</span>
    );
  }

  if (selectionMode === "radio" && onRadioSelect) {
    return (
      <div className="flex flex-wrap gap-6 py-2" role="radiogroup">
        {targetGroups.map((group) => (
          <div
            key={group.groupLabel}
            className="flex min-w-[120px] items-center"
          >
            <GroupRadio
              groupLabel={group.groupLabel}
              groupValues={group.values}
              recruitTarget={recruitTarget}
              radioName={radioName}
              onSelect={() => onRadioSelect(group.values)}
            />
          </div>
        ))}
        {otherItems.length > 0 && (
          <div className="flex min-w-[120px] items-center">
            <GroupRadio
              groupLabel="기타"
              groupValues={otherItems.map((i) => i.value)}
              recruitTarget={recruitTarget}
              radioName={radioName}
              onSelect={() => onRadioSelect(otherItems.map((i) => i.value))}
            />
          </div>
        )}
      </div>
    );
  }

  const change = onGroupChange;
  if (!change) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-6 py-2">
      {targetGroups.map((group) => (
        <div
          key={group.groupLabel}
          className="flex min-w-[120px] items-center"
        >
          <GroupCheckbox
            groupLabel={group.groupLabel}
            groupValues={group.values}
            recruitTarget={recruitTarget}
            onGroupChange={change}
          />
        </div>
      ))}
      {otherItems.length > 0 && (
        <div className="flex min-w-[120px] items-center">
          <GroupCheckbox
            groupLabel="기타"
            groupValues={otherItems.map((i) => i.value)}
            recruitTarget={recruitTarget}
            onGroupChange={change}
          />
        </div>
      )}
    </div>
  );
}
