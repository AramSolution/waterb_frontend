import type {
  SupportDrainageEquipBasicInfoRequest,
  SupportDrainageEquipDetailRequest,
  SupportDrainageEquipRegisterRequest,
} from "@/entities/adminWeb/support/api/drainageEquipManageApi";
import type { DrainageEquipDetailEntry } from "../model/useDrainageEquipDetailSection";

function parseNumericInput(raw: string): number | undefined {
  const t = String(raw ?? "").replace(/,/g, "").trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeText(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

function mapStatusToPaySta(status: DrainageEquipDetailEntry["status"]): string {
  return status === "PAID" ? "02" : "01";
}

function mapEntryToDetail(
  entry: DrainageEquipDetailEntry,
): SupportDrainageEquipDetailRequest | null {
  const reqDate = normalizeText(entry.reqDate);
  if (!reqDate) return null;

  const equipCostRaw = parseNumericInput(entry.equipCost);
  const equipCost =
    equipCostRaw !== undefined && Number.isFinite(equipCostRaw)
      ? Math.round(equipCostRaw)
      : 0;

  const hasSeq = entry.detailSeq != null && entry.detailSeq > 0;
  const paid = entry.status === "PAID";

  return {
    rowStatus: hasSeq ? "U" : "I",
    ...(hasSeq ? { seq: entry.detailSeq } : {}),
    paySta: mapStatusToPaySta(entry.status),
    reqDate,
    equipCost,
    startDate: paid ? normalizeText(entry.startDate) || undefined : undefined,
    planDate: paid ? normalizeText(entry.planDate) || undefined : undefined,
    compDate: paid ? normalizeText(entry.compDate) || undefined : undefined,
    agency: paid ? normalizeText(entry.agency) || undefined : undefined,
    equipPay: undefined,
  };
}

export interface BuildDrainageEquipRegisterPersistInput {
  basicInfo: SupportDrainageEquipBasicInfoRequest;
  itemId?: string | null;
  entries: DrainageEquipDetailEntry[];
  removedDetailSeqs: readonly number[];
}

export function hasInvalidRequiredFieldsInDrainageEntries(
  entries: readonly DrainageEquipDetailEntry[],
): boolean {
  if (entries.length === 0) return true;
  for (const entry of entries) {
    if (normalizeText(entry.reqDate) === "") return true;
    const cost = parseNumericInput(entry.equipCost);
    if (cost !== undefined && cost < 0) return true;
  }
  return false;
}

export function buildSupportDrainageEquipRegisterRequestForPersist(
  input: BuildDrainageEquipRegisterPersistInput,
): SupportDrainageEquipRegisterRequest | null {
  const { basicInfo, itemId, entries, removedDetailSeqs } = input;

  const activeSeqs = new Set(
    entries
      .map((e) => e.detailSeq)
      .filter((s): s is number => s != null && s > 0),
  );

  const details: SupportDrainageEquipDetailRequest[] = [];
  const uniqRemoved = Array.from(
    new Set(removedDetailSeqs.filter((n) => n > 0)),
  );
  for (const seq of uniqRemoved) {
    if (activeSeqs.has(seq)) continue;
    details.push({ rowStatus: "D", seq });
  }

  for (const e of entries) {
    const d = mapEntryToDetail(e);
    if (d) details.push(d);
  }

  if (details.length === 0) return null;

  const body: SupportDrainageEquipRegisterRequest = { basicInfo, details };
  const id = itemId?.trim();
  if (id) body.itemId = id;
  return body;
}
