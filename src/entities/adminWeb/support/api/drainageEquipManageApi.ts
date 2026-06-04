import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";
import { numericOnly } from "@/shared/lib/inputValidation";
import {
  formatFeePayerAddressLine,
  isFeePayerListRowPaid,
} from "./feePayerManageApi";

export { formatFeePayerAddressLine, isFeePayerListRowPaid };

/** `SupportDrainageEquipListRequest` */
export interface SupportDrainageEquipListRequest {
  reqDateFrom?: string;
  reqDateTo?: string;
  userNm?: string;
  address?: string;
  /** `01` 미납, `02` 완납. 생략·`00` = 전체 */
  paySta?: string;
  startIndex?: number;
  lengthPage?: number;
  start?: number;
  length?: number;
}

/** 목록 1건 — `SupportDrainageEquipListItemResponse` */
export interface SupportDrainageEquipListItemDto {
  itemId?: string;
  seq?: number | null;
  paySta?: string;
  reqDate?: string;
  userNm?: string;
  zip?: string;
  adresLot?: string;
  adres?: string;
  detailAdres?: string;
  equipCost?: number | null;
  equipPay?: number | null;
  payDay?: string | null;
  pay?: number | null;
}

export interface SupportDrainageEquipListResponse {
  result?: string;
  message?: string;
  recordsFiltered?: number;
  recordsTotal?: number;
  data?: SupportDrainageEquipListItemDto[];
}

/** 배수설비 관리 목록 엑셀 API 응답 */
export interface SupportDrainageEquipExcelListResponse {
  result?: string;
  message?: string;
  data?: SupportDrainageEquipListItemDto[];
}

export interface SupportDrainageEquipDeleteRequest {
  itemId: string;
  seq: number;
}

export interface SupportDrainageEquipDeleteResponse {
  result?: string;
  message?: string;
  itemId?: string | null;
  seq?: number | null;
}

/** `SupportDrainageEquipBasicInfoRequest` */
export interface SupportDrainageEquipBasicInfoRequest {
  userNm: string;
  zip?: string;
  adresLot?: string;
  adres: string;
  detailAdres?: string;
  usrTelno?: string;
}

/**
 * 백엔드 `SupportDrainageEquipBasicInfoRequest`의 `@NotBlank usrTelno` 호환:
 * 미입력 시 요청 본문에만 대체값을 넣는다(화면 상태는 그대로).
 */
export function applyDrainageEquipBasicInfoForApi(
  b: SupportDrainageEquipBasicInfoRequest,
): SupportDrainageEquipBasicInfoRequest {
  const digits = numericOnly(String(b.usrTelno ?? ""));
  return {
    ...b,
    usrTelno: digits.length >= 9 ? digits : "-",
  };
}

/** `SupportDrainageEquipDetailRequest` */
export interface SupportDrainageEquipDetailRequest {
  rowStatus?: string;
  seq?: number;
  paySta?: string;
  reqDate?: string;
  startDate?: string;
  planDate?: string;
  compDate?: string;
  agency?: string;
  equipCost?: number;
  equipPay?: number;
}

/** `SupportDrainageEquipRegisterRequest` */
export interface SupportDrainageEquipRegisterRequest {
  itemId?: string;
  basicInfo: SupportDrainageEquipBasicInfoRequest;
  details: SupportDrainageEquipDetailRequest[];
}

export interface SupportDrainageEquipRegisterResponse {
  result?: string;
  message?: string;
  itemId?: string | null;
}

export interface SupportDrainageEquipDetailItemDto {
  seq?: number | null;
  paySta?: string | null;
  reqDate?: string | null;
  startDate?: string | null;
  planDate?: string | null;
  compDate?: string | null;
  agency?: string | null;
  equipCost?: number | null;
  equipPay?: number | null;
}

export interface SupportDrainageEquipDetailDataDto {
  itemId?: string | null;
  userNm?: string | null;
  zip?: string | null;
  adresLot?: string | null;
  adres?: string | null;
  detailAdres?: string | null;
  usrTelno?: string | null;
  details?: SupportDrainageEquipDetailItemDto[];
}

export interface SupportDrainageEquipDetailEnvelope {
  result?: string;
  message?: string;
  data?: SupportDrainageEquipDetailDataDto | null;
}

