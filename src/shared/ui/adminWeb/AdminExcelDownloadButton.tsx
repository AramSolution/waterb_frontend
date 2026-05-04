"use client";

import React from "react";

/** Admin list Excel export: bg #FFFFFF, border #D1D5DB (Tailwind gray-300). */
const ADMIN_EXCEL_DOWNLOAD_BUTTON_CLASS =
  "px-3 py-1 text-[13px] bg-white text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export interface AdminExcelDownloadButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  loading?: boolean;
  loadingLabel?: string;
  idleLabel?: string;
}

export const AdminExcelDownloadButton = React.forwardRef<
  HTMLButtonElement,
  AdminExcelDownloadButtonProps
>(
  (
    {
      loading = false,
      loadingLabel = "⏳ 다운로드 중...",
      idleLabel = "📊 엑셀",
      className = "",
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const merged = [ADMIN_EXCEL_DOWNLOAD_BUTTON_CLASS, className]
      .filter(Boolean)
      .join(" ");
    return (
      <button
        ref={ref}
        type={type}
        className={merged}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? loadingLabel : idleLabel}
      </button>
    );
  },
);

AdminExcelDownloadButton.displayName = "AdminExcelDownloadButton";
