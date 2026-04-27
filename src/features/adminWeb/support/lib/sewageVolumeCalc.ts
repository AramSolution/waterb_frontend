/**
 * 오수량(m³/일 등) 산정 모드.
 * - **다중주택**: 방수·**세대수**·1일오수 식 + UI에서 세대수 입력 (`multi`)
 * - **단독주택**(WAT002 `0101` 또는 용도명): 방수·1일오수 식 (`standalone`)
 * - **공동주택(`0102`) 등 그 외**: 면적·1일오수 식 (`default`) — 공동 ≠ 다중주택 식
 */
export type SewageCalcMode = "standalone" | "multi" | "default";

function compact(s: string): string {
  return (s || "").replace(/\s+/g, "");
}

/** 용도명·분류 라벨에 「다중주택」이 포함되는지 — 세대수·방수 식은 이 경우에만 적용 */
export function lineTextIndicatesMultiFamilyHouse(line: {
  buildingUse?: string;
  midCategoryLabel?: string;
}): boolean {
  const t = `${compact(line.buildingUse ?? "")}${compact(line.midCategoryLabel ?? "")}`;
  return t.includes("다중주택");
}

/** WAT002: `0101*`만 단독 식. `0102`(공동주택)는 코드만으로는 multi 아님 */
export function getSewageCalcModeFromBuildingUseSubCode(
  subCode: string,
): SewageCalcMode {
  const c = (subCode || "").trim();
  if (!c) return "default";
  if (c.startsWith("0101")) return "standalone";
  return "default";
}

/** 단일 헬퍼: 다중주택 문구 → multi, 이후 `0101`·용도명 단독·라벨 보조 */
export function getSewageCalcModeForLine(line: {
  buildingUseSubCode?: string;
  buildingUse?: string;
  midCategoryLabel?: string;
}): SewageCalcMode {
  if (lineTextIndicatesMultiFamilyHouse(line)) return "multi";

  const sub = (line.buildingUseSubCode ?? "").trim();
  if (sub.startsWith("0101")) return "standalone";

  const u = compact(line.buildingUse ?? "");
  if (u.includes("단독주택")) return "standalone";

  if (sub.startsWith("0102")) return "default";

  const mid = compact(line.midCategoryLabel ?? "");
  if (mid.includes("단독주택")) return "standalone";

  return "default";
}

function parseMetric(s: string): number {
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function fmtQty(v: number): string {
  if (!Number.isFinite(v)) return "";
  const rounded = Math.round(v * 1_000_000) / 1_000_000;
  return String(rounded);
}

export interface SewageQtyLineInput {
  /** WAT002 소분류 code (용도조회 `gubun2`) */
  buildingUseSubCode: string;
  /** 용도명 — 상세 줄 `usage` */
  buildingUse: string;
  /** 분류 트리 상위 라벨 등 */
  midCategoryLabel: string;
  area: string;
  dailySewage: string;
  roomCount: string;
  householdCount: string;
}

/**
 * 행 단위 오수량(표시값) 계산
 * - 다중주택: (2.7+(방수-2)*0.5)*1일오수*세대수/1,000
 * - 단독주택: (2+(방수-2)*0.5)*1일오수/1,000
 * - 기본: 면적*1일오수/1,000
 */
export function computeLineSewageQty(line: SewageQtyLineInput): string {
  const mode = getSewageCalcModeForLine({
    buildingUseSubCode: line.buildingUseSubCode,
    buildingUse: line.buildingUse,
    midCategoryLabel: line.midCategoryLabel,
  });
  const daily = parseMetric(line.dailySewage);
  if (!Number.isFinite(daily)) return "";

  if (mode === "standalone") {
    const rooms = parseMetric(line.roomCount);
    if (!Number.isFinite(rooms)) return "";
    const coef = 2 + (rooms - 2) * 0.5;
    return fmtQty((coef * daily) / 1000);
  }

  if (mode === "multi") {
    const rooms = parseMetric(line.roomCount);
    const hh = parseMetric(line.householdCount);
    if (!Number.isFinite(rooms) || !Number.isFinite(hh)) return "";
    const coef = 2.7 + (rooms - 2) * 0.5;
    return fmtQty((coef * daily * hh) / 1000);
  }

  const area = parseMetric(line.area);
  if (!Number.isFinite(area)) return "";
  return fmtQty((area * daily) / 1000);
}