/** `SupportDrainageEquipPaymentHistoryResponse` */
export interface SupportDrainageEquipPaymentHistoryDto {
  seq2?: number | null;
  payDay?: string | null;
  pay?: number | null;
  payDesc?: string | null;
}

/** `SupportDrainageEquipPaymentDetailItemResponse` */
export interface SupportDrainageEquipPaymentDetailItemDto {
  seq?: number | null;
  paySta?: string | null;
  reqDate?: string | null;
  startDate?: string | null;
  planDate?: string | null;
  compDate?: string | null;
  agency?: string | null;
  equipCost?: number | null;
  equipPay?: number | null;
  payments?: SupportDrainageEquipPaymentHistoryDto[];
}

/** `SupportDrainageEquipPaymentDetailDataResponse` */
export interface SupportDrainageEquipPaymentDetailDataDto {
  itemId?: string | null;
  userNm?: string | null;
  zip?: string | null;
  adresLot?: string | null;
  adres?: string | null;
  detailAdres?: string | null;
  usrTelno?: string | null;
  details?: SupportDrainageEquipPaymentDetailItemDto[];
}

export interface SupportDrainageEquipPaymentDetailEnvelope {
  result?: string;
  message?: string;
  data?: SupportDrainageEquipPaymentDetailDataDto | null;
}

/** `SupportDrainageEquipPaymentRequest` */
export interface SupportDrainageEquipPaymentSaveItemRequest {
  rowStatus?: string;
  seq2?: number;
  payDay?: string;
  pay?: number;
  payDesc?: string;
}

/** `SupportDrainageEquipPaymentDetailSaveRequest` */
export interface SupportDrainageEquipPaymentDetailSaveRequest {
  seq: number;
  paySta?: string;
  payments?: SupportDrainageEquipPaymentSaveItemRequest[];
}

/** `SupportDrainageEquipPaymentSaveRequest` */
export interface SupportDrainageEquipPaymentSaveRequest {
  itemId: string;
  details: SupportDrainageEquipPaymentDetailSaveRequest[];
}

export interface SupportDrainageEquipPaymentSaveResponse {
  result?: string;
  message?: string;
  itemId?: string | null;
  seq?: number | null;
}

export interface SupportDrainageEquipPaymentDeleteRequest {
  itemId: string;
  seq: number;
  seq2: number;
}

/** 목록 UI 행 */
export interface DrainageEquipListRow {
  itemId: string;
  seq: number | null;
  paySta?: string;
  reqDate?: string;
  userNm?: string;
  addr: string;
  equipCost?: number;
  equipPay?: number;
  payDay?: string;
  payAmt?: number;
}

export function buildSupportDrainageEquipListBody(input: {
  reqDateFrom?: string;
  reqDateTo?: string;
  userNm?: string;
  address?: string;
  paySta?: string;
  startIndex?: number;
  lengthPage?: number;
}): SupportDrainageEquipListRequest {
  const body: SupportDrainageEquipListRequest = {};
  const from = (input.reqDateFrom ?? "").trim();
  const to = (input.reqDateTo ?? "").trim();
  const nm = (input.userNm ?? "").trim();
  const addr = (input.address ?? "").trim();
  const sta = (input.paySta ?? "").trim();
  if (from) body.reqDateFrom = from;
  if (to) body.reqDateTo = to;
  if (nm) body.userNm = nm;
  if (addr) body.address = addr;
  if (sta === "01" || sta === "02") body.paySta = sta;
  if (input.startIndex != null && input.startIndex >= 0) {
    body.startIndex = input.startIndex;
    body.start = input.startIndex;
  }
  if (input.lengthPage != null && input.lengthPage > 0) {
    body.lengthPage = input.lengthPage;
    body.length = input.lengthPage;
  }
  return body;
}

