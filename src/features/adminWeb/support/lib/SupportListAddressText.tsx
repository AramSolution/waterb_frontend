import React from "react";

const LOT_LINE_PREFIX = "(지번)";

/** 목록 주소: 도로명 줄 + `(지번)` 줄. 지번 줄만 `#5D5D5D`. */
export const SupportListAddressText: React.FC<{ text: string }> = ({
  text,
}) => {
  const raw = text.trim();
  if (!raw || raw === "-") {
    return <>-</>;
  }
  const lines = raw.split("\n").filter((line) => line.trim() !== "");
  return (
    <span className="block min-w-0 break-words leading-snug" title={raw}>
      {lines.map((line, index) => {
        const isLot = line.startsWith(LOT_LINE_PREFIX);
        return (
          <span
            key={`${index}-${line}`}
            className={isLot ? "block text-[#5D5D5D]" : "block"}
          >
            {line}
          </span>
        );
      })}
    </span>
  );
};
