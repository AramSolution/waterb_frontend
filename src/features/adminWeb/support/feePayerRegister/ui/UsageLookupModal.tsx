"use client";

import React, { useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Modal } from "@/shared/ui/adminWeb";
import { FormInput } from "@/shared/ui/adminWeb/form";
import {
  useUsageLookupModal,
  type UsageLookupDisplayRow,
} from "../model/useUsageLookupModal";

export interface UsageLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 행 선택 시 호출 후 모달은 부모에서 닫음 */
  onPickRow?: (row: UsageLookupDisplayRow) => void;
}

/**
 * 용도조회 모달 — 조회 전용.
 * - 분류: `GET /api/cont/code/building-use-codes`
 * - 목록: `GET /api/admin/armbuild?gubun1=&gubun2=`
 */
export function UsageLookupModal({
  isOpen,
  onClose,
  onPickRow,
}: UsageLookupModalProps) {
  const {
    categoryTree,
    treeLoading,
    treeError,
    expandedMajorIds,
    toggleMajor,
    selection,
    selectLeaf,
    listRows,
    listLoading,
    listError,
    keyword,
    setKeyword,
    runSearch,
    displayedRows,
  } = useUsageLookupModal(isOpen);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      title="용도조회"
      onClose={handleClose}
      size="xl"
      showCloseButton
    >
      <div className="space-y-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="w-full">
              <FormInput
                type="text"
                name="usageLookupKeyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="건축물 용도 검색"
                className="!h-10 !min-h-[2.5rem] !py-0 text-[13px] leading-[2.5rem] box-border"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-10 min-h-[2.5rem] shrink-0 items-center justify-center rounded bg-blue-600 px-5 text-[13px] text-white transition-colors hover:bg-blue-700 sm:shrink-0"
            style={{ minWidth: "72px" }}
            onClick={runSearch}
          >
            검색
          </button>
        </div>

        {(treeError || listError) && (
          <p className="text-sm text-red-600 px-0.5">
            {treeError || listError}
          </p>
        )}

        <div className="flex min-h-[240px] flex-col gap-3 md:flex-row md:items-stretch">
          <div className="flex w-full min-h-[220px] shrink-0 flex-col border border-gray-200 md:max-w-[200px] md:min-w-[150px] md:shrink-0">
            <div className="shrink-0 border-b border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
              분류
            </div>
            <div className="selection-popup-vscroll min-h-0 flex-1 overflow-y-auto p-2 text-sm text-gray-800">
              {treeLoading ? (
                <p className="px-1 py-2 text-gray-500">불러오는 중…</p>
              ) : categoryTree.length === 0 ? (
                <p className="px-1 py-2 text-gray-500">
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
                          className="flex w-full items-center gap-1 rounded border-0 bg-transparent px-1 py-1.5 text-left text-gray-800 hover:bg-gray-100"
                          onClick={() => toggleMajor(major.id)}
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
                          )}
                          <span className="font-medium">{major.label}</span>
                        </button>
                        {open && major.children?.length ? (
                          <ul className="mt-0.5 space-y-0.5 border-l border-gray-200 pl-4">
                            {major.children.map((leaf) => {
                              const active = selection?.leafId === leaf.id;
                              return (
                                <li key={leaf.id}>
                                  <button
                                    type="button"
                                    className={`w-full rounded border-0 px-1 py-1 text-left ${
                                      active
                                        ? "bg-blue-100 font-medium text-blue-900"
                                        : "bg-transparent text-gray-700 hover:bg-gray-50"
                                    }`}
                                    onClick={() => selectLeaf(leaf)}
                                  >
                                    {leaf.label}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex min-h-[220px] min-w-0 flex-1 flex-col border border-gray-200">
            <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              {selection ? (
                <>
                  선택 분류:{" "}
                  <span className="font-medium text-gray-900">
                    {selection.displayLabel}
                  </span>
                </>
              ) : (
                "왼쪽에서 소분류를 선택하세요."
              )}
            </div>
            <div className="max-h-[min(50vh,380px)] overflow-auto">
              {!selection ? (
                <p className="p-4 text-sm text-gray-500">
                  소분류를 선택하면 건축물 용도 목록이 표시됩니다.
                </p>
              ) : listLoading ? (
                <p className="p-4 text-sm text-gray-500">목록을 불러오는 중…</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-[1] border border-gray-200 bg-gray-100 px-2 py-2 text-left text-[13px] font-semibold text-gray-800">
                        건축물 용도
                      </th>
                      <th className="sticky top-0 z-[1] border border-gray-200 bg-gray-100 px-2 py-2 text-left text-[13px] font-semibold text-gray-800">
                        1일 오수발생량
                      </th>
                      <th className="sticky top-0 z-[1] border border-gray-200 bg-gray-100 px-2 py-2 text-left text-[13px] font-semibold text-gray-800">
                        비고
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="border border-gray-200 px-2 py-6 text-center text-gray-500"
                        >
                          {listRows.length === 0
                            ? "등록된 건축물 용도가 없습니다."
                            : "검색 결과가 없습니다."}
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => (
                        <tr
                          key={row.rowId}
                          role={onPickRow ? "button" : undefined}
                          tabIndex={onPickRow ? 0 : undefined}
                          className={`bg-white ${
                            onPickRow
                              ? "cursor-pointer hover:bg-blue-50/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                              : "hover:bg-gray-50/80"
                          }`}
                          onClick={() => {
                            if (!onPickRow) return;
                            onPickRow(row);
                            handleClose();
                          }}
                          onKeyDown={(e) => {
                            if (!onPickRow) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onPickRow(row);
                              handleClose();
                            }
                          }}
                        >
                          <td className="border border-gray-200 px-2 py-2 text-gray-800">
                            {row.buildingUse || "—"}
                          </td>
                          <td className="border border-gray-200 px-2 py-2 text-gray-800">
                            {row.dailySewage || "—"}
                          </td>
                          <td className="border border-gray-200 px-2 py-2 text-gray-800">
                            {row.remarks || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
