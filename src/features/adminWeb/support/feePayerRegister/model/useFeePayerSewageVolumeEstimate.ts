import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  computeLineSewageQty,
  getSewageCalcModeForLine,
} from "@/features/adminWeb/support/lib/sewageVolumeCalc";
import {
  getSewageTypeOptionsForCategory,
  isOtherActCategory,
  SEWAGE_CATEGORY,
} from "@/features/adminWeb/support/lib/sewageCategoryTypeOptions";
import {
  buildSupportFeePayerRegisterRequest,
  sumLineWaterVol,
} from "../lib/buildSupportFeePayerRegisterRequest";
import type { DetailCodeItem } from "@/entities/adminWeb/code/api/cmmCodeApi";
import { CmmCodeService } from "@/entities/adminWeb/code/api/cmmCodeApi";
import {
  getFeePayerDetail,
  postFeePayerCalculate,
  type SupportFeePayerBasicInfoRequest,
} from "@/entities/adminWeb/support/api/feePayerManageApi";
import { ApiError } from "@/shared/lib/apiClient";

/** 층수~삭제 한 줄(통지일 블록 당 1..n행) */
export type SewageDetailLine = {
  id: string;
  floor: string;
  usage: string;
  area: string;
  dailySewage: string;
  /** WAT002 소분류 code(용도조회 `gubun2`) — 오수량 식 분기 우선 */
  buildingUseSubCode: string;
  /** 건축물(ARMBUILD) ID — 계산·저장 API `buildId` 전용 (`gubun2`와 분리) */
  armbuildBuildId?: string;
  /** 용도조회 분류 상위 라벨(예: 주거시설) — 표시·레거시 보조 */
  midCategoryLabel: string;
  /** 단독·공동(다중) 산정용 방수 */
  roomCount: string;
  /** 공동주택 산정용 세대수 */
  householdCount: string;
  /** 층수·용도 행 옆 표시용 오수량(계산 결과) */
  sewageQty: string;
  selected: boolean;
  /** ARTITEC.seq2 — 재계산 시 U 행 동기화용(서버 상세 조회로 채움) */
  calcSeq2?: number;
};

/** 오수량 발생량 산정: 상단 공통(상태~통지일·기준단가~계산) + 층수/용도 상세 `lines` */
export type SewageEstimateEntry = {
  id: string;
  status: string;
  category: string;
  type: string;
  notifyDate: string;
  unitPrice: string;
  sewageVolume: string;
  causerCharge: string;
  sewageLevyAmount: string;
  lines: SewageDetailLine[];
  /** ARTITED.SEQ — 계산 API 응답 후 갱신 */
  detailSeq?: number;
};

export interface FeePayerSewageApiBridge {
  getBasicInfoBody: () => SupportFeePayerBasicInfoRequest | null;
  feePayerItemId?: string | null;
  onFeePayerItemId?: (itemId: string) => void;
}

export interface UseFeePayerSewageVolumeEstimateOptions {
  onStatusChangeBlocked?: (message: string) => void;
}

/** `<input type="date">`용 로컬 당일 `YYYY-MM-DD` */
function getTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseBaseCostFromWat003(items: DetailCodeItem[]): number | undefined {
  const row = items[0];
  if (!row) return undefined;
  const raw = `${row.codeDc ?? ""} ${row.codeNm ?? ""}`;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : undefined;
}

function formatIntKo(n: number): string {
  return n.toLocaleString("ko-KR");
}

/** 천 단위 콤마 없이 소수 표시(오수량·오수부과량·면적 등) */
function formatDecimalPlain(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: 10,
    useGrouping: false,
  });
}

/** 허가사항변경 제외: 하위 행 `sewageQty` 합 → 상단 `sewageVolume` 반영 */
function applyLineSumToSewageVolume(en: SewageEstimateEntry): SewageEstimateEntry {
  if (en.category === SEWAGE_CATEGORY.PERMIT_CHANGE) return en;
  const sum = sumLineWaterVol(en.lines);
  const hasLineQty = en.lines.some((L) => {
    const raw = String(L.sewageQty ?? "").replace(/,/g, "").trim();
    return raw !== "" && Number.isFinite(Number(raw));
  });
  const sewageVolume =
    !hasLineQty && sum === 0 ? "" : formatDecimalPlain(sum);
  return { ...en, sewageVolume };
}

