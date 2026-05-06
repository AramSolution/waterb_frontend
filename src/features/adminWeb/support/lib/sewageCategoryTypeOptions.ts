/**
 * 원인자부담 「오수량 발생량 산정」「납부내역」: 구분·유형 고정 코드 및 API(TYPE_1/TYPE_2) 매핑.
 * value·코드표 변경 시 이 파일만 맞춘다.
 */
export const SEWAGE_CATEGORY = {
  /** 개발건축물 — API TYPE_1 `01` */
  INDIVIDUAL: "INDIVIDUAL",
  /** 타행위 — API TYPE_1 `02` */
  OTHER_ACT: "OTHER_ACT",
} as const;

/** 화면 `유형` — API TYPE_2 `01`~`06`과 1:1 */
export const SEWAGE_TYPE_VALUE = {
  T01_NEW: "T01_NEW",
  T02_EXTENSION: "T02_EXTENSION",
  T03_USE_CHANGE: "T03_USE_CHANGE",
  T04_EXT_USE: "T04_EXT_USE",
  T05_PERMIT: "T05_PERMIT",
  T06_REBUILD: "T06_REBUILD",
} as const;

export type SewageTypeOption = { value: string; label: string };

/** 과거 UI/저장값 `PERMIT_CHANGE` 구분 — 개발건축물로 정규화 */
const LEGACY_CATEGORY_PERMIT = "PERMIT_CHANGE";

export function normalizeSewageCategory(category: string): string {
  const c = String(category ?? "").trim();
  if (c === LEGACY_CATEGORY_PERMIT) return SEWAGE_CATEGORY.INDIVIDUAL;
  if (c === SEWAGE_CATEGORY.INDIVIDUAL || c === SEWAGE_CATEGORY.OTHER_ACT) {
    return c;
  }
  return SEWAGE_CATEGORY.INDIVIDUAL;
}

export function getSewageCategoryOptions(): SewageTypeOption[] {
  return [
    { value: SEWAGE_CATEGORY.INDIVIDUAL, label: "개발건축물" },
    { value: SEWAGE_CATEGORY.OTHER_ACT, label: "타행위" },
  ];
}

export function getSewageTypeOptions(): SewageTypeOption[] {
  return [
    { value: SEWAGE_TYPE_VALUE.T01_NEW, label: "신축" },
    { value: SEWAGE_TYPE_VALUE.T02_EXTENSION, label: "증축" },
    { value: SEWAGE_TYPE_VALUE.T03_USE_CHANGE, label: "용도변경" },
    { value: SEWAGE_TYPE_VALUE.T04_EXT_USE, label: "증축 및 용도변경" },
    { value: SEWAGE_TYPE_VALUE.T05_PERMIT, label: "허가사항변경" },
    { value: SEWAGE_TYPE_VALUE.T06_REBUILD, label: "개축" },
  ];
}

/**
 * @deprecated 구분과 무관한 고정 목록 — `getSewageTypeOptions()` 사용.
 */
export function getSewageTypeOptionsForCategory(_category: string): SewageTypeOption[] {
  return getSewageTypeOptions();
}

export function isSewagePermitChangeType(typeValue: string): boolean {
  return String(typeValue ?? "").trim() === SEWAGE_TYPE_VALUE.T05_PERMIT;
}

/** ARTITED.TYPE_1 — `01` 개발건축물, `02` 타행위 (허가는 TYPE_2 `05`) */
export function mapCategoryToType1(category: string): string | undefined {
  const c = normalizeSewageCategory(category);
  if (c === SEWAGE_CATEGORY.INDIVIDUAL) return "01";
  if (c === SEWAGE_CATEGORY.OTHER_ACT) return "02";
  return undefined;
}

/** ARTITED.TYPE_2 — `01`~`06` (신축~개축) */
export function mapSewageTypeValueToType2(
  typeValue: string,
): string | undefined {
  switch (String(typeValue ?? "").trim()) {
    case SEWAGE_TYPE_VALUE.T01_NEW:
      return "01";
    case SEWAGE_TYPE_VALUE.T02_EXTENSION:
      return "02";
    case SEWAGE_TYPE_VALUE.T03_USE_CHANGE:
      return "03";
    case SEWAGE_TYPE_VALUE.T04_EXT_USE:
      return "04";
    case SEWAGE_TYPE_VALUE.T05_PERMIT:
      return "05";
    case SEWAGE_TYPE_VALUE.T06_REBUILD:
      return "06";
    default:
      return undefined;
  }
}

/** ARTITED.TYPE_1 → 화면 `구분` value */
export function mapType1ToCategory(type1: string | null | undefined): string {
  const t = String(type1 ?? "").trim();
  if (t === "01") return SEWAGE_CATEGORY.INDIVIDUAL;
  if (t === "02") return SEWAGE_CATEGORY.OTHER_ACT;
  // 레거시: TYPE_1 `03`(허가사항변경 구분) — 개발건축물로 표시, 유형은 mapType2에서 허가 등으로 복원
  if (t === "03") return SEWAGE_CATEGORY.INDIVIDUAL;
  return "";
}

/**
 * ARTITED.TYPE_2 (+ TYPE_1 레거시) → 화면 `유형` value
 *
 * 레거시: TYPE_1=`03` 이고 TYPE_2=`04` → 허가사항변경(`05`).
 * 레거시: TYPE_2=`04`가 「개축」이던 시기 — TYPE_1이 `01`/`02`이면 `06` 개축으로 해석.
 * (DB가 신코드로 마이그레이션되면 TYPE_2 `04`는 「증축 및 용도변경」만 의미)
 */
export function mapType2ToSewageTypeValue(
  type1: string | null | undefined,
  type2: string | null | undefined,
): string {
  const t2 = String(type2 ?? "").trim();
  const t1 = String(type1 ?? "").trim();
  if (t1 === "03" && t2 === "04") {
    return SEWAGE_TYPE_VALUE.T05_PERMIT;
  }
  if ((t1 === "01" || t1 === "02") && t2 === "04") {
    return SEWAGE_TYPE_VALUE.T06_REBUILD;
  }
  if (t2 === "01") return SEWAGE_TYPE_VALUE.T01_NEW;
  if (t2 === "02") return SEWAGE_TYPE_VALUE.T02_EXTENSION;
  if (t2 === "03") return SEWAGE_TYPE_VALUE.T03_USE_CHANGE;
  if (t2 === "04") return SEWAGE_TYPE_VALUE.T04_EXT_USE;
  if (t2 === "05") return SEWAGE_TYPE_VALUE.T05_PERMIT;
  if (t2 === "06") return SEWAGE_TYPE_VALUE.T06_REBUILD;
  return "";
}

/** 건축용도 기준단가 API `isOtherAct` — 타행위(TYPE_1=02)만 true */
export function isOtherActCategory(category: string): boolean {
  return normalizeSewageCategory(category) === SEWAGE_CATEGORY.OTHER_ACT;
}
