"use client";

import React from "react";
import { AdminGpkiYnCertShell } from "./AdminGpkiYnCertShell";
import { MypageYnCertButton } from "@/widgets/userWeb/MypageInfoControls";

export type AdminYnGpkiFieldName =
  | "citizenCertYn"
  | "singleParentYn"
  | "basicLivelihoodYn"
  | "nearPovertyYn";

type Props = {
  name: AdminYnGpkiFieldName;
  ynValue: string;
  gpkiCertAt: string | null;
  ariaGroupLabel: string;
  onYnChange: (field: AdminYnGpkiFieldName, value: "Y" | "N") => void;
  onGpkiClick: () => void;
  gpkiDisabled: boolean;
};

/**
 * 관리자 회원 폼: 예 · 아니요 · 인증 순서.
 * 인증(GPKI) 결과는 citizenCertYn 등 Y/N으로 반영되어 예/아니요 선택이 갱신됨.
 */
export function AdminYesNoGpkiField({
  name,
  ynValue,
  gpkiCertAt,
  ariaGroupLabel,
  onYnChange,
  onGpkiClick,
  gpkiDisabled,
}: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div
        className="flex items-center gap-0"
        role="group"
        aria-label={`${ariaGroupLabel} 예 또는 아니요`}
      >
        <button
          type="button"
          onClick={() => onYnChange(name, "Y")}
          className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-l border border-gray-300 transition-colors ${
            ynValue === "Y"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          style={{ minWidth: "80px" }}
        >
          예
        </button>
        <button
          type="button"
          onClick={() => onYnChange(name, "N")}
          className={`flex-1 px-4 py-2 text-[13px] font-medium rounded-r border-t border-r border-b border-gray-300 transition-colors ${
            ynValue === "N"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          style={{ minWidth: "80px" }}
        >
          아니요
        </button>
      </div>
      <AdminGpkiYnCertShell>
        <MypageYnCertButton
          pressed={ynValue === "Y"}
          certifiedAt={gpkiCertAt}
          name={ariaGroupLabel}
          alwaysShowButton
          hideStatusText
          disabled={gpkiDisabled}
          onClick={onGpkiClick}
        />
      </AdminGpkiYnCertShell>
    </div>
  );
}
