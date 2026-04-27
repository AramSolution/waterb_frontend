import type { Support } from "@/entities/adminWeb/support/api";

/** 화면 확인용 임시 목록 (Support 확장 — feeListRowFields·납부내역과 동일 키) */
export const FEE_LIST_MOCK: Support[] = [
  {
    businessId: "FEE-2026-001",
    rnum: "1",
    applicantNm: "김오수",
    telNo: "010-2345-6789",
    addr: "전북특별자치도 군산시 미원대로 123 (나운동, 행복주택)",
    notifyDd: "2026-01-15",
    levyAmt: 128500,
    paySta: "01",
    payDd: "",
    payAmt: "",
  },
  {
    businessId: "FEE-2026-002",
    rnum: "2",
    applicantNm: "이납부",
    telNo: "010-1111-2222",
    addr: "전북 군산시 해망로 45",
    notifyDd: "2026-02-01",
    levyAmt: 95000,
    paySta: "02",
    payDd: "2026-02-20",
    payAmt: 95000,
  },
  {
    businessId: "FEE-2026-003",
    rnum: "3",
    applicantNm: "박미납",
    telNo: "063-123-4567",
    addr: "군산시 조촌로 7길 12",
    notifyDd: "2026-03-10",
    levyAmt: 210000,
    paySta: "01",
    payDd: "",
    payAmt: "",
  },
  {
    businessId: "FEE-2026-004",
    rnum: "4",
    applicantNm: "최부분",
    telNo: "010-9999-0000",
    addr: "군산시 나운동 200번지 일대",
    notifyDd: "2026-03-22",
    levyAmt: 77500,
    paySta: "Y",
    payDd: "2026-04-01",
    payAmt: 50000,
  },
  {
    businessId: "FEE-2026-005",
    rnum: "5",
    applicantNm: "정오수",
    telNo: "010-3456-7890",
    addr: "전라북도 군산시 소룡동 산업단지로 88",
    notifyDd: "2026-04-05",
    levyAmt: 340000,
    paySta: "01",
    payDd: "",
    payAmt: undefined,
  },
  {
    businessId: "FEE-2026-006",
    rnum: "6",
    applicantNm: "한테스트",
    telNo: "02-2123-4567",
    addr: "군산시 미장동",
    notifyDd: "2025-12-28",
    levyAmt: 15000,
    paySta: "납부",
    payDd: "2026-01-02",
    payAmt: 15000,
  },
];

/**
 * `proId`는 `businessId`(목 기준)와 동일하게 취급. 백엔드 연동 시 상세·납부내역 API 키에 맞게 조정.
 */
export function getFeeListRowByBusinessId(
  proId: string | null,
): Support | undefined {
  if (!proId || !proId.trim()) return undefined;
  const id = proId.trim();
  return FEE_LIST_MOCK.find(
    (r) =>
      (r.businessId && r.businessId === id) ||
      (r.proId && r.proId === id),
  );
}
