import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";
import { numericOnly } from "@/shared/lib/inputValidation";
import type { Support } from "./supportApi";

/** `SupportFeePayerBasicInfoRequest` — 등록·계산 공통 */
export interface SupportFeePayerBasicInfoRequest {
  userNm: string;
  zip?: string;
  adresLot?: string;
  adres: string;
  detailAdres?: string;
  /** 미입력 시 생략 가능 */
  usrTelno?: string;
}

/** `SupportFeePayerCalcRequest` — 산정 행 */
export interface SupportFeePayerCalcRequest {
  rowStatus?: string;
  seq2?: number;
  floor?: number;
  buildId?: string;
  roomCnt?: number;
  homeCnt?: number;
  buildSize?: number;
  dayVal?: number;
  costYn?: string;
  waterVol?: number;
}

/** `SupportFeePayerDetailRequest` — 통지일(ARTITED) 블록 */
export interface SupportFeePayerDetailRequest {
  rowStatus?: string;
  seq?: number;
  paySta?: string;
  type1?: string;
  type2?: string;
  reqDate?: string;
  baseCost?: number;
  waterSum?: number;
  calculations?: SupportFeePayerCalcRequest[];
}

/** `SupportFeePayerRegisterRequest` — 등록·계산 동일 본문 */
export interface SupportFeePayerRegisterRequest {
  itemId?: string;
  basicInfo: SupportFeePayerBasicInfoRequest;
  details: SupportFeePayerDetailRequest[];
}

/** `SupportFeePayerCalculateResponse` — 계산 버튼 응답 */
export interface SupportFeePayerCalculateResponse {
  result?: string;
  message?: string;
  itemId?: string | null;
  seq?: number | null;
  waterCost?: number | null;
  waterVal?: number | string | null;
  waterSum?: number | string | null;
}

/** `SupportFeePayerRegisterResponse` — 등록·수정·삭제 저장 응답 */
export interface SupportFeePayerRegisterResponse {
  result?: string;
  message?: string;
  itemId?: string | null;
}

/**
 * 백엔드 `SupportFeePayerBasicInfoRequest`의 `@NotBlank usrTelno` 호환:
 * 미입력 시 요청 본문에만 대체값을 넣는다(화면 상태는 그대로).
 */
export function applyFeePayerBasicInfoForApi(
  b: SupportFeePayerBasicInfoRequest,
): SupportFeePayerBasicInfoRequest {
  const digits = numericOnly(String(b.usrTelno ?? ""));
  return {
    ...b,
    usrTelno: digits.length >= 9 ? digits : "-",
  };
}

/** 상세조회 — 산정 줄(seq2 매핑용) */
export interface SupportFeePayerDetailCalculationDto {
  seq?: number | null;
  seq2?: number | null;
  floor?: number | null;
  buildId?: string | null;
  /** 상세 조회에서 내려오는 건축물 용도명(서버 스펙 확장) */
  buildNm?: string | null;
  /** 백엔드 JSON key 변형 대비 (snake/upper) */
  build_nm?: string | null;
  BUILD_NM?: string | null;
  roomCnt?: number | null;
  homeCnt?: number | null;
  buildSize?: number | string | null;
  dayVal?: number | string | null;
  costYn?: string | null;
  waterVol?: number | string | null;
}

export interface SupportFeePayerDetailBlockDto {
  seq?: number | null;
  paySta?: string | null;
  type1?: string | null;
  type2?: string | null;
  reqDate?: string | null;
  baseCost?: number | null;
  waterSum?: number | string | null;
  waterVal?: number | string | null;
  waterCost?: number | null;
  waterPay?: number | null;
  calculations?: SupportFeePayerDetailCalculationDto[];
}

export interface SupportFeePayerDetailDataDto {
  itemId?: string | null;
  userNm?: string | null;
  zip?: string | null;
  adresLot?: string | null;
  adres?: string | null;
  detailAdres?: string | null;
  usrTelno?: string | null;
  details?: SupportFeePayerDetailBlockDto[];
}

export interface SupportFeePayerDetailEnvelope {
  result?: string;
  message?: string;
  data?: SupportFeePayerDetailDataDto | null;
}

/** `SupportFeePayerManageController` — POST `/list` 요청 본문 */
export interface SupportFeePayerListRequest {
  reqDateFrom?: string;
  reqDateTo?: string;
  userNm?: string;
  address?: string;
}

/** 목록 1건 — `SupportFeePayerListItemResponse` */
export interface SupportFeePayerListItemDto {
  itemId?: string;
  seq?: number | null;
  paySta?: string;
  reqDate?: string;
  userNm?: string;
  zip?: string;
  adresLot?: string;
  adres?: string;
  detailAdres?: string;
  waterSum?: number | string | null;
  waterCost?: number | null;
  waterVal?: number | string | null;
  payDay?: string | null;
  pay?: number | null;
}

export interface SupportFeePayerListResponse {
  result?: string;
  message?: string;
  data?: SupportFeePayerListItemDto[];
}

