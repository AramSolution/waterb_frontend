"use client";

import React from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  name,
  value,
  onChange,
  error,
  placeholder,
  maxLength,
  readOnly = false,
  type = "text",
  className = "",
  style,
  ...rest
}) => {
  const hasError = !!error;
  const isNumberType = type === "number";

  return (
    <div className="w-full">
      <input
        type={type}
        name={name}
        className={`w-full border rounded-none px-3 py-2 ${
          hasError ? "border-red-500" : ""
        } ${readOnly ? "bg-gray-50" : ""} ${
          isNumberType ? "appearance-none" : ""
        } ${className}`}
        placeholder={placeholder}
        style={{
          border: hasError ? "1px solid #dc3545" : "1px solid #e0e0e0",
          // number input의 spinner 화살표 숨기기
          ...(isNumberType && {
            MozAppearance: "textfield", // Firefox
            WebkitAppearance: "none", // Chrome, Safari
          }),
          ...style,
        }}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        readOnly={readOnly}
        {...rest}
      />
      {error && <div className="text-red-600 text-sm mt-1 px-2">{error}</div>}
    </div>
  );
};
