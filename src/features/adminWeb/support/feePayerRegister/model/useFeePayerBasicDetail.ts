import {
  type Support,
  isFeePayerListRowPaid,
} from "@/entities/adminWeb/support/api";
import type {
  SupportFeePayerDetailCalculationDto,
  SupportFeePayerDetailDataDto,
} from "@/entities/adminWeb/support/api/feePayerManageApi";
import {
  mapType1ToCategory,
  mapType2ToSewageTypeValue,
  SEWAGE_CATEGORY,
  SEWAGE_TYPE_VALUE,
} from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import { decodeDisplayText } from "@/shared/lib";
import {
  formatPhoneWithHyphen,
  numericOnly,
} from "@/shared/lib/inputValidation";
import type {
  SewageDetailLine,
  SewageEstimateEntry,
} from "./useFeePayerSewageVolumeEstimate";

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
      status: isFeePayerListRowPaid(row) ? "PAID" : "UNPAID",
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
          usage: "○○ 다중주택",
          buildingUseSubCode: "0102",
          midCategoryLabel: "주거시설",
          area: "84.9",
          dailySewage: "850",
          roomCount: "3",
          householdCount: "4",
          sewageQty: "",
          selected: false,
        },
      ],
    },
  ];
}

function formatIntKo(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

function formatMetricKo(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function normalizeReqDateYmd(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  if (t.length >= 10 && t[4] === "-" && t[7] === "-") return t.slice(0, 10);
  if (t.length === 8 && /^\d{8}$/.test(t)) {
    return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  }
  return t.slice(0, 10);
}

function numOrZero(v: unknown): number {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function mapCalculationDtoToLine(
  c: SupportFeePayerDetailCalculationDto,
): SewageDetailLine {
  const seq2 = c.seq2 != null ? Number(c.seq2) : NaN;
  const floorN = c.floor != null ? Number(c.floor) : NaN;
  const waterRaw = c.waterVol;
  const waterStr =
    waterRaw != null && String(waterRaw).trim() !== ""
      ? String(waterRaw).replace(/,/g, "").trim()
      : "";
  return {
    id: crypto.randomUUID(),
    floor: Number.isFinite(floorN) && floorN > 0 ? String(Math.trunc(floorN)) : "1",
    usage: "",
    buildingUseSubCode: String(c.buildId ?? "").trim(),
    midCategoryLabel: "",
    area:
      c.buildSize != null && String(c.buildSize).trim() !== ""
        ? String(c.buildSize).replace(/,/g, "").trim()
        : "",
    dailySewage:
      c.dayVal != null && String(c.dayVal).trim() !== ""
        ? String(c.dayVal).replace(/,/g, "").trim()
        : "",
    roomCount:
      c.roomCnt != null && String(c.roomCnt).trim() !== ""
        ? String(c.roomCnt).trim()
        : "",
    householdCount:
      c.homeCnt != null && String(c.homeCnt).trim() !== ""
        ? String(c.homeCnt).trim()
        : "",
    sewageQty: waterStr,
    selected: false,
    calcSeq2: Number.isFinite(seq2) && seq2 > 0 ? seq2 : undefined,
  };
}

export interface FeePayerDetailMappedInitial {
  itemId: string;
  basic: {
    applicantNm: string;
    telNo: string;
    zipCode: string;
    adres: string;
    detailAdres: string;
  };
  entries: SewageEstimateEntry[];
}

/**
 * `GET …/fee-payer/{itemId}/detail` 응답 `data` → 기본정보 폼 + 오수량 산정 엔트리
 */
export function mapFeePayerDetailDtoToInitialForm(
  data: SupportFeePayerDetailDataDto,
): FeePayerDetailMappedInitial {
  const itemId = String(data.itemId ?? "").trim();
  const nm = decodeDisplayText(String(data.userNm ?? "").trim());
  const rawTel = String(data.usrTelno ?? "").trim();
  const telDigits = numericOnly(rawTel).slice(0, 11);
  const telDisplay =
    rawTel === "-" || !telDigits
      ? ""
      : formatPhoneWithHyphen(telDigits);
  const zipCode = String(data.zip ?? "").trim();
  const road = String(data.adres ?? "").trim();
  const lot = String(data.adresLot ?? "").trim();
  const adres = road || lot;
  const detailAdres = String(data.detailAdres ?? "").trim();

  const blocks = [...(data.details ?? [])].sort(
    (a, b) => numOrZero(a.seq) - numOrZero(b.seq),
  );

  const entries: SewageEstimateEntry[] = blocks.map((block) => {
    const seq = block.seq != null ? Number(block.seq) : NaN;
    const payStaRaw = String(block.paySta ?? "").trim();
    const status =
      payStaRaw === "02" ||
      payStaRaw === "2" ||
      payStaRaw === "Y" ||
      payStaRaw === "납부"
        ? "PAID"
        : "UNPAID";

    const type1 = String(block.type1 ?? "").trim();
    const type2 = String(block.type2 ?? "").trim();
    const category = mapType1ToCategory(type1) || SEWAGE_CATEGORY.INDIVIDUAL;
    const type =
      mapType2ToSewageTypeValue(type1, type2) || SEWAGE_TYPE_VALUE.INDIVIDUAL_NEW;

    const baseCostN = numOrZero(block.baseCost);
    const unitPrice =
      baseCostN > 0 ? formatIntKo(Math.round(baseCostN)) : "";

    const wc = block.waterCost != null ? Number(block.waterCost) : NaN;
    const causerCharge =
      Number.isFinite(wc) && wc !== 0 ? `${formatIntKo(Math.round(wc))}원` : "";

    const wv = block.waterVal != null ? Number(block.waterVal) : NaN;
    const sewageLevyAmount =
      Number.isFinite(wv) && wv !== 0 ? formatMetricKo(wv) : "";

    const ws = block.waterSum != null ? Number(block.waterSum) : NaN;
    const sewageVolume =
      Number.isFinite(ws) && ws !== 0 ? formatMetricKo(ws) : "";

    const calcs = [...(block.calculations ?? [])].sort(
      (a, b) => numOrZero(a.seq2) - numOrZero(b.seq2),
    );
    const lines: SewageDetailLine[] =
      calcs.length > 0
        ? calcs.map(mapCalculationDtoToLine)
        : [
            {
              id: crypto.randomUUID(),
              floor: "1",
              usage: "",
              buildingUseSubCode: "",
              midCategoryLabel: "",
              area: "",
              dailySewage: "",
              roomCount: "",
              householdCount: "",
              sewageQty: "",
              selected: false,
            },
          ];

    return {
      id: crypto.randomUUID(),
      status,
      category,
      type,
      notifyDate: normalizeReqDateYmd(block.reqDate) || "",
      unitPrice,
      sewageVolume,
      causerCharge,
      sewageLevyAmount,
      lines,
      detailSeq: Number.isFinite(seq) && seq > 0 ? seq : undefined,
    };
  });

  return {
    itemId: itemId || "",
    basic: {
      applicantNm: nm,
      telNo: telDisplay,
      zipCode,
      adres,
      detailAdres,
    },
    entries,
  };
}
