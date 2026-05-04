import {
  mapCategoryToType1,
  mapSewageTypeValueToType2,
  SEWAGE_CATEGORY,
} from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import type {
  SewageDetailLine,
  SewageEstimateEntry,
} from "../model/useFeePayerSewageVolumeEstimate";
import type {
  SupportFeePayerBasicInfoRequest,
  SupportFeePayerCalcRequest,
  SupportFeePayerDetailRequest,
  SupportFeePayerRegisterRequest,
} from "@/entities/adminWeb/support/api/feePayerManageApi";

function parseNumericInput(raw: string): number | undefined {
  const t = String(raw ?? "").replace(/,/g, "").trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function parseIntSafe(raw: string): number {
  const n = parseNumericInput(raw);
  return n !== undefined && Number.isFinite(n) ? Math.trunc(n) : 0;
}

function normalizeText(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

/** 상세 줄 오수량 합산(문자열 숫자 허용) */
export function sumLineWaterVol(lines: SewageDetailLine[]): number {
  let s = 0;
  for (const L of lines) {
    const n = parseNumericInput(L.sewageQty);
    if (n !== undefined && Number.isFinite(n)) s += n;
  }
  return s;
}

/**
 * 저장 전: 허가사항변경 제외 통지일 블록에서 상단 `sewageVolume`(waterSum)과
 * 하위 행 `sewageQty` 합계가 일치하는지 검사한다.
 */
export function validateEntriesSewageVolumeVsLines(
  entries: readonly SewageEstimateEntry[],
): string | null {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.category === SEWAGE_CATEGORY.PERMIT_CHANGE) continue;
    const sum = sumLineWaterVol(entry.lines);
    const topParsed = parseNumericInput(entry.sewageVolume);
    const topVal =
      topParsed !== undefined && Number.isFinite(topParsed) ? topParsed : 0;
    const topEmpty = String(entry.sewageVolume ?? "").trim() === "";
    const hasLineQty = entry.lines.some((L) => {
      const q = parseNumericInput(L.sewageQty);
      return q !== undefined && Number.isFinite(q);
    });
    if (!hasLineQty && topEmpty && sum === 0) continue;
    if (Math.abs(sum - topVal) > 1e-5) {
      return `통지일 블록 ${i + 1}: 상단 오수량과 하위 행 오수량 합계가 일치하지 않습니다. (합계 ${sum.toLocaleString("ko-KR", { maximumFractionDigits: 10 })})`;
    }
  }
  return null;
}

type CalcComparable = {
  floor?: number;
  buildId?: string;
  roomCnt?: number;
  homeCnt?: number;
  buildSize?: number;
  dayVal?: number;
  costYn?: string;
  waterVol?: number;
};

type DetailComparable = {
  paySta?: string;
  type1?: string;
  type2?: string;
  reqDate?: string;
  baseCost?: number;
  waterSum?: number;
};

function calcOriginalKey(seq: number, seq2: number): string {
  return `${seq}:${seq2}`;
}

function toComparableCalculation(line: SewageDetailLine): CalcComparable {
  const floor = parseIntSafe(line.floor);
  const roomCnt = parseIntSafe(line.roomCount);
  const homeCnt = parseIntSafe(line.householdCount);
  const buildSize = parseNumericInput(line.area);
  const dayVal = parseNumericInput(line.dailySewage);
  const waterVol = parseNumericInput(line.sewageQty);
  return {
    floor,
    buildId: normalizeText(line.armbuildBuildId) || undefined,
    roomCnt: roomCnt || undefined,
    homeCnt: homeCnt || undefined,
    buildSize,
    dayVal,
    costYn: line.selected ? "Y" : "N",
    waterVol,
  };
}

function isSameNumber(
  a: number | undefined,
  b: number | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  // 소수 합산(waterSum 등)에서 0.30000000000000004 같은 부동소수 오차로
  // 변경 감지가 오탐되어 rowStatus="U"가 붙는 것을 방지한다.
  return Math.abs(a - b) < 1e-9;
}

