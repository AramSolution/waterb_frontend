/**
 * 원인자부담 「오수량 발생량 산정」「납부내역」 등: 구분(category)에 따른 유형(type) 셀렉트 옵션.
 * value는 백엔드 확정 시 이 파일만 맞추면 됨.
 */
export const SEWAGE_CATEGORY = {
  INDIVIDUAL: "INDIVIDUAL",
  OTHER_ACT: "OTHER_ACT",
  PERMIT_CHANGE: "PERMIT_CHANGE",
} as const;

export const SEWAGE_TYPE_VALUE = {
  INDIVIDUAL_NEW: "INDIVIDUAL_NEW",
  INDIVIDUAL_EXTENSION: "INDIVIDUAL_EXTENSION",
  INDIVIDUAL_CHANGE: "INDIVIDUAL_CHANGE",
  /** 타행위 — 신축 (개별건축물 신축과 구분되는 value) */
  OTHER_ACT_NEW: "OTHER_ACT_NEW",
  /** 타행위·허가사항변경 — 개축 */
  REBUILD: "REBUILD",
} as const;

export type SewageTypeOption = { value: string; label: string };

export function getSewageTypeOptionsForCategory(
  category: string,
): SewageTypeOption[] {
  if (category === SEWAGE_CATEGORY.INDIVIDUAL) {
    return [
      { value: SEWAGE_TYPE_VALUE.INDIVIDUAL_NEW, label: "신축" },
      { value: SEWAGE_TYPE_VALUE.INDIVIDUAL_EXTENSION, label: "증축" },
      { value: SEWAGE_TYPE_VALUE.INDIVIDUAL_CHANGE, label: "변경" },
    ];
  }
  if (category === SEWAGE_CATEGORY.OTHER_ACT) {
    return [
      { value: SEWAGE_TYPE_VALUE.OTHER_ACT_NEW, label: "신축" },
      { value: SEWAGE_TYPE_VALUE.REBUILD, label: "개축" },
    ];
  }
  if (category === SEWAGE_CATEGORY.PERMIT_CHANGE) {
    return [{ value: SEWAGE_TYPE_VALUE.REBUILD, label: "개축" }];
  }
  return [];
}