function digitsOnly(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

function formatDigitsWithComma(raw: string): string {
  const d = digitsOnly(raw);
  if (!d) return "";
  return Number(d).toLocaleString("ko-KR");
}

/** 소수 입력 가능 필드: 콤마 제거, 숫자·소수점만(점은 최대 1개) */
function sanitizeDecimalNumericInput(raw: string): string {
  const noComma = String(raw ?? "").replace(/,/g, "");
  let out = "";
  let dotSeen = false;
  for (const ch of noComma) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
    } else if (ch === "." && !dotSeen) {
      dotSeen = true;
      out += ".";
    }
  }
  return out;
}

const INTEGER_COMMA_ENTRY_FIELDS = new Set(["unitPrice", "causerCharge"]);
const DECIMAL_NO_COMMA_ENTRY_FIELDS = new Set([
  "sewageVolume",
  "sewageLevyAmount",
]);
const DECIMAL_NO_COMMA_LINE_FIELDS = new Set([
  "area",
  "roomCount",
  "householdCount",
]);

function sanitizeNumericField(name: string, value: string): string {
  if (INTEGER_COMMA_ENTRY_FIELDS.has(name)) {
    return formatDigitsWithComma(value);
  }
  if (
    DECIMAL_NO_COMMA_ENTRY_FIELDS.has(name) ||
    DECIMAL_NO_COMMA_LINE_FIELDS.has(name)
  ) {
    return sanitizeDecimalNumericInput(value);
  }
  return value;
}

function withSewageQty(line: SewageDetailLine): SewageDetailLine {
  return {
    ...line,
    sewageQty: computeLineSewageQty({
      buildingUseSubCode: line.buildingUseSubCode,
      buildingUse: line.usage,
      midCategoryLabel: line.midCategoryLabel,
      area: line.area,
      dailySewage: line.dailySewage,
      roomCount: line.roomCount,
      householdCount: line.householdCount,
      selected: line.selected,
    }),
  };
}

function firstSewageTypeForCategory(category: string): string {
  const opts = getSewageTypeOptionsForCategory(category);
  return opts[0]?.value ?? "";
}

/** 구분·유형이 옵션과 맞도록(빈 값·불일치 시 목록 첫 항목) */
function ensureEntryCategoryTypeCoherent(
  e: SewageEstimateEntry,
): SewageEstimateEntry {
  let category = (e.category || "").trim();
  if (!category || getSewageTypeOptionsForCategory(category).length === 0) {
    category = SEWAGE_CATEGORY.INDIVIDUAL;
  }
  const opts = getSewageTypeOptionsForCategory(category);
  const first = opts[0]?.value ?? "";
  const typeValid = opts.some((o) => o.value === e.type);
  const type = typeValid ? e.type : first;
  if (category === e.category && type === e.type) return e;
  return { ...e, category, type };
}

function createDetailLine(): SewageDetailLine {
  return withSewageQty({
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
  });
}

function isEntryPaid(entry: SewageEstimateEntry): boolean {
  return entry.status === "PAID";
}

function createEntry(): SewageEstimateEntry {
  const category = SEWAGE_CATEGORY.INDIVIDUAL;
  const type = firstSewageTypeForCategory(category);
  return {
    id: crypto.randomUUID(),
    status: "UNPAID",
    category,
    type,
    notifyDate: getTodayYmd(),
    unitPrice: "",
    sewageVolume: "",
    causerCharge: "",
    sewageLevyAmount: "",
    lines: [createDetailLine()],
  };
}

