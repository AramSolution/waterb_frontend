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

/** ARTITED.TYPE_1 — 01 개별건축물, 02 타행위, 03 허가사항변경 */
export function mapCategoryToType1(category: string): string | undefined {
  if (category === SEWAGE_CATEGORY.INDIVIDUAL) return "01";
  if (category === SEWAGE_CATEGORY.OTHER_ACT) return "02";
  if (category === SEWAGE_CATEGORY.PERMIT_CHANGE) return "03";
  return undefined;
}

/**
 * ARTITED.TYPE_2 — 01 신축, 02 증축, 03 변경, 04 개축
 * (개별 신축 vs 타행위 신축은 구분값으로 이미 갈리므로 동일 01 사용)
 */
export function mapSewageTypeValueToType2(
  typeValue: string,
): string | undefined {
  switch (typeValue) {
    case SEWAGE_TYPE_VALUE.INDIVIDUAL_NEW:
    case SEWAGE_TYPE_VALUE.OTHER_ACT_NEW:
      return "01";
    case SEWAGE_TYPE_VALUE.INDIVIDUAL_EXTENSION:
      return "02";
    case SEWAGE_TYPE_VALUE.INDIVIDUAL_CHANGE:
      return "03";
    case SEWAGE_TYPE_VALUE.REBUILD:
      return "04";
    default:
      return undefined;
  }
}

/** ARTITED.TYPE_1 → 화면 `구분` value */
export function mapType1ToCategory(type1: string | null | undefined): string {
  const t = String(type1 ?? "").trim();
  if (t === "01") return SEWAGE_CATEGORY.INDIVIDUAL;
  if (t === "02") return SEWAGE_CATEGORY.OTHER_ACT;
  if (t === "03") return SEWAGE_CATEGORY.PERMIT_CHANGE;
  return "";
}

/**
 * ARTITED.TYPE_2 + TYPE_1 → 화면 `유형` value
 * (TYPE_2=01 은 TYPE_1에 따라 개별 신축 vs 타행위 신축으로 갈림)
 */
export function mapType2ToSewageTypeValue(
  type1: string | null | undefined,
  type2: string | null | undefined,
): string {
  const t2 = String(type2 ?? "").trim();
  const t1 = String(type1 ?? "").trim();
  if (t2 === "01") {
    return t1 === "02"
      ? SEWAGE_TYPE_VALUE.OTHER_ACT_NEW
      : SEWAGE_TYPE_VALUE.INDIVIDUAL_NEW;
  }
  if (t2 === "02") return SEWAGE_TYPE_VALUE.INDIVIDUAL_EXTENSION;
  if (t2 === "03") return SEWAGE_TYPE_VALUE.INDIVIDUAL_CHANGE;
  if (t2 === "04") return SEWAGE_TYPE_VALUE.REBUILD;
  return "";
}

/** 건축용도 기준단가 API `isOtherAct` — 타행위(TYPE_1=02)만 true */
export function isOtherActCategory(category: string): boolean {
  return category === SEWAGE_CATEGORY.OTHER_ACT;
}

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