function isSameText(a: string | undefined, b: string | undefined): boolean {
  return normalizeText(a) === normalizeText(b);
}

function isSameCalcComparable(
  a: CalcComparable | undefined,
  b: CalcComparable,
): boolean {
  if (!a) return true;
  return (
    isSameNumber(a.floor, b.floor) &&
    isSameText(a.buildId, b.buildId) &&
    isSameNumber(a.roomCnt, b.roomCnt) &&
    isSameNumber(a.homeCnt, b.homeCnt) &&
    isSameNumber(a.buildSize, b.buildSize) &&
    isSameNumber(a.dayVal, b.dayVal) &&
    // waterVol은 화면/산식 반영 타이밍 차이로 오탐이 잦아
    // rowStatus 변경 감지 조건에서는 제외한다.
    // (실제 전송 payload에는 그대로 포함)
    isSameText(a.costYn, b.costYn)
  );
}

function buildCalculationRequest(
  line: SewageDetailLine,
  detailSeq: number | undefined,
  originalBySeq2: ReadonlyMap<string, CalcComparable>,
): SupportFeePayerCalcRequest | null {
  const current = toComparableCalculation(line);
  const seq2 = line.calcSeq2;
  const hasSeq2 = seq2 != null && seq2 > 0;
  if (!hasSeq2) {
    return {
      rowStatus: "I",
      ...current,
    };
  }
  const hasDetailSeq = detailSeq != null && detailSeq > 0;
  const original = hasDetailSeq
    ? originalBySeq2.get(calcOriginalKey(detailSeq, seq2))
    : undefined;
  const changed = !isSameCalcComparable(original, current);
  if (!changed) return null;
  return {
    rowStatus: "U",
    seq2,
    ...current,
  };
}

function toComparableDetail(entry: SewageEstimateEntry): DetailComparable | null {
  const type1 = mapCategoryToType1(entry.category);
  const type2 = mapSewageTypeValueToType2(entry.type);
  if (!type1 || !type2) return null;
  const baseCostRaw = parseNumericInput(entry.unitPrice);
  const baseCost =
    baseCostRaw !== undefined && Number.isFinite(baseCostRaw)
      ? Math.round(baseCostRaw)
      : 0;
  // 상세 원본(block.waterSum)과의 변경 비교는 상단 필드(sewageVolume) 기준으로 본다.
  // lines 합산값은 화면/산식 반영 타이밍·반올림에 따라 원본과 달라질 수 있어
  // 미변경임에도 detail rowStatus="U" 오탐이 발생할 수 있다.
  const waterSum = parseNumericInput(entry.sewageVolume) ?? 0;
  const paySta = entry.status === "PAID" ? "02" : "01";
  return {
    paySta,
    type1,
    type2,
    reqDate: normalizeText(entry.notifyDate) || undefined,
    baseCost,
    waterSum,
  };
}

function isSameDetailComparable(
  a: DetailComparable | undefined,
  b: DetailComparable,
): boolean {
  if (!a) return true;
  return (
    isSameText(a.paySta, b.paySta) &&
    isSameText(a.type1, b.type1) &&
    isSameText(a.type2, b.type2) &&
    isSameText(a.reqDate, b.reqDate) &&
    isSameNumber(a.baseCost, b.baseCost) &&
    isSameNumber(a.waterSum, b.waterSum)
  );
}

function buildOriginalCalcMap(
  initialEntries: readonly SewageEstimateEntry[],
): Map<string, CalcComparable> {
  const m = new Map<string, CalcComparable>();
  for (const entry of initialEntries) {
    const seq = entry.detailSeq;
    if (seq == null || seq <= 0) continue;
    for (const line of entry.lines) {
      const seq2 = line.calcSeq2;
      if (seq2 == null || seq2 <= 0) continue;
      m.set(calcOriginalKey(seq, seq2), toComparableCalculation(line));
    }
  }
  return m;
}