function normalizeDetailLine(l: SewageDetailLine): SewageDetailLine {
  const bul = (l.armbuildBuildId ?? "").trim();
  const merged: SewageDetailLine = {
    ...l,
    buildingUseSubCode: l.buildingUseSubCode ?? "",
    midCategoryLabel: l.midCategoryLabel ?? "",
    roomCount: l.roomCount ?? "",
    householdCount: l.householdCount ?? "",
    calcSeq2: l.calcSeq2,
    armbuildBuildId: bul || undefined,
  };
  const preservedQty = String(merged.sewageQty ?? "").trim();
  const recalculated = withSewageQty(merged);
  const nextQty = String(recalculated.sewageQty ?? "").trim();
  // 상세 API `waterVol` 등은 줄 단위로만 오고, 클라 산식 입력이 부족하면 `computeLineSewageQty`가 ""가 되어 값이 지워짐 → 서버에서 온 수치는 유지
  if (nextQty === "" && preservedQty !== "") {
    return { ...recalculated, sewageQty: preservedQty };
  }
  return recalculated;
}

function normalizeEntry(e: SewageEstimateEntry): SewageEstimateEntry {
  const merged: SewageEstimateEntry = {
    ...e,
    detailSeq: e.detailSeq,
    lines: e.lines.map(normalizeDetailLine),
  };
  return applyLineSumToSewageVolume(
    ensureEntryCategoryTypeCoherent(merged),
  );
}

function initialEntriesOrDefault(
  initial?: SewageEstimateEntry[],
): SewageEstimateEntry[] {
  if (initial && initial.length > 0) return initial.map(normalizeEntry);
  return [createEntry()];
}

/**
 * @param initialEntries 상세 등에서 목 데이터·API 스냅샷으로 채울 때 전달. 미전달 시 등록용 기본 1블록.
 * @param apiBridge 등록 폼에서 계산 API·기준단가 연동 시 전달.
 */
