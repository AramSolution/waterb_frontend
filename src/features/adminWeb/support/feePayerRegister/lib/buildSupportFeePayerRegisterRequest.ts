import {
  mapCategoryToType1,
  mapSewageTypeValueToType2,
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

/** 상세 줄 오수량 합산(문자열 숫자 허용) */
export function sumLineWaterVol(lines: SewageDetailLine[]): number {
  let s = 0;
  for (const L of lines) {
    const n = parseNumericInput(L.sewageQty);
    if (n !== undefined && Number.isFinite(n)) s += n;
  }
  return s;
}

function mapLineToCalculation(line: SewageDetailLine): SupportFeePayerCalcRequest {
  const floor = parseIntSafe(line.floor);
  const roomCnt = parseIntSafe(line.roomCount);
  const homeCnt = parseIntSafe(line.householdCount);
  const buildSize = parseNumericInput(line.area);
  const dayVal = parseNumericInput(line.dailySewage);
  const waterVol = parseNumericInput(line.sewageQty);
  const hasSeq2 = line.calcSeq2 != null && line.calcSeq2 > 0;
  return {
    rowStatus: hasSeq2 ? "U" : "I",
    seq2: hasSeq2 ? line.calcSeq2 : undefined,
    floor,
    buildId: line.armbuildBuildId?.trim() || undefined,
    roomCnt: roomCnt || undefined,
    homeCnt: homeCnt || undefined,
    buildSize,
    dayVal,
    costYn: line.selected ? "Y" : "N",
    waterVol,
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
  return base;
}

function mapEntryToDetail(
  entry: SewageEstimateEntry,
): SupportFeePayerDetailRequest | null {
  const type1 = mapCategoryToType1(entry.category);
  const type2 = mapSewageTypeValueToType2(entry.type);
  if (!type1 || !type2) return null;

  const baseCostRaw = parseNumericInput(entry.unitPrice);
  const baseCost =
    baseCostRaw !== undefined && Number.isFinite(baseCostRaw)
      ? Math.round(baseCostRaw)
      : 0;

  const waterSumNum = sumLineWaterVol(entry.lines);

  const paySta = entry.status === "PAID" ? "02" : "01";

  const calculations = entry.lines.map(mapLineToCalculation);

  const hasSeq = entry.detailSeq != null && entry.detailSeq > 0;

  return {
    rowStatus: hasSeq ? "U" : "I",
    seq: hasSeq ? entry.detailSeq : undefined,
    paySta,
    type1,
    type2,
    reqDate: entry.notifyDate?.trim() || undefined,
    baseCost,
    waterSum: waterSumNum,
    calculations,
  };
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
    if (!d) return null;
    details.push(d);
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

/**
 * 저장(`POST …/fee-payer`)용 본문 — 통지일 블록 순서 유지, 삭제(D) 반영.
 * 계산 API용 `buildSupportFeePayerRegisterRequest`와 달리 `calculateTargetEntryId` 재정렬 없음.
 */
export function buildSupportFeePayerRegisterRequestForPersist(
  input: BuildFeePayerRegisterPersistInput,
): SupportFeePayerRegisterRequest | null {
  const { basicInfo, itemId, entries, removedDetailSeqs, removedCalcs } =
    input;

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
    if (!d) return null;
    details.push(d);
  }

  if (details.length === 0) return null;

  const body: SupportFeePayerRegisterRequest = { basicInfo, details };
  const id = itemId?.trim();
  if (id) body.itemId = id;
  return body;
}