function numOrUndef(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 목록·상세 등 **표시용** 주소 한 줄 — **우편번호(`zip`) 제외**
 * (검색 `address`는 백엔드에서 ZIP 포함 통합 검색 유지)
 */
export function formatFeePayerAddressLine(
  row: Pick<SupportFeePayerListItemDto, "adresLot" | "adres" | "detailAdres"> &
    Partial<Pick<SupportFeePayerListItemDto, "zip">>,
): string {
  return [row.adresLot, row.adres, row.detailAdres]
    .filter((x) => x != null && String(x).trim() !== "")
    .map((x) => String(x).trim())
    .join(" ");
}

/** 목록 API 행 → 기존 `Support` 목록 UI(`feeListRowFields`) 호환 */
export function mapFeePayerListItemToSupport(
  item: SupportFeePayerListItemDto,
): Support {
  const itemId = String(item.itemId ?? "").trim();
  /** 목록 부과액 = DB `WATER_COST` → `waterCost`만 사용 (`waterVal` 미사용) */
  const waterCostN =
    item.waterCost != null ? Number(item.waterCost) : undefined;
  const levy =
    waterCostN !== undefined && !Number.isNaN(waterCostN)
      ? waterCostN
      : undefined;
  const payN = item.pay != null ? Number(item.pay) : undefined;
  const payDd = item.payDay != null ? String(item.payDay).trim() : "";

  return {
    ...item,
    itemId,
    businessId: itemId,
    proId: itemId,
    feeDetailSeq: item.seq,
    applicantNm: item.userNm,
    addr: formatFeePayerAddressLine(item),
    notifyDd: item.reqDate,
    paySta: item.paySta,
    levyAmt: levy,
    payDd,
    payAmt: payN !== undefined && !Number.isNaN(payN) ? payN : undefined,
  };
}

/** 미납/납부 배지 — `paySta`·납부액 병행 */
export function isFeePayerListRowPaid(row: Support): boolean {
  const rowAny = row as Record<string, unknown>;
  const v = String(rowAny.paySta ?? "").trim();
  if (v === "02" || v === "2" || v === "Y" || v === "납부") return true;
  const pay = numOrUndef(rowAny.pay ?? rowAny.payAmt);
  if (pay !== undefined && pay > 0) return true;
  return false;
}

export function buildSupportFeePayerListBody(input: {
  reqDateFrom?: string;
  reqDateTo?: string;
  userNm?: string;
  address?: string;
}): SupportFeePayerListRequest {
  const body: SupportFeePayerListRequest = {};
  const from = (input.reqDateFrom ?? "").trim();
  const to = (input.reqDateTo ?? "").trim();
  const nm = (input.userNm ?? "").trim();
  const addr = (input.address ?? "").trim();
  if (from) body.reqDateFrom = from;
  if (to) body.reqDateTo = to;
  if (nm) body.userNm = nm;
  if (addr) body.address = addr;
  return body;
}

/**
 * 오수 원인자부담금 관리 목록
 * POST `/api/admin/support/fee-payer/list`
 */
/**
 * 오수 원인자부담금 계산 버튼
 * POST `/api/admin/support/fee-payer/calculate`
 */
/**
 * 오수 원인자부담금 등록·수정·삭제 저장
 * POST `/api/admin/support/fee-payer`
 */
export async function postFeePayerRegister(
  body: SupportFeePayerRegisterRequest,
): Promise<SupportFeePayerRegisterResponse> {
  const payload: SupportFeePayerRegisterRequest = {
    ...body,
    basicInfo: applyFeePayerBasicInfoForApi(body.basicInfo),
  };
  try {
    const res = await apiClient.post<SupportFeePayerRegisterResponse>(
      API_ENDPOINTS.SUPPORT.FEE_PAYER_REGISTER,
      payload,
    );
    const code = String(res?.result ?? "").trim();
    if (code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "오수 원인자부담금 저장에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      "오수 원인자부담금 저장 요청 중 오류가 발생했습니다.",
    );
  }
}

export async function postFeePayerCalculate(
  body: SupportFeePayerRegisterRequest,
): Promise<SupportFeePayerCalculateResponse> {
  const payload: SupportFeePayerRegisterRequest = {
    ...body,
    basicInfo: applyFeePayerBasicInfoForApi(body.basicInfo),
  };
  try {
    const res = await apiClient.post<SupportFeePayerCalculateResponse>(
      API_ENDPOINTS.SUPPORT.FEE_PAYER_CALCULATE,
      payload,
    );
    const code = String(res?.result ?? "").trim();
    if (code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "오수 원인자부담금 계산에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      "오수 원인자부담금 계산 요청 중 오류가 발생했습니다.",
    );
  }
}

/**
 * 오수 원인자부담금 상세 (ITEM_ID)
 * GET `/api/admin/support/fee-payer/{itemId}/detail`
 */
export async function getFeePayerDetail(
  itemId: string,
): Promise<SupportFeePayerDetailEnvelope> {
  const id = itemId.trim();
  if (!id) {
    throw new ApiError(0, "ITEM_ID가 없습니다.");
  }
  try {
    const res = await apiClient.get<SupportFeePayerDetailEnvelope>(
      API_ENDPOINTS.SUPPORT.FEE_PAYER_DETAIL(id),
    );
    const code = String(res?.result ?? "").trim();
    if (code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "오수 원인자부담금 상세 조회에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      "오수 원인자부담금 상세를 불러오는 중 오류가 발생했습니다.",
    );
  }
}

export async function postFeePayerList(
  body?: SupportFeePayerListRequest | null,
): Promise<SupportFeePayerListResponse> {
  try {
    const res = await apiClient.post<SupportFeePayerListResponse>(
      API_ENDPOINTS.SUPPORT.FEE_PAYER_LIST,
      body ?? {},
    );
    if (res?.result && res.result !== "00") {
      throw new ApiError(
        0,
        res.message?.trim() || "오수 원인자부담금 목록 조회에 실패했습니다.",
        res,
      );
    }
    return res ?? { data: [] };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      "오수 원인자부담금 목록을 불러오는 중 오류가 발생했습니다.",
    );
  }
}