export function useFeePayerSewageVolumeEstimate(
  initialEntries?: SewageEstimateEntry[],
  apiBridge?: FeePayerSewageApiBridge | null,
  options?: UseFeePayerSewageVolumeEstimateOptions,
) {
  const [entries, setEntries] = useState<SewageEstimateEntry[]>(() =>
    initialEntriesOrDefault(initialEntries),
  );
  const [calcBusyEntryId, setCalcBusyEntryId] = useState<string | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const unitPriceRequestedRef = useRef<Set<string>>(new Set());

  /** 저장 시 `details[].rowStatus=D` 로 보낼 ARTITED.SEQ (통지일 블록 삭제) */
  const removedDetailSeqsRef = useRef<number[]>([]);
  /** 저장 시 `calculations[].rowStatus=D` — 기존 `seq`·`seq2` 필요 */
  const removedCalcsRef = useRef<Array<{ seq: number; seq2: number }>>([]);

  useEffect(() => {
    if (initialEntries === undefined) return;
    setEntries(initialEntriesOrDefault(initialEntries));
    removedDetailSeqsRef.current = [];
    removedCalcsRef.current = [];
    unitPriceRequestedRef.current.clear();
  }, [initialEntries]);

  const fetchAndApplyUnitPrice = useCallback((entryId: string, category: string) => {
    const cat = category.trim();
    if (!cat || cat === SEWAGE_CATEGORY.PERMIT_CHANGE) return;
    const requestKey = `${entryId}:${cat}`;
    if (unitPriceRequestedRef.current.has(requestKey)) return;
    unitPriceRequestedRef.current.add(requestKey);
    void (async () => {
      try {
        const rows = await CmmCodeService.getBuildingUseCodeUnitPrice(
          isOtherActCategory(cat),
        );
        const n = parseBaseCostFromWat003(rows);
        if (n == null) return;
        setEntries((prev) =>
          prev.map((row) =>
            row.id === entryId && String(row.unitPrice ?? "").trim() === ""
              ? { ...row, unitPrice: formatIntKo(n) }
              : row,
          ),
        );
      } catch {
        /* 기준단가 조회 실패 시 수동 입력 대기 */
      }
    })();
  }, []);

  useEffect(() => {
    for (const row of entries) {
      if (String(row.unitPrice ?? "").trim() !== "") continue;
      fetchAndApplyUnitPrice(row.id, row.category);
    }
  }, [entries, fetchAndApplyUnitPrice]);

  const handleAddEntry = useCallback(() => {
    setEntries((prev) => {
      if (!prev.every((e) => e.status === "PAID")) return prev;
      return [...prev, createEntry()];
    });
  }, []);

  const handleAddDetailLine = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        if (isEntryPaid(e)) return e;
        return applyLineSumToSewageVolume({
          ...e,
          lines: [...e.lines, createDetailLine()],
        });
      }),
    );
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      const victim = prev.find((e) => e.id === entryId);
      if (victim && isEntryPaid(victim)) return prev;
      const ds = victim?.detailSeq;
      if (victim != null && ds != null && ds > 0) {
        removedDetailSeqsRef.current.push(ds);
      }
      return prev.filter((e) => e.id !== entryId);
    });
  }, []);

  const handleRemoveDetailLine = useCallback(
    (entryId: string, lineId: string) => {
      setEntries((prev) => {
        const e = prev.find((x) => x.id === entryId);
        if (!e) return prev;
        if (isEntryPaid(e)) return prev;
        const line = e.lines.find((l) => l.id === lineId);
        const seq = e.detailSeq;
        const s2 = line?.calcSeq2;
        if (line != null && seq != null && seq > 0 && s2 != null && s2 > 0) {
          removedCalcsRef.current.push({ seq, seq2: s2 });
        }
        if (e.lines.length > 1) {
          return prev.map((x) =>
            x.id === entryId
              ? applyLineSumToSewageVolume({
                  ...x,
                  lines: x.lines.filter((l) => l.id !== lineId),
                })
              : x,
          );
        }
        if (e.lines[0]?.id !== lineId) return prev;
        if (prev.length > 1) {
          if (seq != null && seq > 0) {
            removedDetailSeqsRef.current.push(seq);
          }
          return prev.filter((x) => x.id !== entryId);
        }
        return prev;
      });
    },
    [],
  );

  const handleEntryFieldChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const target = e.target as HTMLInputElement;
      const { name, value, type, checked } = target;
      const entryId = target.dataset.entryId;
      if (!entryId) return;
      const lineId = target.dataset.lineId;
      const nextValue = sanitizeNumericField(name, value);

      if (lineId) {
        const host = entriesRef.current.find((en) => en.id === entryId);
        if (host && isEntryPaid(host)) return;

        if (name === "selected" && type === "checkbox") {
          setEntries((prev) =>
            prev.map((en) => {
              if (en.id !== entryId) return en;
              return applyLineSumToSewageVolume({
                ...en,
                lines: en.lines.map((L) =>
                  L.id === lineId ? withSewageQty({ ...L, selected: checked }) : L,
                ),
              });
            }),
          );
          return;
        }
        const key = name as keyof SewageDetailLine;
        if (
          key === "id" ||
          key === "sewageQty" ||
          key === "midCategoryLabel" ||
          key === "buildingUseSubCode" ||
          key === "armbuildBuildId" ||
          key === "calcSeq2"
        )
          return;
        if (key === "usage") {
          setEntries((prev) =>
            prev.map((en) => {
              if (en.id !== entryId) return en;
              return applyLineSumToSewageVolume({
                ...en,
                lines: en.lines.map((L) =>
                  L.id === lineId
                    ? withSewageQty({
                        ...L,
                        usage: value,
                        buildingUseSubCode: "",
                        armbuildBuildId: undefined,
                      })
                    : L,
                ),
              });
            }),
          );
          return;
        }
        setEntries((prev) =>
          prev.map((en) => {
            if (en.id !== entryId) return en;
            return applyLineSumToSewageVolume({
              ...en,
              lines: en.lines.map((L) =>
                L.id === lineId
                  ? withSewageQty({ ...L, [key]: nextValue })
                  : L,
              ),
            });
          }),
        );
        return;
      }

      const key = name as keyof SewageEstimateEntry;
      if (key === "id" || key === "lines") return;

      const hostEntry = entriesRef.current.find((en) => en.id === entryId);
      // 납부(PAID) 상태에서도 상태값 자체는 다시 미납으로 변경 가능해야 한다.
      if (hostEntry && isEntryPaid(hostEntry) && key !== "status") return;

      if (key === "category") {
        const nextType = firstSewageTypeForCategory(value);
        const reqPrefix = `${entryId}:`;
        Array.from(unitPriceRequestedRef.current).forEach((rk) => {
          if (rk.startsWith(reqPrefix)) {
            unitPriceRequestedRef.current.delete(rk);
          }
        });
        setEntries((prev) =>
          prev.map((row) =>
            row.id === entryId
              ? applyLineSumToSewageVolume({
                  ...row,
                  category: value,
                  type: nextType,
                  unitPrice: "",
                })
              : row,
          ),
        );
        return;
      }

      if (key === "status") {
        setEntries((prev) => {
          const targetIndex = prev.findIndex((row) => row.id === entryId);
          if (targetIndex < 0) return prev;
          const target = prev[targetIndex];
          if (!target) return prev;
          if (target.status === value) return prev;
          if (value === "UNPAID") {
            const hasNewerPaid = prev
              .slice(targetIndex + 1)
              .some((row) => row.status === "PAID");
            if (hasNewerPaid) {
              const message =
                "가장 최근 통지일 블록이 납부 상태이면 이전 블록은 미납으로 변경할 수 없습니다.";
              if (options?.onStatusChangeBlocked) {
                options.onStatusChangeBlocked(message);
              } else {
                window.alert(message);
              }
              return prev;
            }
          }
          return prev.map((row) =>
            row.id === entryId ? { ...row, status: value } : row,
          );
        });
        return;
      }

      setEntries((prev) =>
        prev.map((row) =>
          row.id === entryId ? { ...row, [key]: nextValue } : row,
        ),
      );
    },
    [options],
  );

  const handleCalculateEntry = useCallback(
    async (entryId: string) => {
      const targetEntry = entriesRef.current.find((e) => e.id === entryId);
      if (targetEntry && isEntryPaid(targetEntry)) {
        return;
      }
      if (targetEntry?.category === SEWAGE_CATEGORY.PERMIT_CHANGE) {
        return;
      }

      const bridge = apiBridge;
      if (!bridge?.getBasicInfoBody) {
        setEntries((prev) =>
          prev.map((row) => {
            if (row.id !== entryId) return row;
            const price = Number(
              String(row.unitPrice).replace(/,/g, "").trim(),
            );
            const vol = Number(
              String(row.sewageVolume).replace(/,/g, "").trim(),
            );
            if (!Number.isFinite(price) || !Number.isFinite(vol)) {
              return row;
            }
            const won = Math.round(price * vol);
            return {
              ...row,
              causerCharge: won > 0 ? formatIntKo(won) : "",
            };
          }),
        );
        return;
      }

      const basicInfo = bridge.getBasicInfoBody();
      if (!basicInfo) {
        window.alert(
          "계산을 위해 기본정보(성명·주소)를 먼저 입력해 주세요.",
        );
        return;
      }

      const snapshot = entriesRef.current;
      const body = buildSupportFeePayerRegisterRequest({
        basicInfo,
        itemId: bridge.feePayerItemId,
        entries: snapshot,
        removedDetailSeqs: removedDetailSeqsRef.current,
        removedCalcs: removedCalcsRef.current,
        calculateTargetEntryId: entryId,
      });
      if (!body) {
        window.alert("구분·유형·통지일 등 필수 항목을 확인해 주세요.");
        return;
      }

      setCalcBusyEntryId(entryId);
      try {
        const res = await postFeePayerCalculate(body);
        const wid = String(res.itemId ?? "").trim();
        if (wid && bridge.onFeePayerItemId) {
          bridge.onFeePayerItemId(wid);
        }
        const seq = res.seq != null ? Number(res.seq) : NaN;
        const wc = res.waterCost != null ? Number(res.waterCost) : NaN;
        const wv = res.waterVal != null ? Number(res.waterVal) : NaN;
        const ws = res.waterSum != null ? Number(res.waterSum) : NaN;

        const prev = entriesRef.current;
        let mergedRows = prev.map((en) => {
          if (en.id !== entryId) return en;
          const mergedRow = {
            ...en,
            detailSeq: Number.isFinite(seq) ? seq : en.detailSeq,
            causerCharge: Number.isFinite(wc)
              ? formatIntKo(Math.round(wc))
              : en.causerCharge,
            sewageLevyAmount: Number.isFinite(wv)
              ? formatDecimalPlain(wv)
              : en.sewageLevyAmount,
            sewageVolume: Number.isFinite(ws)
              ? formatDecimalPlain(ws)
              : en.sewageVolume,
          };
          return applyLineSumToSewageVolume(mergedRow);
        });

        if (wid && Number.isFinite(seq)) {
          try {
            const detail = await getFeePayerDetail(wid);
            const blocks = detail.data?.details ?? [];
            const block = blocks.find((b) => Number(b.seq) === Number(seq));
            const calcs = [...(block?.calculations ?? [])].sort(
              (a, b) => Number(a.seq2 ?? 0) - Number(b.seq2 ?? 0),
            );
            mergedRows = mergedRows.map((en) => {
              if (en.id !== entryId) return en;
              const nextLines = en.lines.map((line, i) => ({
                ...line,
                calcSeq2:
                  calcs[i]?.seq2 != null
                    ? Number(calcs[i].seq2)
                    : line.calcSeq2,
              }));
              return applyLineSumToSewageVolume({ ...en, lines: nextLines });
            });
          } catch {
            /* seq2 동기화 실패해도 금액 반영은 유지 */
          }
        }

        setEntries(mergedRows);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? String(err.message || "").trim()
            : "계산 요청 중 오류가 발생했습니다.";
        window.alert(msg || "계산 요청 중 오류가 발생했습니다.");
      } finally {
        setCalcBusyEntryId(null);
      }
    },
    [apiBridge, options],
  );

  const applyUsageFromLookup = useCallback(
    (
      entryId: string,
      lineId: string,
      picked: {
        buildingUse: string;
        dailySewage: string;
        midCategoryLabel: string;
        gubun2: string;
        armbuildBuildId?: string;
      },
    ) => {
      const midTrim = (picked.midCategoryLabel ?? "").trim();
      const g2 = (picked.gubun2 ?? "").trim();
      const bul = (picked.armbuildBuildId ?? "").trim();
      if (process.env.NODE_ENV === "development") {
        console.log("[FeePayer 오수량 산정] applyUsageFromLookup", {
          entryId,
          lineId,
          gubun2: g2,
          midCategoryLabel: midTrim,
          calcMode: getSewageCalcModeForLine({
            buildingUseSubCode: g2,
            buildingUse: picked.buildingUse,
            midCategoryLabel: midTrim,
          }),
          buildingUse: picked.buildingUse,
          dailySewage: picked.dailySewage,
        });
      }
      const cur = entriesRef.current.find((e) => e.id === entryId);
      if (cur && isEntryPaid(cur)) return;

      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          return applyLineSumToSewageVolume({
            ...e,
            lines: e.lines.map((L) => {
              if (L.id !== lineId) return L;
              const next: SewageDetailLine = {
                ...L,
                usage: picked.buildingUse,
                buildingUseSubCode: g2,
                midCategoryLabel: midTrim,
                armbuildBuildId: bul || undefined,
                ...(picked.dailySewage.trim()
                  ? { dailySewage: picked.dailySewage.trim() }
                  : {}),
              };
              return withSewageQty(next);
            }),
          });
        }),
      );
    },
    [],
  );

  return {
    entries,
    calcBusyEntryId,
    removedDetailSeqsRef,
    removedCalcsRef,
    handleAddEntry,
    handleAddDetailLine,
    handleRemoveEntry,
    handleRemoveDetailLine,
    handleEntryFieldChange,
    handleCalculateEntry,
    applyUsageFromLookup,
  };
}
