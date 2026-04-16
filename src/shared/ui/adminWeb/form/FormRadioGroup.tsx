"use client";

import React from "react";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormRadioGroupProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: RadioOption[];
  error?: string;
  /** 표시 형태: 기본 라디오 / 세그먼트 토글 버튼 */
  variant?: "default" | "segmented";
}

export const FormRadioGroup: React.FC<FormRadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  error,
  variant = "default",
}) => {
  // 기본 라디오 형태
  if (variant === "default") {
    return (
      <div className="w-full">
        <div className="flex flex-wrap items-center gap-4">
          {options.map((option) => (
            <div key={option.value} className="inline-flex items-center mb-0">
              <input
                className={`w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 ${
                  option.disabled
                    ? "disabled:opacity-50 disabled:cursor-not-allowed"
                    : ""
                }`}
                type="radio"
                name={name}
                id={`${name}-${option.value}`}
                value={option.value}
                checked={value === option.value}
                onChange={onChange}
                disabled={option.disabled}
              />
              <label
                className={`ml-2 text-[13px] ${
                  option.disabled ? "opacity-50" : ""
                }`}
                htmlFor={`${name}-${option.value}`}
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        {error && (
          <div className="text-red-600 text-sm mt-1 px-2">{error}</div>
        )}
      </div>
    );
  }

  // 세그먼트(토글 버튼) 형태
  return (
    <div className="w-full">
      <div className="inline-flex rounded-full bg-gray-100 p-1">
        {options.map((option) => {
          const isChecked = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={`${name}-${option.value}`}
              className={`relative cursor-pointer select-none px-4 py-1 text-[13px] rounded-full border transition-colors duration-150
                ${
                  isChecked
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }
                ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input
                type="radio"
                name={name}
                id={`${name}-${option.value}`}
                value={option.value}
                checked={isChecked}
                onChange={onChange}
                disabled={option.disabled}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && (
        <div className="text-red-600 text-sm mt-1 px-2">{error}</div>
      )}
    </div>
  );
};
