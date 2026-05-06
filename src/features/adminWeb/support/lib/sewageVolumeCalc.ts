/**
 * 오수량(m³/일 등) 산정 모드.
 * - **다세대주택**: 건축물 ID `BUL_0000000000000004`만 — 방수·**세대수**·1일오수 식 (`multi`)
 * - **방수·1일오수 식(`standalone`)**: WAT002 `gubun2`가 **정확히 `0101`** 일 때만(접두 `0101xx` 아님)
 * - **그 외**: 면적·1일오수 식(`default`) — 용도명(농업인 등)·라벨은 **보조**만, 별도 농업인 분기 없음
 */

/** 다세대주택 전용 ARMBUILD 건축물 ID(운영 코드표 1건) — `multi` 분기 */
export const SEWAGE_DASAEDAE_BUILD_ID = "BUL_0000000000000004" as const;

export type SewageCalcMode = "standalone" | "multi" | "default";

function compact(s: string): string {
  return (s || "").replace(/\s+/g, "");
}

function isDasaedaeBuildId(armbuildBuildId?: string): boolean {
  return String(armbuildBuildId ?? "").trim() === SEWAGE_DASAEDAE_BUILD_ID;
}

/** WAT002: **`0101` 정확 일치**만 단독 식. `0102` 접두는 면적 식 쪽으로 보냄 */
export function getSewageCalcModeFromBuildingUseSubCode(
  subCode: string,
): SewageCalcMode {
  const c = (subCode || "").trim();
  if (!c) return "default";
  if (c === "0101") return "standalone";
  return "default";
}

/** 단일 헬퍼: `BUL_…0004` → multi, **`gubun2 === "0101"`** → standalone, 나머지 문자열 보조 */
export function getSewageCalcModeForLine(line: {
  buildingUseSubCode?: string;
  buildingUse?: string;
  midCategoryLabel?: string;
  /** 용도조회·상세 `buildId`(ARMBUILD) — 다세대주택 1건 구분 */
  armbuildBuildId?: string;
}): SewageCalcMode {
  if (isDasaedaeBuildId(line.armbuildBuildId)) return "multi";

  const sub = (line.buildingUseSubCode ?? "").trim();
  if (sub === "0101") return "standalone";

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
  /** ARMBUILD `buildId` — 다세대주택(`BUL_…0004`) 시 multi */
  armbuildBuildId?: string;
  area: string;
  dailySewage: string;
  roomCount: string;
  householdCount: string;
  /**
   * 1일오수발생량 옆 체크박스 — 산정식 **말미**에 곱함.
   * - 미체크(`false`/`undefined`): `×1` (기존 식 결과 유지)
   * - 체크(`true`): `×0` (오수량 0)
   */
  selected?: boolean;
}

/**
 * 행 단위 오수량(표시값) 계산
 * - 다세대주택(`BUL_…0004`): (2.7+(방수-2)*0.5)*1일오수*세대수/1,000
 * - 단독·0101 등: (2+(방수-2)*0.5)*1일오수/1,000
 * - 기본: 면적*1일오수/1,000
 * - 위 식 결과 끝에 (1일오수 옆 체크 시 ×0, 미체크 ×1) 적용
 */
export function computeLineSewageQty(line: SewageQtyLineInput): string {
  const mode = getSewageCalcModeForLine({
    buildingUseSubCode: line.buildingUseSubCode,
    buildingUse: line.buildingUse,
    midCategoryLabel: line.midCategoryLabel,
    armbuildBuildId: line.armbuildBuildId,
  });
  const daily = parseMetric(line.dailySewage);
  if (!Number.isFinite(daily)) return "";

  let qty: number;

  if (mode === "standalone") {
    const rooms = parseMetric(line.roomCount);
    if (!Number.isFinite(rooms)) return "";
    const coef = 2 + (rooms - 2) * 0.5;
    qty = (coef * daily) / 1000;
  } else if (mode === "multi") {
    const rooms = parseMetric(line.roomCount);
    const hh = parseMetric(line.householdCount);
    if (!Number.isFinite(rooms) || !Number.isFinite(hh)) return "";
    const coef = 2.7 + (rooms - 2) * 0.5;
    qty = (coef * daily * hh) / 1000;
  } else {
    const area = parseMetric(line.area);
    if (!Number.isFinite(area)) return "";
    qty = (area * daily) / 1000;
  }

  if (!Number.isFinite(qty)) return "";
  const tailFactor = line.selected === true ? 0 : 1;
  return fmtQty(qty * tailFactor);
}
