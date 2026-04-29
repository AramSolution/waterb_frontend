"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import { FormInput } from "@/shared/ui/adminWeb/form";
import { usePurposeManage } from "../model/usePurposeManage";

export const PurposeManagePageView: React.FC = () => {
  const {
    categoryTree,
    treeLoading,
    expandedMajorIds,
    toggleMajor,
    selection,
    handleSelectLeaf,
    listRows,
    listLoading,
    saveLoading,
    rowFieldErrors,
    handleAddRow,
    requestDeleteRow,
    showDeleteConfirmDialog,
    deleteLoading,
    confirmDeleteRow,
    cancelDeleteRow,
    handleRowChange,
    handleSave,
    showResultDialog,
    resultDialogTitle,
    resultDialogMessage,
    resultDialogType,
    closeResultDialog,
  } = usePurposeManage();

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
            disabled={!selection || listLoading || treeLoading}
          >
            추가
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 min-h-[420px]">
          {/* 분류 트리 */}
          <aside className="w-full lg:w-64 shrink-0 border border-gray-200 rounded overflow-hidden bg-gray-50">
            <div
              className="px-3 py-2 text-base font-medium text-gray-700 border-b border-gray-200 bg-gray-200"
              style={{ letterSpacing: "-0.02em" }}
            >
              분류
            </div>
            <div className="p-2 max-h-[480px] overflow-y-auto">
              {treeLoading ? (
                <p className="text-base text-gray-500 py-4 px-2">불러오는 중…</p>
              ) : categoryTree.length === 0 ? (
                <p className="text-base text-gray-500 py-4 px-2">
                  등록된 건축용도 분류가 없습니다.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {categoryTree.map((major) => {
                    const open = expandedMajorIds.has(major.id);
                    return (
                      <li key={major.id}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-1 text-left text-base py-1.5 px-1 rounded hover:bg-gray-200 text-gray-800"
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
                              const active = selection?.leafId === leaf.id;
                              return (
                                <li key={leaf.id}>
                                  <button
                                    type="button"
                                    className={`w-full text-left text-base py-1 px-2 rounded ${
                                      active
                                        ? "bg-blue-100 text-blue-900 font-medium"
                                        : "text-gray-700 hover:bg-gray-200"
                                    }`}
                                    onClick={() => handleSelectLeaf(leaf)}
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
              )}
            </div>
          </aside>

          {/* 용도 행 목록 */}
          <section className="flex-1 min-w-0 flex flex-col border border-gray-200 rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-base text-gray-600">
              {selection ? (
                <>
                  선택 분류:{" "}
                  <span className="font-medium text-gray-900">
                    {selection.displayLabel}
                  </span>
                </>
              ) : (
                "왼쪽에서 소분류를 선택한 뒤 행을 추가하세요."
              )}
            </div>

            <div className="flex-1 overflow-x-auto p-3 relative">
              {!selection ? (
                <p className="text-base text-gray-500 py-8 text-center">
                  소분류를 선택하면 이 영역에 건축물 용도·1일 오수발생량·비고를
                  입력할 수 있습니다.
                </p>
              ) : listLoading ? (
                <p className="text-base text-gray-500 py-8 text-center">
                  목록을 불러오는 중…
                </p>
              ) : (
                <div className="min-w-[620px]">
                  <div
                    className="grid gap-2 items-end text-base font-medium text-gray-700 mb-2"
                    style={{
                      gridTemplateColumns:
                        "minmax(160px,1.5fr) minmax(148px,0.62fr) minmax(200px,2.45fr) auto",
                    }}
                  >
                    <div className="pl-1">
                      <span className="text-red-600 mr-1">*</span>건축물 용도
                    </div>
                    <div className="min-w-0 whitespace-nowrap">
                      <span className="text-red-600 mr-1">*</span>1일 오수발생량
                    </div>
                    <div>비고</div>
                    <div className="text-center w-[72px]"> </div>
                  </div>

                  <div className="space-y-2">
                    {listRows.length === 0 ? (
                      <p className="text-base text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded">
                        등록된 건축물 용도가 없습니다. 「추가」로 행을
                        추가하세요.
                      </p>
                    ) : (
                      listRows.map((row) => {
                        const err = rowFieldErrors[row.rowId] ?? {};
                        return (
                          <div
                            key={row.rowId}
                            className="grid gap-2 items-start"
                            style={{
                              gridTemplateColumns:
                                "minmax(160px,1.5fr) minmax(148px,0.62fr) minmax(200px,2.45fr) auto",
                            }}
                          >
                            <FormInput
                              type="text"
                              name={`buildingUse-${row.rowId}`}
                              value={row.buildingUse}
                              onChange={(e) =>
                                handleRowChange(
                                  row.rowId,
                                  "buildingUse",
                                  e.target.value,
                                )
                              }
                              error={err.buildingUse}
                              maxLength={256}
                              placeholder="건축물 용도"
                              className="text-base"
                            />
                            <FormInput
                              type="text"
                              inputMode="decimal"
                              name={`dailySewage-${row.rowId}`}
                              value={row.dailySewage}
                              onChange={(e) =>
                                handleRowChange(
                                  row.rowId,
                                  "dailySewage",
                                  e.target.value,
                                )
                              }
                              error={err.dailySewage}
                              maxLength={20}
                              placeholder="예: 12.5"
                              className="text-base"
                            />
                            <FormInput
                              type="text"
                              name={`remarks-${row.rowId}`}
                              value={row.remarks}
                              onChange={(e) =>
                                handleRowChange(
                                  row.rowId,
                                  "remarks",
                                  e.target.value,
                                )
                              }
                              error={err.remarks}
                              maxLength={2048}
                              placeholder="비고"
                              className="text-base"
                            />
                            <div className="flex min-h-[48px] shrink-0 items-center justify-center md:min-h-0">
                              <button
                                type="button"
                                className="inline-flex min-h-10 min-w-[72px] items-center justify-center rounded-full border border-gray-400 bg-white px-4 py-1.5 text-base text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => requestDeleteRow(row.rowId)}
                                disabled={deleteLoading}
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
                className="px-4 py-2 border border-gray-400 bg-white text-gray-800 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minWidth: "100px" }}
                onClick={handleSave}
                disabled={!selection || listLoading || saveLoading}
              >
                {saveLoading ? "저장 중…" : "저장"}
              </button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirmDialog}
        title="건축물 용도 삭제"
        message="선택한 건축물 용도를 삭제하시겠습니까? 저장된 건은 서버에서 비활성(삭제) 처리되며 목록에서 제외됩니다."
        confirmText={deleteLoading ? "처리 중…" : "삭제"}
        cancelText="닫기"
        type="danger"
        disabled={deleteLoading}
        onConfirm={confirmDeleteRow}
        onCancel={cancelDeleteRow}
      />

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
