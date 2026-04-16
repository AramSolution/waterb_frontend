"use client";

import React from "react";

interface FormTextareaProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "className" | "style"
  > {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  minHeight?: string;
  showCharCount?: boolean; // 글자 수 표시 여부
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  name,
  value,
  onChange,
  error,
  placeholder,
  maxLength,
  readOnly = false,
  minHeight = "100px",
  showCharCount = false,
  ...rest
}) => {
  const hasError = !!error;
  const currentLength = value?.length || 0;
  const isNearLimit = maxLength && currentLength >= maxLength * 0.9; // 90% 이상일 때 경고 색상

  return (
    <div className="w-full">
      <textarea
        name={name}
        className={`w-full border rounded-none px-3 py-2 ${
          hasError ? "border-red-500" : ""
        } ${readOnly ? "bg-gray-50" : ""}`}
        placeholder={placeholder}
        style={{
          border: hasError ? "1px solid #dc3545" : "1px solid #e0e0e0",
          minHeight,
        }}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        readOnly={readOnly}
        {...rest}
      />
      {showCharCount && maxLength && (
        <div
          className={`text-right text-xs mt-1 px-2 ${
            currentLength >= maxLength
              ? "text-red-600 font-semibold"
              : isNearLimit
              ? "text-orange-600"
              : "text-gray-500"
          }`}
        >
          {currentLength} / {maxLength}자
        </div>
      )}
      {error && (
        <div className="text-red-600 text-sm mt-1 px-2">{error}</div>
      )}
    </div>
  );
};
