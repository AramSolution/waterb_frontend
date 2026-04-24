"use client";

import React, { useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormInput } from "@/shared/ui/adminWeb/form";
import {
  PURPOSE_CATEGORY_TREE,
  usePurposeManage,
  type PurposeCategoryNode,
} from "../model/usePurposeManage";

function findLeafLabel(
  nodes: PurposeCategoryNode[],
  leafId: string,
): string | null {
  for (const n of nodes) {
    if (n.children?.length) {
      const hit = findLeafLabel(n.children, leafId);
      if (hit) return hit;
    } else if (n.id === leafId) {
      return n.label;
    }
  }
  return null;
}

export const PurposeManagePageView: React.FC = () => {
  const {
    expandedMajorIds,
    toggleMajor,
    selectedLeafId,
    handleSelectLeaf,
    currentRows,
    rowFieldErrors,
    handleAddRow,
    handleDeleteRow,
    handleRowChange,
    handleSave,
    showResultDialog,
    resultDialogTitle,
    resultDialogMessage,
    resultDialogType,
    closeResultDialog,
  } = usePurposeManage();

  const selectedLeafLabel = useMemo(
    () =>
      selectedLeafId ? findLeafLabel(PURPOSE_CATEGORY_TREE, selectedLeafId) : null,
    [selectedLeafId],
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">용도관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>업무관리</span> &gt; <span>용도관리</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            onClick={handleAddRow}
            disabled={!selectedLeafId}
          >
            추가
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 min-h-[420px]">
          {/* 분류 트리 */}
          <aside className="w-full lg:w-64 shrink-0 border border-gray-200 rounded overflow-hidden bg-gray-50">
            <div
              className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200 bg-gray-200"
              style={{ letterSpacing: "-0.02em" }}
            >
              분류
            </div>
            <div className="p-2 max-h-[480px] overflow-y-auto">
              <ul className="space-y-0.5">
                {PURPOSE_CATEGORY_TREE.map((major) => {
                  const open = expandedMajorIds.has(major.id);
                  return (
                    <li key={major.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-1 text-left text-sm py-1.5 px-1 rounded hover:bg-gray-200 text-gray-800"
                        onClick={() => toggleMajor(major.id)}
                      >
                        {open ? (
                          <ChevronDown className="w-4 h-4 shrink-0 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0 text-gray-600" />
                        )}
                        <span className="font-medium">{major.label}</span>
                      </button>
                      {open && major.children && (
                        <ul className="pl-6 pb-1 space-y-0.5">
                          {major.children.map((leaf) => {
                            const active = selectedLeafId === leaf.id;
                            return (
                              <li key={leaf.id}>
                                <button
                                  type="button"
                                  className={`w-full text-left text-sm py-1 px-2 rounded ${
                                    active
                                      ? "bg-blue-100 text-blue-900 font-medium"
                                      : "text-gray-700 hover:bg-gray-200"
                                  }`}
                                  onClick={() => handleSelectLeaf(leaf.id)}
                                >
                                  {leaf.label}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* 용도 행 목록 */}
          <section className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm text-gray-600">
              {selectedLeafId && selectedLeafLabel ? (
                <>
                  선택 분류:{" "}
                  <span className="font-medium text-gray-900">
                    {selectedLeafLabel}
                  </span>
                </>
              ) : (
                "왼쪽에서 중분류(말단 분류)를 선택한 뒤 행을 추가하세요."
              )}
            </div>

            <div className="flex-1 overflow-x-auto p-3">
              {!selectedLeafId ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  중분류를 선택하면 이 영역에 건축물 용도·1일 오수발생량·비고를
                  입력할 수 있습니다.
                </p>
              ) : (
                <div className="min-w-[640px]">
                  <div
                    className="grid gap-2 items-end text-xs font-medium text-gray-700 mb-2"
                    style={{
                      gridTemplateColumns:
                        "minmax(140px,1.2fr) minmax(120px,0.9fr) minmax(180px,2fr) auto",
                    }}
                  >
                    <div className="pl-1">
                      <span className="text-red-600 mr-1">*</span>건축물 용도
                    </div>
                    <div>
                      <span className="text-red-600 mr-1">*</span>1일 오수발생량
                    </div>
                    <div>비고</div>
                    <div className="text-center w-[72px]"> </div>
                  </div>

                  <div className="space-y-2">
                    {currentRows.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded">
                        「추가」버튼으로 행을 추가하세요.
                      </p>
                    ) : (
                      currentRows.map((row) => {
                        const err = rowFieldErrors[row.rowId] ?? {};
                        return (
                          <div
                            key={row.rowId}
                            className="grid gap-2 items-start"
                            style={{
                              gridTemplateColumns:
                                "minmax(140px,1.2fr) minmax(120px,0.9fr) minmax(180px,2fr) auto",
                            }}
                          >
                            <FormInput
                              type="text"
                              name={`buildingUse-${row.rowId}`}
                              value={row.buildingUse}
                              onChange={(e) =>
                                handleRowChange(
                                  selectedLeafId,
                                  row.rowId,
                                  "buildingUse",
                                  e.target.value,
                                )
                              }
                              error={err.buildingUse}
                              maxLength={200}
                              placeholder="건축물 용도"
                            />
                            <FormInput
                              type="text"
                              inputMode="decimal"
                              name={`dailySewage-${row.rowId}`}
                              value={row.dailySewage}
                              onChange={(e) =>
                                handleRowChange(
                                  selectedLeafId,
                                  row.rowId,
                                  "dailySewage",
                                  e.target.value,
                                )
                              }
                              error={err.dailySewage}
                              maxLength={20}
                              placeholder="예: 12.5"
                            />
                            <FormInput
                              type="text"
                              name={`remarks-${row.rowId}`}
                              value={row.remarks}
                              onChange={(e) =>
                                handleRowChange(
                                  selectedLeafId,
                                  row.rowId,
                                  "remarks",
                                  e.target.value,
                                )
                              }
                              error={err.remarks}
                              maxLength={500}
                              placeholder="비고"
                            />
                            <div className="flex items-start justify-center pt-1">
                              <button
                                type="button"
                                className="px-4 py-1 text-sm border border-gray-400 rounded-full text-gray-700 hover:bg-gray-100"
                                onClick={() =>
                                  handleDeleteRow(selectedLeafId, row.rowId)
                                }
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end px-3 py-3 border-t border-gray-200 bg-white">
              <button
                type="button"
                className="px-4 py-2 border border-gray-400 bg-white text-gray-800 rounded hover:bg-gray-50"
                style={{ minWidth: "100px" }}
                onClick={handleSave}
              >
                저장
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showResultDialog}
        title={resultDialogTitle}
        message={resultDialogMessage}
        type={resultDialogType}
        confirmText="확인"
        cancelText="닫기"
        onConfirm={closeResultDialog}
        onCancel={closeResultDialog}
      />
    </>
  );
};
