import type {
  SupportDrainageEquipPaymentDetailDataDto,
  SupportDrainageEquipPaymentDetailItemDto,
  SupportDrainageEquipPaymentHistoryDto,
} from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import { decodeDisplayText } from "@/shared/lib";
import {
  formatPhoneWithHyphen,
  numericOnly,
} from "@/shared/lib/inputValidation";
import { normalizeDrainageYmd } from "./drainageEquipDates";

export type DrainageEquipPaymentLine = {
  id: string;
  paymentSeq2?: number;
  lineDate: string;
  amount: string;
  remarks: string;
};

export type DrainageEquipPaymentEntry = {
  id: string;
  detailSeq?: number;
  status: "UNPAID" | "PAID";
  reqDate: string;
  equipCost: string;
  equipPay: string;
  lines: DrainageEquipPaymentLine[];
};

export interface DrainageEquipPaymentBasicForm {
  userNm: string;
  telNo: string;
  zipCode: string;
  adres: string;
  detailAdres: string;
  entries: DrainageEquipPaymentEntry[];
}

function mapPayStaToStatus(
  paySta: string | null | undefined,
): "UNPAID" | "PAID" {
  const v = String(paySta ?? "").trim();
  if (v === "02" || v === "2" || v === "Y" || v === "납부") return "PAID";
  return "UNPAID";
}

function formatAmountInput(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "";
  const n = Math.round(Number(v));
  if (n === 0) return "";
  return n.toLocaleString("ko-KR");
}

function mapPaymentLine(
  p: SupportDrainageEquipPaymentHistoryDto,
): DrainageEquipPaymentLine {
  const seq2N = p.seq2 != null ? Number(p.seq2) : NaN;
  const pay = p.pay != null ? Number(p.pay) : NaN;
  return {
    id: crypto.randomUUID(),
    paymentSeq2: seq2N > 0 ? seq2N : undefined,
    lineDate: normalizeDrainageYmd(p.payDay) || getTodayYmd(),
    amount: Number.isFinite(pay) && pay !== 0 ? formatAmountInput(pay) : "",
    remarks: decodeDisplayText(String(p.payDesc ?? "").trim()),
  };
}

function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function mapPaymentDetailToEntry(
  d: SupportDrainageEquipPaymentDetailItemDto,
): DrainageEquipPaymentEntry {
  const seqN = d.seq != null ? Number(d.seq) : NaN;
  const equipCostN = d.equipCost != null ? Number(d.equipCost) : NaN;
  const equipPayN = d.equipPay != null ? Number(d.equipPay) : NaN;

  const linesRaw = [...(d.payments ?? [])].sort(
    (a, b) => Number(a.seq2 ?? 0) - Number(b.seq2 ?? 0),
  );
  const lines =
    linesRaw.length > 0
      ? linesRaw.map(mapPaymentLine)
      : [{ id: crypto.randomUUID(), lineDate: getTodayYmd(), amount: "", remarks: "" }];

  return {
    id: crypto.randomUUID(),
    detailSeq: seqN > 0 ? seqN : undefined,
    status: mapPayStaToStatus(d.paySta),
    reqDate: normalizeDrainageYmd(d.reqDate),
    equipCost:
      Number.isFinite(equipCostN) && equipCostN !== 0
        ? formatAmountInput(equipCostN)
        : "0",
    equipPay:
      Number.isFinite(equipPayN) && equipPayN !== 0
        ? formatAmountInput(equipPayN)
        : "",
    lines,
  };
}

export function mapDrainageEquipPaymentDetailToForm(
  data: SupportDrainageEquipPaymentDetailDataDto,
): DrainageEquipPaymentBasicForm {
  const nm = decodeDisplayText(String(data.userNm ?? "").trim());
  const rawTel = String(data.usrTelno ?? "").trim();
  const telDigits = numericOnly(rawTel).slice(0, 11);
  const telDisplay =
    rawTel === "-" || !telDigits ? "" : formatPhoneWithHyphen(telDigits);

  const zip = String(data.zip ?? "").trim();
  const road = decodeDisplayText(String(data.adres ?? "").trim());
  const lot = decodeDisplayText(String(data.adresLot ?? "").trim());
  const adres = [lot, road].filter(Boolean).join(" ").trim() || road;
  const detailAdres = decodeDisplayText(String(data.detailAdres ?? "").trim());

  const entries = (data.details ?? []).map(mapPaymentDetailToEntry);

  return {
    userNm: nm,
    telNo: telDisplay,
    zipCode: zip,
    adres,
    detailAdres,
    entries,
  };
}
