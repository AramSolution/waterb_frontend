/**
 * 오수 원인자부담금 목록·대시보드 등에서 쓰는 목록 행 타입.
 * `mapFeePayerListItemToSupport`가 API DTO를 이 형태로 맞춘다.
 */
export interface Support {
  rnum?: string;
  businessId?: string;
  businessNm?: string;
  userNm?: string;
  applicantNm?: string;
  itemId?: string;
  proId?: string;
  feeDetailSeq?: number | null;
  seq?: number | null;
  paySta?: string;
  addr?: string;
  address?: string;
  notifyDd?: string;
  reqDate?: string;
  recruitStartDate?: string;
  levyAmt?: number | null;
  waterCost?: number | null;
  payDd?: string;
  payDay?: string;
  payAmt?: number | null;
  waterPay?: number | null;
  pay?: number | null;
  [key: string]: unknown;
}
