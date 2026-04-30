/**
 * 오수 원인자부담금 목록·등록·상세·납부내역: 미납/납부 표시 스타일.
 * 목록 `paySta` 판정은 `isFeePayerListRowPaid`와 동일 코드 계열만 납부로 본다.
 */
function feePayRawStatusPaid(raw: string): boolean {
  const v = String(raw ?? "").trim();
  if (v === "02" || v === "2" || v === "Y" || v === "납부") return true;
  if (v.toUpperCase() === "PAID") return true;
  return false;
}

/** 테이블·모바일 카드·읽기 전용 상태 배지 (`SupportListPageView`와 동일 클래스 톤) */
export function feePayBadgeClassName(paid: boolean): string {
  return paid
    ? "font-medium bg-green-100 text-green-800"
    : "font-medium bg-red-100 text-red-800";
}

/** 편집 가능한 상태 `<select>` — 현재 값에 따른 배경·테두리 */
export function feePayStatusSelectClassName(status: string): string {
  return feePayRawStatusPaid(status)
    ? "border-green-200 bg-green-50 text-green-900 font-medium"
    : "border-red-200 bg-red-50 text-red-900 font-medium";
}

/**
 * 읽기 전용 상태 표시 — `FormSelect` + `feePayStatusSelectClassName`과 **동일 색·두께**로 필 칸을 꽉 채움.
 * (`FormField` 필드 셀이 `flex items-center`라 자식은 `flex-1 min-w-0` 래퍼로 가로를 먹여야 함.)
 */
export function feePayStatusReadOnlyFieldClassName(paid: boolean): string {
  const tint = feePayStatusSelectClassName(paid ? "PAID" : "UNPAID");
  return [
    "flex w-full min-h-[2.5rem] min-w-0 flex-1 items-center justify-start rounded-none border px-3 py-2 text-base",
    tint,
  ].join(" ");
}
