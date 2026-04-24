"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FormInput } from "@/shared/ui/adminWeb/form";

export interface UsageLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 용도조회 모달 — **조회 전용** UI입니다.
 * - 저장·등록·삭제 등의 변경 액션은 두지 않습니다(닫기·검색 조회만).
 * - 우측 **건축물 용도 / 비고** 표는 API 준비 후 응답 목록을 그대로 렌더링할 예정(현재는 자리용 더미 행).
 * - 좌측 분류 트리도 기획용 더미이며, API·코드체계 확정 시 연동합니다.
 */
export function UsageLookupModal({ isOpen, onClose }: UsageLookupModalProps) {
  const [keyword, setKeyword] = useState("");
  const [englishOpen, setEnglishOpen] = useState(true);
  const [joseonOpen, setJoseonOpen] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  const stopPanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleSearch = useCallback(() => {
    // TODO: 용도 **조회** API (응답으로 우측 표 행 채움, 모달은 여전히 조회만)
    void keyword;
  }, [keyword]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-[10000] flex w-full max-w-5xl max-h-[92vh] flex-col overflow-hidden rounded border border-gray-300 bg-white shadow-xl"
        onClick={stopPanelClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-lookup-title"
      >
        <div className="shrink-0 border-b border-sky-200 bg-sky-100 px-4 py-2.5">
          <h2
            id="usage-lookup-title"
            className="m-0 text-base font-semibold text-gray-900"
          >
            용도조회
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <div className="w-full min-w-0 max-w-md flex-1 sm:flex-initial sm:w-64">
              <FormInput
                type="text"
                name="usageLookupKeyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색어를 입력하세요"
              />
            </div>
            <button
              type="button"
              className="shrink-0 rounded border border-gray-400 bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
              style={{ minWidth: "72px" }}
              onClick={handleSearch}
            >
              검색
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:items-stretch">
            {/* 분류 트리 (더미) */}
            <div className="flex min-h-[220px] w-full shrink-0 flex-col border border-neutral-800 md:max-w-[280px] md:min-w-[220px]">
              <div className="border-b border-neutral-800 bg-gray-100 px-2 py-2 text-sm font-semibold text-gray-900">
                분류
              </div>
              <div className="selection-popup-vscroll min-h-0 flex-1 overflow-y-auto p-2 text-sm text-gray-800">
                <div className="mb-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-gray-100"
                    onClick={() => setEnglishOpen((v) => !v)}
                  >
                    <span className="inline-block w-4 shrink-0 text-center text-xs">
                      {englishOpen ? "▼" : "▶"}
                    </span>
                    <span className="font-medium">English Name</span>
                  </button>
                  {englishOpen && (
                    <ul className="mt-0.5 space-y-0.5 border-l border-gray-200 pl-5">
                      {["Jone", "Lin", "Smith", "Jane", "James"].map((name) => (
                        <li key={name}>
                          <button
                            type="button"
                            className="w-full rounded px-1 py-0.5 text-left hover:bg-sky-50"
                          >
                            {name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-gray-100"
                    onClick={() => setJoseonOpen((v) => !v)}
                  >
                    <span className="inline-block w-4 shrink-0 text-center text-xs">
                      {joseonOpen ? "▼" : "▶"}
                    </span>
                    <span className="font-medium">조선시대</span>
                  </button>
                  {joseonOpen && (
                    <ul className="mt-0.5 space-y-0.5 border-l border-gray-200 pl-5">
                      {[
                        "세종대왕",
                        "이순신",
                        "정약용",
                        "허준",
                      ].map((name) => (
                        <li key={name}>
                          <button
                            type="button"
                            className="w-full rounded px-1 py-0.5 text-left hover:bg-sky-50"
                          >
                            {name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* 건축물 용도 표: API 연동 시 목록 데이터로 치환 (조회 표시만) */}
            <div className="flex min-h-[220px] min-w-0 flex-1 flex-col border border-neutral-800">
              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-neutral-800 bg-gray-100 px-2 py-2 text-left font-semibold text-gray-900">
                        건축물 용도
                      </th>
                      <th className="border border-neutral-800 bg-gray-100 px-2 py-2 text-left font-semibold text-gray-900">
                        비고
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }, (_, i) => (
                      <tr key={i}>
                        <td className="border border-neutral-800 px-2 py-2">
                          &nbsp;
                        </td>
                        <td className="border border-neutral-800 px-2 py-2">
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end border-t border-gray-200 pt-3">
            <button
              type="button"
              className="rounded bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600"
              style={{ minWidth: "100px" }}
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
