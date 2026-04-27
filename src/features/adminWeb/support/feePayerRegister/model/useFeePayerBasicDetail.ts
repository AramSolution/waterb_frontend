import type { Support } from "@/entities/adminWeb/support/api";
import {
  SEWAGE_CATEGORY,
  SEWAGE_TYPE_VALUE,
} from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import { decodeDisplayText } from "@/shared/lib";
import type { SewageEstimateEntry } from "./useFeePayerSewageVolumeEstimate";

/** `addr` 한 덩어리 → 등록·상세·납부내역과 동일 3필드(선행 5자리 우편번호가 있을 때만 분리) */
function splitAddrForReadonly(addr: string): {
  zip: string;
  road: string;
  detail: string;
} {
  const t = (addr || "").trim();
  if (!t) return { zip: "", road: "", detail: "" };
  const m = t.match(/^(\d{5})\s+(.+)$/);
  if (m) {
    return { zip: m[1], road: m[2], detail: "" };
  }
  return { zip: "", road: t, detail: "" };
}

function feeRowPaid(row: Support): boolean {
  const rowAny = row as Record<string, unknown>;
  const v = String(
    rowAny.paySta ?? rowAny.paymentSta ?? rowAny.feePayYn ?? "",
  ).trim();
  if (v === "02" || v === "2" || v === "Y" || v === "납부") return true;
  return false;
}

/** 목 행 → 기본정보 폼 초기값 (등록 화면과 동일 필드) */
export function getFeePayerBasicSeedFromSupportRow(row: Support): {
  applicantNm: string;
  telNo: string;
  zipCode: string;
  adres: string;
  detailAdres: string;
} {
  const rowAny = row as Record<string, unknown>;
  const name = decodeDisplayText(
    String(rowAny.applicantNm ?? row.businessNm ?? ""),
  );
  const tel = decodeDisplayText(String(rowAny.telNo ?? rowAny.mbtlnum ?? ""));
  const raw = decodeDisplayText(
    String(rowAny.addr ?? rowAny.address ?? ""),
  );
  const s = splitAddrForReadonly(raw);
  return {
    applicantNm: name,
    telNo: tel,
    zipCode: s.zip,
    adres: s.road,
    detailAdres: s.detail,
  };
}

/** 목·상세 API 연동 전: 목 행으로 오수량 산정 블록 1건 스냅샷 구성 */
export function buildSewageEstimateEntriesFromFeeRow(
  row: Support,
): SewageEstimateEntry[] {
  const rowAny = row as Record<string, unknown>;
  const bid = String(row.businessId ?? row.proId ?? "fee");
  const notifyRaw = String(
    rowAny.notifyDd ?? row.recruitStartDate ?? "",
  ).trim();
  let notifyDate = "";
  if (notifyRaw.length === 8 && /^\d{8}$/.test(notifyRaw)) {
    notifyDate = `${notifyRaw.slice(0, 4)}-${notifyRaw.slice(4, 6)}-${notifyRaw.slice(6, 8)}`;
  } else if (notifyRaw.length >= 10) {
    notifyDate = notifyRaw.slice(0, 10);
  }

  const levyRaw = rowAny.levyAmt ?? rowAny.impAmt;
  const n = Number(String(levyRaw ?? "").replace(/,/g, ""));
  const causerCharge =
    Number.isFinite(n) && n > 0 ? `${n.toLocaleString("ko-KR")}원` : "";
  const levyRounded =
    Number.isFinite(n) && n > 0 ? String(Math.max(0, Math.round(n))) : "";

  const lineId = `line-${bid}`;
  return [
    {
      id: `entry-${bid}`,
      status: feeRowPaid(row) ? "PAID" : "UNPAID",
      category: SEWAGE_CATEGORY.INDIVIDUAL,
      type: SEWAGE_TYPE_VALUE.INDIVIDUAL_NEW,
      notifyDate: notifyDate || "2026-01-01",
      unitPrice: "12,000",
      sewageVolume: "10",
      causerCharge,
      sewageLevyAmount: levyRounded,
      lines: [
        {
          id: lineId,
          floor: "3",
          usage: "공동주택",
          area: "84.9",
          dailySewage: "850",
          selected: false,
        },
      ],
    },
  ];
}