export function mapDrainageEquipListItem(
  item: SupportDrainageEquipListItemDto,
): DrainageEquipListRow {
  const itemId = String(item.itemId ?? "").trim();
  const seqRaw = item.seq;
  const seq =
    seqRaw != null && Number.isFinite(Number(seqRaw))
      ? Math.trunc(Number(seqRaw))
      : null;
  const equipCostN =
    item.equipCost != null ? Number(item.equipCost) : undefined;
  const equipCost =
    equipCostN !== undefined && !Number.isNaN(equipCostN)
      ? equipCostN
      : undefined;
  /** 목록 납부액 = DB `EQUIP_PAY`(납부내역 합계) 우선, 없으면 최신 1건 `pay` */
  const equipPayN = item.equipPay != null ? Number(item.equipPay) : undefined;
  const payN = item.pay != null ? Number(item.pay) : undefined;
  const payAmt =
    equipPayN !== undefined && !Number.isNaN(equipPayN)
      ? equipPayN
      : payN !== undefined && !Number.isNaN(payN)
        ? payN
        : undefined;

  return {
    itemId,
    seq,
    paySta: item.paySta,
    reqDate: item.reqDate,
    userNm: item.userNm,
    addr: formatFeePayerAddressLine(item),
    equipCost,
    equipPay:
      equipPayN !== undefined && !Number.isNaN(equipPayN)
        ? equipPayN
        : undefined,
    payDay: item.payDay != null ? String(item.payDay).trim() : "",
    payAmt,
  };
}

export function isDrainageEquipListRowPaid(row: DrainageEquipListRow): boolean {
  return isFeePayerListRowPaid(row as { paySta?: string });
}

/**
 * 배수설비 관리 목록
 * POST `/api/admin/support/drainage-equip/list`
 */
export async function postDrainageEquipList(
  body?: SupportDrainageEquipListRequest | null,
): Promise<SupportDrainageEquipListResponse> {
  try {
    const res = await apiClient.post<SupportDrainageEquipListResponse>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_LIST,
      body ?? {},
    );
    if (res?.result && res.result !== "00") {
      throw new ApiError(
        0,
        res.message?.trim() || "배수설비 관리 목록 조회에 실패했습니다.",
        res,
      );
    }
    return res ?? { data: [] };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      "배수설비 관리 목록을 불러오는 중 오류가 발생했습니다.",
    );
  }
}

/**
 * 배수설비 관리 목록 엑셀
 * POST `/api/admin/support/drainage-equip/excel-list`
 */
export async function postDrainageEquipExcelList(
  body?: SupportDrainageEquipListRequest | null,
): Promise<SupportDrainageEquipExcelListResponse> {
  try {
    const res = await apiClient.post<SupportDrainageEquipExcelListResponse>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_EXCEL_LIST,
      body ?? {},
    );
    if (res?.result && res.result !== "00") {
      throw new ApiError(
        0,
        res.message?.trim() || "배수설비 관리 엑셀 목록 조회에 실패했습니다.",
        res,
      );
    }
    return res ?? { data: [] };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      "배수설비 관리 엑셀 목록을 불러오는 중 오류가 발생했습니다.",
    );
  }
}

/**
 * 배수설비 등록·수정
 * POST `/api/admin/support/drainage-equip`
 */
export async function postDrainageEquipRegister(
  body: SupportDrainageEquipRegisterRequest,
): Promise<SupportDrainageEquipRegisterResponse> {
  const payload: SupportDrainageEquipRegisterRequest = {
    ...body,
    basicInfo: applyDrainageEquipBasicInfoForApi(body.basicInfo),
  };
  try {
    const res = await apiClient.post<SupportDrainageEquipRegisterResponse>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_REGISTER,
      payload,
    );
    const code = String(res?.result ?? "").trim();
    if (code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "배수설비 저장에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "배수설비 저장 요청 중 오류가 발생했습니다.");
  }
}

/**
 * 배수설비 상세 (ITEM_ID) — 기본정보
 * GET `/api/admin/support/drainage-equip/{itemId}/detail`
 */
export async function getDrainageEquipDetail(
  itemId: string,
): Promise<SupportDrainageEquipDetailEnvelope> {
  const id = itemId.trim();
  if (!id) {
    throw new ApiError(0, "ITEM_ID가 없습니다.");
  }
  try {
    const res = await apiClient.get<SupportDrainageEquipDetailEnvelope>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_DETAIL(id),
    );
    const code = String(res?.result ?? "").trim();
    if (code && code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "배수설비 상세 조회에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "배수설비 상세 조회 중 오류가 발생했습니다.");
  }
}

