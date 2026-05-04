"use client";

import React from "react";

interface ModalFormFieldProps {
  label: string;
  required?: boolean;
  isFirstRow?: boolean;
  children: React.ReactNode;
  error?: string;
}

export const ModalFormField: React.FC<ModalFormFieldProps> = ({
  label,
  required = false,
  isFirstRow = false,
  children,
  error,
}) => {
  // 모달에서는 항상 전체 너비 사용
  // 첫 번째 필드: borderTop 없음 (상단 중복 선 방지)
  // 두 번째 필드 이후: borderTop 없음 (모달에서는 필드 사이 구분선 불필요)
  // 하지만 border 자체는 유지 (좌우 하단 테두리)
  
  // 첫 번째 필드인 경우 borderTop을 명시적으로 none으로 설정
  const labelStyle: React.CSSProperties = isFirstRow
    ? {
        border: "1px solid #dee2e6",
        borderTop: "none",
        padding: "5px",
      }
    : {
        border: "1px solid #dee2e6",
        borderTop: "none",
        padding: "5px",
      };

  const fieldStyle: React.CSSProperties = isFirstRow
    ? {
        border: "1px solid #dee2e6",
        borderLeft: "none",
        borderTop: "none",
        padding: "5px",
      }
    : {
        border: "1px solid #dee2e6",
        borderLeft: "none",
        borderTop: "none",
        padding: "5px",
      };

  return (
    <div className="w-full register-form-mobile-row">
      <div
        className="register-form-mobile-wrapper md:flex md:items-stretch"
        style={{ minHeight: "45px" }}
      >
        <label
          className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
          style={labelStyle}
        >
          {required && <span className="text-red-600 mr-1">*</span>}
          {label}
        </label>
        <div
          className="register-form-mobile-field w-full md:w-3/4 flex items-center"
          style={fieldStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