function buildOriginalDetailMap(
  initialEntries: readonly SewageEstimateEntry[],
): Map<number, DetailComparable> {
  const m = new Map<number, DetailComparable>();
  for (const entry of initialEntries) {
    const seq = entry.detailSeq;
    if (seq == null || seq <= 0) continue;
    const comparable = toComparableDetail(entry);
    if (comparable) {
      m.set(seq, comparable);
    }
  }
  return m;
}

function mapEntryToPersistDetail(
  entry: SewageEstimateEntry,
  removedCalcs: ReadonlyArray<{ seq: number; seq2: number }>,
  originalDetailBySeq: ReadonlyMap<number, DetailComparable>,
  originalCalcBySeq2: ReadonlyMap<string, CalcComparable>,
): SupportFeePayerDetailRequest | null {
  const base = mapEntryToDetail(entry, originalDetailBySeq, originalCalcBySeq2);
  if (!base) return null;
  const seq = entry.detailSeq;
  const prefix: SupportFeePayerCalcRequest[] = [];
  if (seq != null && seq > 0) {
    for (const r of removedCalcs) {
      if (r.seq === seq && r.seq2 > 0) {
        prefix.push({ rowStatus: "D", seq2: r.seq2 });
      }
    }
  }
  base.calculations = [...prefix, ...(base.calculations ?? [])];
  if (base.calculations.length === 0) {
    delete base.calculations;
  }
  const hasExistingSeq = seq != null && seq > 0;
  // 상위(detail) 필드 자체가 미변경이어도 calculations(I/U/D) 변경이 있으면
  // 서버에서 detail 업데이트 경로를 타도록 rowStatus="U"를 강제한다.
  if (
    hasExistingSeq &&
    !base.rowStatus &&
    base.calculations &&
    base.calculations.length > 0
  ) {
    base.rowStatus = "U";
  }
  if (
    hasExistingSeq &&
    !base.rowStatus &&
    (!base.calculations || base.calculations.length === 0)
  ) {
    return null;
  }
  return base;
}

function mapEntryToDetail(
  entry: SewageEstimateEntry,
  originalDetailBySeq: ReadonlyMap<number, DetailComparable>,
  originalCalcBySeq2: ReadonlyMap<string, CalcComparable>,
): SupportFeePayerDetailRequest | null {
  const detailComparable = toComparableDetail(entry);
  if (!detailComparable) return null;

  const calculations = entry.lines
    .map((line) =>
      buildCalculationRequest(line, entry.detailSeq, originalCalcBySeq2),
    )
    .filter((calc): calc is SupportFeePayerCalcRequest => calc != null);

  const hasSeq = entry.detailSeq != null && entry.detailSeq > 0;
  const seq = hasSeq ? (entry.detailSeq as number) : undefined;
  const originalDetail = seq != null ? originalDetailBySeq.get(seq) : undefined;
  const detailChanged = !isSameDetailComparable(originalDetail, detailComparable);
  const rowStatus = !hasSeq ? "I" : detailChanged ? "U" : undefined;

  return {
    rowStatus,
    seq,
    ...detailComparable,
    calculations: calculations.length > 0 ? calculations : undefined,
  };
}

export interface BuildFeePayerRegisterBodyInput {
  basicInfo: SupportFeePayerBasicInfoRequest;
  /** 서버에 이미 있는 ITEM_ID (첫 계산 후 콜백) */
  itemId?: string | null;
  entries: SewageEstimateEntry[];
  /** 상세 최초 로드 스냅샷(변경 감지 기준) */
  initialEntries?: readonly SewageEstimateEntry[];
  /** 계산 요청에도 저장과 동일하게 삭제 D 행을 포함한다. */
  removedDetailSeqs: readonly number[];
  removedCalcs: ReadonlyArray<{ seq: number; seq2: number }>;
  /** 계산 대상 통지일 블록 — details 배열에서 마지막 I/U가 프로시저 대상이 되도록 맨 뒤로 보냄 */
  calculateTargetEntryId: string;
}