/**
 * 배수설비 목록 삭제 (미납만 허용)
 * DELETE `/api/admin/support/drainage-equip/delete`
 */
export async function deleteDrainageEquipDetail(
  body: SupportDrainageEquipDeleteRequest,
): Promise<SupportDrainageEquipDeleteResponse> {
  const itemId = String(body.itemId ?? "").trim();
  const seq = Number(body.seq);
  if (!itemId) {
    throw new ApiError(0, "ITEM_ID가 없습니다.");
  }
  if (!Number.isFinite(seq) || seq <= 0) {
    throw new ApiError(0, "SEQ가 올바르지 않습니다.");
  }
  const payload: SupportDrainageEquipDeleteRequest = {
    itemId,
    seq: Math.trunc(seq),
  };
  try {
    const res = await apiClient.delete<SupportDrainageEquipDeleteResponse>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_DELETE,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const code = String(res?.result ?? "").trim();
    if (code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "배수설비 삭제에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "배수설비 삭제 요청 중 오류가 발생했습니다.");
  }
}

/**
 * 배수설비 납부내역 상세 (ITEM_ID)
 * GET `/api/admin/support/drainage-equip/{itemId}/payment-detail`
 */
export async function getDrainageEquipPaymentDetail(
  itemId: string,
): Promise<SupportDrainageEquipPaymentDetailEnvelope> {
  const id = itemId.trim();
  if (!id) {
    throw new ApiError(0, "ITEM_ID가 없습니다.");
  }
  try {
    const res = await apiClient.get<SupportDrainageEquipPaymentDetailEnvelope>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_PAYMENT_DETAIL(id),
    );
    const code = String(res?.result ?? "").trim();
    if (code && code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "배수설비 납부 상세 조회에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "배수설비 납부 상세를 불러오는 중 오류가 발생했습니다.");
  }
}

/**
 * 배수설비 납부내역 저장
 * POST `/api/admin/support/drainage-equip/payment`
 */
export async function postDrainageEquipPaymentSave(
  body: SupportDrainageEquipPaymentSaveRequest,
): Promise<SupportDrainageEquipPaymentSaveResponse> {
  const itemId = body.itemId?.trim();
  if (!itemId) throw new ApiError(0, "ITEM_ID가 없습니다.");
  try {
    const res = await apiClient.post<SupportDrainageEquipPaymentSaveResponse>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_PAYMENT_SAVE,
      body,
    );
    const code = String(res?.result ?? "").trim();
    if (code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "배수설비 납부내역 저장에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      "배수설비 납부내역 저장 요청 중 오류가 발생했습니다.",
    );
  }
}

/**
 * 배수설비 납부내역 1건 삭제 (ARTEQUP)
 * DELETE `/api/admin/support/drainage-equip/payment/delete`
 */
export async function deleteDrainageEquipPayment(
  body: SupportDrainageEquipPaymentDeleteRequest,
): Promise<SupportDrainageEquipDeleteResponse> {
  const itemId = String(body.itemId ?? "").trim();
  const seq = Number(body.seq);
  const seq2 = Number(body.seq2);
  if (!itemId) throw new ApiError(0, "ITEM_ID가 없습니다.");
  if (!Number.isFinite(seq) || seq <= 0) {
    throw new ApiError(0, "SEQ가 올바르지 않습니다.");
  }
  if (!Number.isFinite(seq2) || seq2 <= 0) {
    throw new ApiError(0, "SEQ2가 올바르지 않습니다.");
  }
  const payload: SupportDrainageEquipPaymentDeleteRequest = {
    itemId,
    seq: Math.trunc(seq),
    seq2: Math.trunc(seq2),
  };
  try {
    const res = await apiClient.delete<SupportDrainageEquipDeleteResponse>(
      API_ENDPOINTS.SUPPORT.DRAINAGE_EQUIP_PAYMENT_DELETE,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const code = String(res?.result ?? "").trim();
    if (code !== "00") {
      throw new ApiError(
        0,
        String(res?.message ?? "").trim() ||
          "배수설비 납부내역 삭제에 실패했습니다.",
        res,
      );
    }
    return res ?? {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "배수설비 납부내역 삭제 요청 중 오류가 발생했습니다.");
  }
}
