import { formatIntKo } from "@/features/adminWeb/support/feePayerRegister/lib/feePayerNumericFormat";

/** 납부내역 금액 — API·합산용(콤마 제거) */
export function parsePaymentAmount(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[^\d.-]/g, "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

/** 납부 행·납부금액 입력/표시 — 빈 값은 `0`, 천 단위 콤마 */
export function formatPaymentAmountInput(raw: string): string {
  return formatIntKo(parsePaymentAmount(raw));
}

export function formatPaymentAmountFromNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return formatIntKo(Math.max(0, Math.trunc(n)));
}