export function buildSupportFeePayerRegisterRequest(
  input: BuildFeePayerRegisterBodyInput,
): SupportFeePayerRegisterRequest | null {
  const {
    basicInfo,
    itemId,
    entries,
    initialEntries = [],
    removedDetailSeqs,
    removedCalcs,
    calculateTargetEntryId,
  } = input;
  const target = entries.find((e) => e.id === calculateTargetEntryId);
  if (!target) return null;

  const others = entries.filter((e) => e.id !== calculateTargetEntryId);
  const ordered = [...others, target];

  const activeSeqs = new Set(
    entries
      .map((e) => e.detailSeq)
      .filter((s): s is number => s != null && s > 0),
  );
  const originalDetailBySeq = buildOriginalDetailMap(initialEntries);
  const originalCalcBySeq2 = buildOriginalCalcMap(initialEntries);

  const details: SupportFeePayerDetailRequest[] = [];
  const uniqRemoved = Array.from(
    new Set(removedDetailSeqs.filter((n) => n > 0)),
  );
  for (const seq of uniqRemoved) {
    if (activeSeqs.has(seq)) continue;
    details.push({ rowStatus: "D", seq, calculations: [] });
  }

  for (const e of ordered) {
    const d = mapEntryToPersistDetail(
      e,
      removedCalcs,
      originalDetailBySeq,
      originalCalcBySeq2,
    );
    if (d) details.push(d);
  }

  const body: SupportFeePayerRegisterRequest = {
    basicInfo,
    details,
  };
  const id = itemId?.trim();
  if (id) body.itemId = id;
  return body;
}

export interface BuildFeePayerRegisterPersistInput {
  basicInfo: SupportFeePayerBasicInfoRequest;
  itemId?: string | null;
  entries: SewageEstimateEntry[];
  /** 상세 최초 로드 스냅샷(변경 감지 기준) */
  initialEntries?: readonly SewageEstimateEntry[];
  removedDetailSeqs: readonly number[];
  removedCalcs: ReadonlyArray<{ seq: number; seq2: number }>;
}

export function hasInvalidRequiredFieldsInEntries(
  entries: readonly SewageEstimateEntry[],
): boolean {
  for (const entry of entries) {
    const type1 = mapCategoryToType1(entry.category);
    const type2 = mapSewageTypeValueToType2(entry.type);
    if (!type1 || !type2) return true;
    if (normalizeText(entry.notifyDate) === "") return true;
  }
  return false;
}

/**
 * 저장(`POST …/fee-payer`)용 본문 — 통지일 블록 순서 유지, 삭제(D) 반영.
 * 계산 API용 `buildSupportFeePayerRegisterRequest`와 달리 `calculateTargetEntryId` 재정렬 없음.
 */
export function buildSupportFeePayerRegisterRequestForPersist(
  input: BuildFeePayerRegisterPersistInput,
): SupportFeePayerRegisterRequest | null {
  const {
    basicInfo,
    itemId,
    entries,
    initialEntries = [],
    removedDetailSeqs,
    removedCalcs,
  } =
    input;

  const activeSeqs = new Set(
    entries
      .map((e) => e.detailSeq)
      .filter((s): s is number => s != null && s > 0),
  );

  const details: SupportFeePayerDetailRequest[] = [];
  const originalDetailBySeq = buildOriginalDetailMap(initialEntries);
  const originalCalcBySeq2 = buildOriginalCalcMap(initialEntries);
  const uniqRemoved = Array.from(
    new Set(removedDetailSeqs.filter((n) => n > 0)),
  );
  for (const seq of uniqRemoved) {
    if (activeSeqs.has(seq)) continue;
    details.push({ rowStatus: "D", seq, calculations: [] });
  }

  for (const e of entries) {
    const d = mapEntryToPersistDetail(
      e,
      removedCalcs,
      originalDetailBySeq,
      originalCalcBySeq2,
    );
    if (d) details.push(d);
  }

  if (details.length === 0) return null;

  const body: SupportFeePayerRegisterRequest = { basicInfo, details };
  const id = itemId?.trim();
  if (id) body.itemId = id;
  return body;
}
