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

/** 산정 행 API 필드 — 원본과 비교하지 않고 현재 값만 전달한다. */
function buildCalcPayloadFields(line: SewageDetailLine): Omit<
  SupportFeePayerCalcRequest,
  "rowStatus" | "seq2"
> {
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

/**
 * 서버에 이미 반영된 줄(`seq2`)은 `U`, 신규 줄은 `I`.
 */
function buildCalculationRequest(
  line: SewageDetailLine,
): SupportFeePayerCalcRequest {
  const payload = buildCalcPayloadFields(line);
  const seq2 = line.calcSeq2;
  const hasSeq2 = seq2 != null && seq2 > 0;
  if (!hasSeq2) {
    return {
      rowStatus: "I",
      ...payload,
    };
  }
  return {
    rowStatus: "U",
    seq2,
    ...payload,
  };
}

function buildDetailHeaderFields(
  entry: SewageEstimateEntry,
): Omit<
  SupportFeePayerDetailRequest,
  "rowStatus" | "seq" | "calculations"
> | null {
  const type1 = mapCategoryToType1(entry.category);
  const type2 = mapSewageTypeValueToType2(entry.type);
  if (!type1 || !type2) return null;
  const baseCostRaw = parseNumericInput(entry.unitPrice);
  const baseCost =
    baseCostRaw !== undefined && Number.isFinite(baseCostRaw)
      ? Math.round(baseCostRaw)
      : 0;
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

function mapEntryToDetail(
  entry: SewageEstimateEntry,
): SupportFeePayerDetailRequest | null {
  const header = buildDetailHeaderFields(entry);
  if (!header) return null;

  const calculations = entry.lines.map((line) =>
    buildCalculationRequest(line),
  );

  const hasSeq = entry.detailSeq != null && entry.detailSeq > 0;
  const seq = hasSeq ? (entry.detailSeq as number) : undefined;
  const rowStatus = hasSeq ? "U" : "I";

  return {
    rowStatus,
    seq,
    ...header,
    calculations: calculations.length > 0 ? calculations : undefined,
  };
}

function mapEntryToPersistDetail(
  entry: SewageEstimateEntry,
  removedCalcs: ReadonlyArray<{ seq: number; seq2: number }>,
): SupportFeePayerDetailRequest | null {
  const base = mapEntryToDetail(entry);
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
  return base;
}

export interface BuildFeePayerRegisterBodyInput {
  basicInfo: SupportFeePayerBasicInfoRequest;
  /** 서버에 이미 있는 ITEM_ID (첫 계산 후 콜백) */
  itemId?: string | null;
  entries: SewageEstimateEntry[];
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

  const details: SupportFeePayerDetailRequest[] = [];
  const uniqRemoved = Array.from(
    new Set(removedDetailSeqs.filter((n) => n > 0)),
  );
  for (const seq of uniqRemoved) {
    if (activeSeqs.has(seq)) continue;
    details.push({ rowStatus: "D", seq, calculations: [] });
  }

  for (const e of ordered) {
    const d = mapEntryToPersistDetail(e, removedCalcs);
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
    removedDetailSeqs,
    removedCalcs,
  } = input;

  const activeSeqs = new Set(
    entries
      .map((e) => e.detailSeq)
      .filter((s): s is number => s != null && s > 0),
  );

  const details: SupportFeePayerDetailRequest[] = [];
  const uniqRemoved = Array.from(
    new Set(removedDetailSeqs.filter((n) => n > 0)),
  );
  for (const seq of uniqRemoved) {
    if (activeSeqs.has(seq)) continue;
    details.push({ rowStatus: "D", seq, calculations: [] });
  }

  for (const e of entries) {
    const d = mapEntryToPersistDetail(e, removedCalcs);
    if (d) details.push(d);
  }

  if (details.length === 0) return null;

  const body: SupportFeePayerRegisterRequest = { basicInfo, details };
  const id = itemId?.trim();
  if (id) body.itemId = id;
  return body;
}
