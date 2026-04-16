"use client";

import React from "react";
import DatePicker from "react-datepicker";
import { format, parse, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

interface FormDatePickerProps {
  name: string;
  value: string; // YYYY-MM-DD format
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const FormDatePicker: React.FC<FormDatePickerProps> = ({
  name,
  value,
  onChange,
  error,
  placeholder = "날짜를 선택하세요",
  disabled = false,
  className = "",
  minDate,
  maxDate,
}) => {
  const hasError = !!error;

  // Supported date formats for parsing
  const dateFormats = [
    "yyyy-MM-dd",   // 2026-01-27
    "yyyy/MM/dd",   // 2026/01/27
    "yyyy.MM.dd",   // 2026.01.27
    "yyyyMMdd",     // 20260127 (no separator)
    "yy-MM-dd",     // 26-01-27
    "yy/MM/dd",     // 26/01/27
    "yy.MM.dd",     // 26.01.27
    "yyMMdd",       // 260127 (no separator)
  ];

  // Convert string to Date object with error handling (try multiple formats)
  const selectedDate = React.useMemo(() => {
    if (!value) return null;
    
    // Try to parse the value in various formats
    for (const dateFormat of dateFormats) {
      try {
        const parsed = parse(value, dateFormat, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }
    
    return null;
  }, [value]);

  // Handle date change (from calendar selection)
  const handleDateChange = (date: Date | null) => {
    const formattedDate = date && isValid(date) ? format(date, "yyyy-MM-dd") : "";
    
    // Create synthetic event
    const syntheticEvent = {
      target: {
        name,
        value: formattedDate,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
  };

  // Handle raw input (direct typing)
  const handleChangeRaw = (e: React.ChangeEvent<HTMLInputElement> | any) => {
    const inputValue = e?.target?.value || "";
    
    // Allow direct input - just pass the value through
    // Format validation will be handled on blur or submit
    const syntheticEvent = {
      target: {
        name,
        value: inputValue,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
  };

  // Handle blur - validate and format the date
  const handleBlur = (e: React.FocusEvent<HTMLInputElement> | any) => {
    const inputValue = (e?.target?.value || "").trim();
    
    if (!inputValue) {
      // Empty value is allowed
      onChange({
        target: { name, value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
      return;
    }

    // Try to parse the input value in various formats
    let parsedDate: Date | null = null;
    for (const dateFormat of dateFormats) {
      try {
        const parsed = parse(inputValue, dateFormat, new Date());
        if (isValid(parsed)) {
          parsedDate = parsed;
          break;
        }
      } catch {
        continue;
      }
    }

    // If valid date found, format it; otherwise keep original input
    if (parsedDate) {
      const formattedDate = format(parsedDate, "yyyy-MM-dd");
      onChange({
        target: { name, value: formattedDate },
      } as React.ChangeEvent<HTMLInputElement>);
    }
    // If not valid, keep the input as is (validation error will show)
  };

  return (
    <div className={className || "w-full"}>
      <style jsx global>{`
        .react-datepicker__input-container input {
          text-align: center !important;
          padding-left: 0.75rem !important; /* px-3 */
          padding-right: 2.5rem !important; /* pr-10 for icon */
          padding-top: 0.5rem !important; /* py-2 */
          padding-bottom: 0.5rem !important; /* py-2 */
        }
      `}</style>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        onChangeRaw={handleChangeRaw}
        onBlur={handleBlur}
        dateFormat="yyyy-MM-dd"
        locale={ko}
        placeholderText={placeholder}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        allowSameDay={true}
        isClearable={false}
        strictParsing={false}
        showIcon
        icon={
          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
        }
        className={`w-full border rounded-none px-3 py-2 pr-10 ${
          hasError ? "border-red-500" : "border-gray-300"
        }`}
        wrapperClassName="w-full relative"
      />
      {error && (
        <div className="text-red-600 text-sm mt-1 px-2">{error}</div>
      )}
    </div>
  );
};
