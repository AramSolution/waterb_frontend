import type { SupportDrainageEquipDetailDataDto } from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import {
  formatPhoneWithHyphen,
  numericOnly,
} from "@/shared/lib/inputValidation";
import type { DrainageEquipDetailEntry } from "../model/useDrainageEquipDetailSection";
import {
  defaultPaidDetailDates,
  normalizeDrainageYmd,
} from "./drainageEquipDates";

export interface DrainageEquipBasicFormFromApi {
  itemId: string;
  userNm: string;
  telNo: string;
  zipCode: string;
  adres: string;
  detailAdres: string;
  detailEntries: DrainageEquipDetailEntry[];
}

function formatAmountInput(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return "0";
  return Math.round(Number(v)).toLocaleString("ko-KR");
}

function mapPayStaToStatus(paySta: string | null | undefined): "UNPAID" | "PAID" {
  const v = String(paySta ?? "").trim();
  if (v === "02" || v === "2" || v === "Y" || v === "납부") return "PAID";
  return "UNPAID";
}

/** GET `/{itemId}/detail` → 기본정보·등록분 폼 초기값 */
export function mapDrainageEquipDetailDtoToForm(
  data: SupportDrainageEquipDetailDataDto,
  fallbackItemId: string,
): DrainageEquipBasicFormFromApi {
  const itemId = String(data.itemId ?? fallbackItemId).trim() || fallbackItemId;
  const telRaw = String(data.usrTelno ?? "").trim();
  const telDigits = numericOnly(telRaw).slice(0, 11);
  const detailEntries = mapDrainageEquipDetailDtoToEntries(data);

  return {
    itemId,
    userNm: String(data.userNm ?? "").trim(),
    telNo:
      telDigits && telRaw !== "-" ? formatPhoneWithHyphen(telDigits) : "",
    zipCode: String(data.zip ?? "").trim(),
    adres: String(data.adres ?? "").trim(),
    detailAdres: String(data.detailAdres ?? "").trim(),
    detailEntries,
  };
}

export function mapDrainageEquipDetailDtoToEntries(
  data: SupportDrainageEquipDetailDataDto,
): DrainageEquipDetailEntry[] {
  const rows = Array.isArray(data.details) ? data.details : [];
  if (rows.length === 0) return [];

  return rows.map((row) => {
    const seqRaw = row.seq;
    const seq =
      seqRaw != null && Number.isFinite(Number(seqRaw))
        ? Math.trunc(Number(seqRaw))
        : undefined;
    const status = mapPayStaToStatus(row.paySta);
    const reqDate = normalizeDrainageYmd(row.reqDate);
    const paidDates =
      status === "PAID"
        ? defaultPaidDetailDates(reqDate, {
            startDate: String(row.startDate ?? ""),
            planDate: String(row.planDate ?? ""),
            compDate: String(row.compDate ?? ""),
          })
        : { startDate: "", planDate: "", compDate: "" };

    return {
      id: crypto.randomUUID(),
      status,
      reqDate,
      equipCost: formatAmountInput(row.equipCost),
      startDate: paidDates.startDate,
      planDate: paidDates.planDate,
      compDate: paidDates.compDate,
      agency: String(row.agency ?? "").trim(),
      detailSeq: seq,
    };
  });
}
