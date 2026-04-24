"use client";

import React, { useCallback, useState } from "react";
import { Modal } from "@/shared/ui/adminWeb";
import { FormInput } from "@/shared/ui/adminWeb/form";

export interface UsageLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 용도조회 모달 — **조회 전용** UI (`Modal` + 관리자 dialog 스타일).
 * - 저장·등록·삭제 등의 변경 액션은 두지 않습니다(닫기·검색 조회만).
 * - 우측 표·좌측 트리는 API·코드 확정 후 연동 예정(현재 더미).
 */
export function UsageLookupModal({ isOpen, onClose }: UsageLookupModalProps) {
  const [keyword, setKeyword] = useState("");
  const [englishOpen, setEnglishOpen] = useState(true);
  const [joseonOpen, setJoseonOpen] = useState(true);

  const handleClose = useCallback(() => {
    setKeyword("");
    onClose();
  }, [onClose]);

  const handleSearch = useCallback(() => {
    // TODO: 용도 **조회** API (응답으로 우측 표 행 채움)
    void keyword;
  }, [keyword]);

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
            <FormInput
              type="text"
              name="usageLookupKeyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="검색어를 입력하세요"
              className="!h-10 !min-h-[2.5rem] !py-0 text-[13px] leading-[2.5rem] box-border"
            />
          </div>
          <button
            type="button"
            className="inline-flex h-10 min-h-[2.5rem] shrink-0 items-center justify-center rounded bg-blue-600 px-5 text-[13px] text-white transition-colors hover:bg-blue-700 sm:shrink-0"
            style={{ minWidth: "72px" }}
            onClick={handleSearch}
          >
            검색
          </button>
        </div>

        <div className="flex min-h-[240px] flex-col gap-3 md:flex-row md:items-stretch">
          {/* 분류 (더미) */}
          <div className="flex w-full min-h-[220px] shrink-0 flex-col border border-gray-200 md:max-w-[280px] md:min-w-[220px]">
            <div className="shrink-0 border-b border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
              분류
            </div>
            <div className="selection-popup-vscroll min-h-0 flex-1 overflow-y-auto p-2 text-sm text-gray-800">
              <div className="mb-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-1 rounded border-0 bg-transparent px-1 py-1.5 text-left text-gray-800 hover:bg-gray-100"
                  onClick={() => setEnglishOpen((v) => !v)}
                >
                  <span className="inline-block w-4 shrink-0 text-center text-xs text-gray-600">
                    {englishOpen ? "▼" : "▶"}
                  </span>
                  <span className="font-medium">English Name</span>
                </button>
                {englishOpen && (
                  <ul className="mt-0.5 space-y-0.5 border-l border-gray-200 pl-4">
                    {["Jone", "Lin", "Smith", "Jane", "James"].map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          className="w-full rounded border-0 bg-transparent px-1 py-1 text-left text-gray-700 hover:bg-gray-50"
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
                  className="flex w-full items-center gap-1 rounded border-0 bg-transparent px-1 py-1.5 text-left text-gray-800 hover:bg-gray-100"
                  onClick={() => setJoseonOpen((v) => !v)}
                >
                  <span className="inline-block w-4 shrink-0 text-center text-xs text-gray-600">
                    {joseonOpen ? "▼" : "▶"}
                  </span>
                  <span className="font-medium">조선시대</span>
                </button>
                {joseonOpen && (
                  <ul className="mt-0.5 space-y-0.5 border-l border-gray-200 pl-4">
                    {["세종대왕", "이순신", "정약용", "허준"].map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          className="w-full rounded border-0 bg-transparent px-1 py-1 text-left text-gray-700 hover:bg-gray-50"
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

          <div className="flex min-h-[220px] min-w-0 flex-1 flex-col border border-gray-200">
            <div className="max-h-[min(50vh,380px)] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-[1] border border-gray-200 bg-gray-100 px-2 py-2 text-left text-[13px] font-semibold text-gray-800">
                      건축물 용도
                    </th>
                    <th className="sticky top-0 z-[1] border border-gray-200 bg-gray-100 px-2 py-2 text-left text-[13px] font-semibold text-gray-800">
                      비고
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, i) => (
                    <tr key={i} className="bg-white hover:bg-gray-50/80">
                      <td className="border border-gray-200 px-2 py-2 text-gray-800">
                        &nbsp;
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-gray-800">
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
