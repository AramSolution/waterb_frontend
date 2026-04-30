"use client";

import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "className"
  > {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  /** `<select>` 요소에 추가 클래스 (예: 원인자부담 상태 색상) */
  selectClassName?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  name,
  value,
  onChange,
  options,
  error,
  placeholder,
  loading = false,
  loadingText = "로딩 중...",
  emptyText = "선택하세요",
  selectClassName = "",
  disabled,
  style,
  ...rest
}) => {
  const hasError = !!error;

  return (
    <div className="w-full">
      <select
        name={name}
        className={`w-full border rounded-none px-3 py-2 pr-8 ${
          hasError ? "border-red-500" : ""
        } ${disabled || loading ? "bg-gray-100" : ""} ${selectClassName}`.trim()}
        style={{
          border: hasError
            ? "1px solid #dc3545"
            : selectClassName
              ? undefined
              : "1px solid #e0e0e0",
          ...style,
        }}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? (
          <option value="">{loadingText}</option>
        ) : options.length === 0 ? (
          <option value="">{emptyText}</option>
        ) : (
          <>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </>
        )}
      </select>
      {error && (
        <div className="text-red-600 text-sm mt-1 px-2">{error}</div>
      )}
    </div>
  );
};
