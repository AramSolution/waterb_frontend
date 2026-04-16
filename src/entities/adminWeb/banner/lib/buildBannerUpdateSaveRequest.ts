import type { BannerDetailDataResponse } from "../api/bannerApi";

/** 상세 수정 폼에서 쓰는 필드만 (레이어 순환 방지) */
export interface BannerUpdateFormFields {
  postStartDttm: string;
  postEndDttm: string;
  title: string;
  content: string;
  sortOrder: string;
  useYn: string;
}

/**
 * 배너 폼의 날짜값(`YYYY-MM-DD`)을 백엔드 저장 포맷(`YYYY-MM-DD HH:mm`)으로 변환.
 * - 시작일: 00:00
 * - 종료일: 23:59
 */
export function dateOnlyToBannerSaveDt(
  dateOnly: string,
  boundary: "start" | "end",
): string {
  const base = dateOnly?.trim();
  if (!base) return "";
  const hhmm = boundary === "start" ? "00:00" : "23:59";
  return `${base} ${hhmm}`;
}

function getAdminUniqIdFromSession(): string {
  if (typeof window === "undefined") return "";
  try {
    const userStr = sessionStorage.getItem("user");
    if (!userStr) return "";
    const user = JSON.parse(userStr) as {
      uniqId?: string;
      uniq_id?: string;
    };
    return user?.uniqId || user?.uniq_id || "";
  } catch {
    return "";
  }
}

export interface BuildBannerUpdateOptions {
  imageRemoved: boolean;
  hasNewImageFile: boolean;
}

/**
 * 등록·상세 수정 공통 고정값 (BannerSaveRequest: banrGb, linkGb, linkUrl).
 * GET 상세 응답과 무관하게 저장 시 항상 동일하게 전달.
 */
export const BANNER_REGISTRATION_FIXED = {
  banrGb: "P",
  linkGb: "000",
  linkUrl: "",
} as const;

/**
 * PUT `data` 파트용 JSON — 서버에서 fileCd/imgUrl 비어 있으면 기존 행으로 보정.
 * 시작/종료는 폼 `postStartDttm`·`postEndDttm` → `startDt`·`endDt`(서버 getStartDttm/getEndDttm).
 */
export function buildBannerUpdateSaveRequest(
  _detail: BannerDetailDataResponse,
  form: BannerUpdateFormFields,
  opts: BuildBannerUpdateOptions,
): Record<string, unknown> {
  const order = Number.parseInt(form.sortOrder, 10);
  return {
    ...BANNER_REGISTRATION_FIXED,
    title: form.title.trim(),
    body: form.content ?? "",
    startDt: dateOnlyToBannerSaveDt(form.postStartDttm, "start"),
    endDt: dateOnlyToBannerSaveDt(form.postEndDttm, "end"),
    orderBy: Number.isFinite(order) ? order : 0,
    statCode: form.useYn === "Y" ? "A" : "N",
    UNIQ_ID: getAdminUniqIdFromSession(),
    removeImage: opts.imageRemoved && !opts.hasNewImageFile,
  };
}

/**
 * POST 등록 `data` 파트 — banrCd는 서버에서 채번.
 * 시작/종료는 `startDt`·`endDt`(공백 구분)로 전달 → 서버 getStartDttm/getEndDttm로 DB 일시 생성.
 */
export function buildBannerInsertSaveRequest(
  form: BannerUpdateFormFields,
): Record<string, unknown> {
  const order = Number.parseInt(form.sortOrder, 10);
  return {
    ...BANNER_REGISTRATION_FIXED,
    title: form.title.trim(),
    body: form.content ?? "",
    startDt: dateOnlyToBannerSaveDt(form.postStartDttm, "start"),
    endDt: dateOnlyToBannerSaveDt(form.postEndDttm, "end"),
    orderBy: Number.isFinite(order) ? order : 0,
    statCode: form.useYn === "Y" ? "A" : "N",
    UNIQ_ID: getAdminUniqIdFromSession(),
  };
}
