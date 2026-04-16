import type { SelectOption } from "@/shared/ui/adminWeb/form";

/**
 * 관리자 지원사업(ARTPROM) 공통 RUN_STA — 샘플업무·스터디·기타 지원사업 동일.
 * 01 모집예정, 02 모집중, 04 모집마감, 99 취소 (레거시 DB값 03/05/11/12는 표시용)
 */

export const LEGACY_RUN_STA_LABEL: Record<string, string> = {
  "03": "검토중",
  "05": "완료",
  "11": "반려",
  "12": "중단",
};

export const RUN_STA_BASE_OPTIONS: SelectOption[] = [
  { value: "01", label: "모집예정" },
  { value: "02", label: "모집중" },
  { value: "04", label: "모집마감" },
  { value: "99", label: "취소" },
];

export function getRunStaLabel(status: string): string {
  switch (status) {
    case "01":
      return "모집예정";
    case "02":
      return "모집중";
    case "04":
      return "모집마감";
    case "99":
      return "취소";
    case "03":
      return "검토중";
    case "05":
      return "완료";
    case "11":
      return "반려";
    case "12":
      return "중단";
    default:
      return status || "";
  }
}

export function getRunStaBadgeClass(status: string): string {
  switch (status) {
    case "01":
      return "bg-blue-100 text-blue-800";
    case "02":
      return "bg-yellow-100 text-yellow-800";
    case "04":
      return "bg-gray-100 text-gray-800";
    case "99":
      return "bg-red-100 text-red-800";
    case "03":
      return "bg-purple-100 text-purple-800";
    case "05":
      return "bg-green-100 text-green-800";
    case "11":
      return "bg-orange-100 text-orange-800";
    case "12":
      return "bg-slate-200 text-slate-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/** 목록 검색 select — 4개 코드만 */
export const RUN_STA_SEARCH_OPTIONS: { value: string; label: string }[] = [
  { value: "01", label: "모집예정" },
  { value: "02", label: "모집중" },
  { value: "04", label: "모집마감" },
  { value: "99", label: "취소" },
];

export function buildRunStaSelectOptions(
  currentCode: string | undefined,
): SelectOption[] {
  const code = currentCode || "";
  if (
    code &&
    LEGACY_RUN_STA_LABEL[code] &&
    !RUN_STA_BASE_OPTIONS.some((o) => o.value === code)
  ) {
    return [
      ...RUN_STA_BASE_OPTIONS,
      { value: code, label: `${LEGACY_RUN_STA_LABEL[code]} (기존값)` },
    ];
  }
  return RUN_STA_BASE_OPTIONS;
}
